# Quickstart: Autoplaying, Looping GIF and Video Media

## Automated

```powershell
node --test tests/unit/media-type.test.js tests/integration/video-media.test.js tests/integration/animated-gif.test.js
npm test
npm run test:nsfw
```

## Manual

1. Start the app and log in as admin.
2. Upload an animated GIF to a character: it animates and loops in the gallery, character page and full view.
3. Upload an MP4 and a WebM: both appear muted, autoplaying and looping; the image page has controls and seeking works.
4. Upload a text file renamed `.mp4`: rejected, nothing saved.
5. Mark a video NSFW and browse with NSFW off: `/media/ID` and `/media/ID/full` return 404, including with a `Range` header.
6. Choose a video as avatar: refused.
7. Enable reduced motion in the OS or browser: videos do not autoplay and show controls.

See [contracts/media-routes.md](contracts/media-routes.md) and [data-model.md](data-model.md).
