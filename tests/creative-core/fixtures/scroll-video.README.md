# Synthetic seek/playback fixture

This is a three-second synthetic moving test pattern, not May's content or a reference-site film. It is never copied to public artist assets.

Reproducible command (ffmpeg):

```sh
ffmpeg -f lavfi -i testsrc2=size=192x108:rate=24 -t 3 -c:v libvpx -b:v 150k -g 6 -an scroll-video.webm
```

The local browser gate serves actual bytes with HTTP range responses, then verifies decoded media time, reverse scrolling, geometry, linked navigation, loop pause/resume/offscreen behavior, reduced motion, network retry and a non-seekable-host fallback. The normal Builder upload gate also uses an actual file chooser/input and canonical operation save/reload, with an explicitly controlled upload/operation authority.
