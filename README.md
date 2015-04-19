# idlecast

Chomecast all files in a folder when your chromecast isn't doing anything else

```
npm install -g idlecast
```

## Usage

```
cd your-media-folder
idlecast # will play all mp4/webm/mkv files when your chromecast isn't doing anything
```

If you want idlecast to play another file extension in addition to mp4/webm/mkv specify it using `--ext`

```
idlecast --ext some-extension --ext some-other-extension
```

Or if you just want it to try playing ALL files in the folder

```
idlecast --all
```

## License

MIT
