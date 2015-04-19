#!/usr/bin/env node

var http = require('http')
var chromecasts = require('chromecasts')
var fs = require('fs')
var rangeParser = require('range-parser')
var pump = require('pump')
var path = require('path')
var network = require('network-address')
var minimist = require('minimist')
var debug = require('debug')('idlecast')

var argv = minimist(process.argv.slice(2), {
  alias: {
    ext: 'e',
    all: 'a',
    help: 'h'
  },
  boolean: ['all']
})

if (argv.help) {
  console.log(
    'idlecast [directory] [options]\n' +
    '  --ext, -e [type]  to add this file extension\n' +
    '  --all, -a         add all file types\n' +
    '  --no-mp4          do not add mp4 files\n' +
    '  --no-mkv          do not add mkv files\n' +
    '  --no-webm         do not add webm files\n'
  )
  process.exit(0)
}

var folder = argv._[0] || process.cwd()
var exts = [].concat(argv.ext || [])

if (argv.webm !== false) exts.push('webm')
if (argv.mkv !== false) exts.push('mkv')
if (argv.mp4 !== false) exts.push('mp4')

var i = -1
var list = chromecasts()
var player
var timeout
var files = []

var wait = function () {
  timeout = setTimeout(loop, 1000)
}

var loop = function () {
  clearTimeout(timeout)
  if (!player) return wait()
  player.chromecastStatus(function (err, status) {
    debug('chromecast status', status)
    if (err) return wait()
    if (files.length && status && status.applications && status.applications.length && status.applications[0].appId === 'E8C28D3C') return play()
    wait()
  })
}

loop()

var play = function () {
  if (!player) return
  if (i < files.length - 1) i++
  else i = 0

  console.log('Playing %s', files[i])
  player.play('http://' + network() + ':' + server.address().port + '/' + encodeURI(files[i]), loop)
}

list.on('update', function (p) {
  player = p
  player.on('update', loop)
})

var check = function () {
  fs.readdir(folder, function (_, list) {
    if (list) files = list

    files = files.filter(function (name) {
      return argv.all || exts.indexOf(name.split('.').pop()) > -1
    })

    debug('updated playlist', files)
    console.log('Playlist updated (%d %s)', files.length, files.length === 1 ? 'file' : 'files')
    loop()
  })
}

fs.watch(folder, check)
check()

var server = http.createServer(function (req, res) { // TODO: use module for this
  var filename = path.join(folder, path.resolve('/', decodeURI(req.url.split('?')[0])))
  debug('serving file', filename)

  fs.stat(filename, function (err, st) {
    if (err) {
      res.statusCode = 404
      res.end()
      return
    }

    var range = req.headers.range && rangeParser(st.size, req.headers.range)[0]

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', 'video/mp4')

    if (!range) {
      res.setHeader('Content-Length', st.size)
      if (req.method === 'HEAD') return res.end()
      pump(fs.createReadStream(filename), res)
      return
    }

    res.statusCode = 206
    res.setHeader('Content-Length', range.end - range.start + 1)
    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + st.size)
    if (req.method === 'HEAD') return res.end()
    pump(fs.createReadStream(filename, range), res)
  })
})

server.listen(0)
