# THE REAPING TRIALS

An original animated story series built with code: three.js r128 web pages in a blocky Roblox-like style, rendered to vertical 1080×1920 MP4s.
Everything for the series lives in this folder.

## Status

| Step | What | State |
|---|---|---|
| 1 | Test scene copied to `reference/ep1-part1-test.html`, music copied to `audio/music/` | done |
| 2 | Characters, moves, viewer | approved |
| 3 | Teaser trailer: `episodes/trailer.html` → `out/reaping-trials/trailer.mp4` | rendered, waiting for your approval |
| 4 | `episodes/ep1-part1.html` (rebuilt test scene, about 60 s) | next |
| 5 | The other locations, one at a time | later |

Preview pictures of the cast, faces, expressions and moves are in [`previews/`](previews/).

## Videos

| Command | Output |
|---|---|
| `npm run render -- reaping-trailer` | `out/reaping-trials/trailer.mp4` (finished video), `trailer-no-voice.mp4` (music + effects, captions on), `trailer-voice.mp3` (narration only, same timing): the last two are for re-voicing in an editor |
| `npm run render -- reaping-trailer --stills` | one JPG per shot in `reaping-trials/build/trailer/stills/` (fast framing check) |
| `npm run render -- reaping-trailer --audio-only` | re-mix after you change the CUE SHEET or swap a sound file, without re-rendering the picture |
| `npm run render -- reaping-trailer --thumbs` | `out/reaping-trials/trailer-thumb-option1.png` and `-option2.png` |
| `npm run render -- reaping-trailer --cover 1` | `trailer-thumb.png` + `trailer-with-cover.mp4` (the thumbnail is the last 0.5 s) |
| `npm run narrate -- trailer` | ElevenLabs narration for the NARRATION lines (cached: unchanged lines cost nothing) |

**Edit a video** at the top of its scene file (e.g. `episodes/trailer.html`):
* `=== NARRATION ===`: time, speaker, text. `*word*` makes that caption yellow. Changing only the time costs nothing; changing text re-generates that line.
* `=== CUE SHEET ===`: time, sound, volume (1.0 = as loud as the narration; music 0.50 = 50 %), options like `align=peak`, `dur=`, `loop`, `fadeout=`.
  Music options: `from=` (where the song starts), `duck=` (music level while someone talks), `mute=a-b`.
* The SHOTS list in the script: camera positions and times.

**Voice:** ElevenLabs voice **Adam** (`reaping-trials/voice.json`), sped up 10 % after generation (`tempo`), long pauses shortened (`max_pause`).
Put your key in a local `.env` as `ELEVENLABS_API_KEY=...` (see `.env.example`; `.env` is never committed). A restricted key with only
text-to-speech permission is enough. Characters sent are logged in `credits.json` (not committed) and capped by `MAX_CHARS`.

**Audio files:** music in `audio/music/`, effects in `audio/sfx/` (see `audio/sfx/SOURCES.md`). A missing file is skipped and listed; the render still runs.
The final mix is normalized to −14 LUFS for phones.

## Brand: Blocktale Studios

| File | Use |
|---|---|
| `brand/logo.png` | full logo (gold brick + open storybook + BLOCKTALE STUDIOS), transparent, 1024 × 1024 |
| `brand/logo-profile.png` | profile picture for Facebook / YouTube (emblem on navy, safe inside a circle), 1024 × 1024 |
| `brand/watermark.png` | one-line logo used as the video watermark |
| `brand/logo.html` | the logo source (drawn in code; colors at the top) → `node reaping-trials/tools/brand.js logos` re-renders the PNGs |
| `brand/brand.json` | watermark opacity (0.4 = 40 %), size and position; `"onRender": true` adds it to every render |

Watermark any MP4 (for example a CapCut export): `node reaping-trials/tools/brand.js watermark in.mp4 out.mp4 0.4`

## Files

| File | What it does |
|---|---|
| `common.js` | Shared helpers (seeded random, rounded boxes, wedges, canvas-textured blocks). Load it first. |
| `mood.js` | Lighting presets: `sunrise`, `overcast`, `capitalDay`, `arenaDay`, `arenaNight`, `storm`, `councilDark`, `studio`. Sky shader and sun glow come from the test scene. |
| `characters.js` | One function per character: `RT.characters.rhea()`, `pip()`, `juno()`, `dax()`, `haskin()`, `vire()`, `guard()`, `citizen(seed)`, `tribute(sector, seed)`, `crowd({...})`. Colors are in each character's `COL` block. |
| `animations.js` | Moves: idle, walk, run, jump, talk, look, point, raiseHand, kneel, wave, hug, fallOver, crossArms, facepalm, handsOnHips, cheer. Also a timeline helper (`RT.anim.seq`) and a walking path helper (`RT.anim.path`). |
| `scenery.js` | Locations: studded baseplate, Sector 7 village, and quick trailer versions of the Choosing square and the Arena (full versions in step 5). |
| `camera.js` | The shot system from the test scene: eased camera moves, handheld shake, push-ins, low angles, over-the-shoulder, orbits, drone moves, dip-to-black. |
| `player.js` | The 9:16 frame, ▶ Play / ↺ Replay, render mode, word-by-word captions, speaker subtitles, title card, preview timer. |
| `voice.json` | The narrator voice (no key in it). |
| `viewer.html` | Pick a character, move, face, light and camera; drag to rotate, pinch to zoom, double-tap for the face. |
| `fonts/` | Cinzel (titles), Montserrat Black (captions) and Inter (UI), all SIL Open Font License, stored locally so phone and MP4 look the same. |
| `tools/browser.js` | Headless Chromium helper used by the render tools. It answers the cdnjs three.js URL with the identical local copy (`three@0.128.0` from npm). |
| `tools/viewer-shots.js` | Screenshots of the viewer: `npm run viewer-shots -- <folder>`. |
| `tools/render.js`, `tools/mix.js`, `tools/narrate.js`, `tools/brand.js` | Render to MP4, mix the sound, make the narration, logos + watermark (commands above). |

## Body style

The body copies the blocky Roblox body proportions in `roblox-docs/avatar/character-bodies/Correct-Head-Attachment.png`:
rounded-box head, upper and lower torso with a small waist step, upper arm + forearm + C-shaped hand, upper + lower leg + dome shoe, arms in a slight A-pose.
Faces, hair, clothes and emblems are original designs.

Sizes are in studs (`RT.STUD = 0.44` world units per stud, so a character is about the size of Rhea in the test scene).
`RT.BEND_LIMBS = true` lets elbows and knees bend a little in run, hug, kneel and cross-arms poses. Set it to `false` for fully stiff limbs.

## Setup (once)

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install      # three@0.128.0 (local copy for rendering), puppeteer, dotenv
npm run viewer-shots -- /tmp/shots         # check that rendering works
```

Puppeteer uses `CHROME_PATH`, its own Chrome, or `/opt/pw-browsers/chromium`, whichever exists.
