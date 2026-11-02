# SmartStylist teaser video

`docs/video/smartstylist-teaser.mp4`: 60 s, 1080×1920 (9:16), 30 fps, H.264 + AAC, for Reels / TikTok / Shorts / WhatsApp status.

**Story: "Kavin's week".** Hook ("I have nothing to wear.") → the brand → snap your clothes → tap looks you love → Monday (one tap, swipe right) → Wednesday (shirt in the wash: swipe left, laundry) → Friday (wedding: the missing shirt, in size and budget) → "It learns you" → end card.

Everything is drawn from the real app: screens captured in demo mode, plus an original soundtrack and sound effects generated in `audio.py` (no licensed music).

## Re-render (e.g. after UI changes)

```bash
npm run build && PORT=3123 npm start   # demo mode
node marketing/teaser/capture2.cjs out/shots    # real app screens + positions → meta.json
# copy garment art used by the tiles into out/art (see ART list in teaser.html; /art/<kind>/<HEX>.svg)
python3 -c "import json;s=open('marketing/teaser/teaser.html').read();open('out/teaser.build.html','w').write(s.replace('__META__',open('out/shots/meta.json').read()))"
python3 marketing/teaser/audio.py out/audio.wav
node marketing/teaser/render.cjs $PWD/out/teaser.build.html out/frames 30 0 60
ffmpeg -framerate 30 -i out/frames/%05d.jpg -i out/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart teaser.mp4
```

Timings for every scene, caption and sound effect live in `teaser.html` (`chapters`, `pop(...)`) and `audio.py`, so they're easy to retime.
