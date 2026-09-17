# Frog Jump ABC

An alphabet learning game for nursery-age kids: a sound announces a letter,
the child listens and taps the matching lily pad. Wrong pad sinks and the
frog falls in — three lives, endless rounds through the full A-Z alphabet.

## Files
- `index.html` — page structure
- `style.css` — all styling, including the custom CSS-drawn matte green frog
- `script.js` — game logic, letter picking, speech (letter sounds), sound effects, touch + fullscreen support

## Run it in VS Code
1. Open this folder in VS Code (`File > Open Folder`).
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
4. Tap **"Tap to Start"** on the opening screen — this is required so the
   browser allows sound/speech to play on tablets and smart screens.

## How the letter sound works
The game uses the browser's built-in **Speech Synthesis** (Web Speech API)
to say each letter's name out loud — no audio files needed. Voice quality
depends on the voices installed on the device; most Windows, Mac, Android,
and iOS browsers have at least one English voice built in and it works
offline once the page has loaded.

A **"🔊 Hear it again"** button lets a child replay the current letter's
sound as many times as needed.

## Touch / smart screens
Buttons use `touch-action: manipulation` for instant tap response — no
delay, works well on interactive whiteboards and tablets.

## What changed from the math version
- Numbers replaced with the full A-Z alphabet, one random letter per round
- The question is now a sound instead of on-screen text (nursery kids are
  learning to recognize letters by sound, not by reading them)
- The frog is a custom CSS-built matte green character instead of an emoji
- The lily pads are green instead of the dark "torn ice" style
- The background's moving diagonal line pattern was removed; the rising
  bubbles were kept for ambiance

## Putting it online later
Same as before — any static host works (GitHub Pages, Netlify, Vercel).
Just upload this folder; no build step or server code needed.

## Adjusting difficulty
In `script.js`, `pickLetter()` picks from the full `ALPHABET` array. To
start kids on a smaller set (e.g. just A–M), change that array at the top
of the file.
