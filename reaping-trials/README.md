# THE REAPING TRIALS

An original animated story series built with code: three.js r128 web pages in a blocky Roblox-like style, rendered to vertical 1080×1920 MP4s.
Everything for the series lives in this folder.

## Status

| Step | What | State |
|---|---|---|
| 1 | Test scene copied to `reference/ep1-part1-test.html`, music copied to `audio/music/` | done |
| 2 | `characters.js`, `animations.js`, `viewer.html` (+ `common.js`, `mood.js`, `scenery.js` basics) | **waiting for your approval** |
| 3 | Trailer narration → ElevenLabs voice → `episodes/trailer.html` → audio check → `out/reaping-trials/trailer.mp4` | next |
| 4 | `episodes/ep1-part1.html` (rebuilt test scene, about 60 s) | later |
| 5 | The other locations, one at a time | later |

Preview pictures of the cast, faces, expressions and moves are in [`previews/`](previews/).

## Files

| File | What it does |
|---|---|
| `common.js` | Shared helpers (seeded random, rounded boxes, wedges, canvas-textured blocks). Load it first. |
| `mood.js` | Lighting presets: `sunrise`, `overcast`, `capitalDay`, `arenaDay`, `arenaNight`, `storm`, `councilDark`, `studio`. Sky shader and sun glow come from the test scene. |
| `characters.js` | One function per character: `RT.characters.rhea()`, `pip()`, `juno()`, `dax()`, `haskin()`, `vire()`, `guard()`, `citizen(seed)`, `tribute(sector, seed)`, `crowd({...})`. Colors are in each character's `COL` block. |
| `animations.js` | Moves: idle, walk, run, jump, talk, look, point, raiseHand, kneel, wave, hug, fallOver, crossArms, facepalm, handsOnHips, cheer. Also a timeline helper (`RT.anim.seq`) and a walking path helper (`RT.anim.path`). |
| `scenery.js` | Locations (for now only the studded baseplate; the rest come in step 5). |
| `viewer.html` | Pick a character, move, face, light and camera; drag to rotate, pinch to zoom, double-tap for the face. |
| `fonts/` | Cinzel (titles), Montserrat Black (captions) and Inter (UI), all SIL Open Font License, stored locally so phone and MP4 look the same. |
| `tools/browser.js` | Headless Chromium helper used by the render tools. It answers the cdnjs three.js URL with the identical local copy (`three@0.128.0` from npm). |
| `tools/viewer-shots.js` | Screenshots of the viewer: `npm run viewer-shots -- <folder>`. |

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
