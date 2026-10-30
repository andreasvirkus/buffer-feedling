# Demo video

Target **1:55**, hard limit 2:00. Seven scenes, recorded separately and cut together. Voiceover over screen recording, with the title and end cards from `docs/video/`.

What the contest wants to see: works end to end, **Buffer OAuth**, **real API calls**, publicly available. Scenes 2, 3 and 7 are there for exactly that.

## Ready-made clips (`docs/video/`)

| File | Length | Use |
|---|---|---|
| `title.mp4` | 4 s | Open with this. Fades in and out. |
| `end.mp4` | 7 s | Close with this. Has the URL, store line, GitHub. |
| `tour-broll.mp4` | 10 s | Optional cutaway: every sprite (walk, nap, eat). |

Re-render after any copy change: `tools/sprites/.venv/bin/python tools/video/cards.py`.

## Script

Times are targets. Voiceover is ~270 words in total, about 150 words a minute.

### 1. Hook (0:00 to 0:14)

- **Screen:** title card (4 s), then the Buffer app with the pet in the corner, then a LinkedIn feed scrolling.
- **VO:** "Buffer's streak widget is a sticky note on the inside of the fridge door. Helpful, if you were already opening the fridge. I wanted something that follows me around, so meet Sproutling."

### 2. Install and connect (0:14 to 0:34)

- **Screen:** fresh Chrome profile, the toolbar icon with its **"hi" badge**, the popup welcome ("Hi, I'm Sproutling"), click **Connect Buffer**, Buffer's own consent screen (keep the scopes visible for a beat), the "Connected" page, then the sites step.
- **VO:** "Sproutling is a Chrome extension with a tiny pixel pet. You connect Buffer through its own sign-in screen. It only asks to read your account, posts and ideas, and it never posts anything for you. Then you choose the sites it may visit, or skip that for now."

### 3. Real data (0:34 to 0:52)

- **Screen:** popup with the fullness bar and its three lines (last post, what's scheduled, ideas waiting). Cut to `chrome://extensions`, Sproutling, **Inspect views: service worker**, Network tab filtered on `api.buffer.com`. Click **Refresh** in the popup and show the GraphQL request returning 200 (hold 3 s). Back to the Buffer app with the hungry pet.
- **VO:** "Every fifteen minutes it makes one call to the Buffer API: posting goals, what's been sent, what's scheduled, drafts and ideas. Those are the real requests. It turns all of that into a mood, and this week I'm behind, so Sproutling is hungry."

### 4. Feed it (0:52 to 1:12)

- **Screen:** Buffer composer, publish a post to a throwaway channel (**Share now**). Back to a Buffer tab with the pet visible, click **Refresh** in the popup. The pet **eats** for five seconds, then the mood changes from hungry to content. Popup shows the new numbers.
- **VO:** "So let's feed it. I publish a post, then ask Sproutling to check in. It spots the new post, eats, and the mood moves from hungry to content."

### 5. Visit a site and walk (1:12 to 1:34)

- **Screen:** popup, tap **LinkedIn**, the browser permission prompt (accept), open LinkedIn and the pet is there. Click it to focus it, then press WASD or an arrow key: the pixel ring appears under it and it starts walking. Walk it into the screen edge (it jogs on the spot, then turns to face the camera). Click it again for the panel.
- **VO:** "Sproutling follows me to the channels I use, one site at a time, and only when I say so. I tap LinkedIn, accept the browser's prompt, and there it is. Focus it and the arrow keys, or WASD, walk it around. If it bumps into an edge it jogs on the spot, then turns to face me."

### 6. The kind word (1:34 to 1:46)

- **Screen:** scroll the LinkedIn feed until the speech bubble appears: "Let's pause and reflect on what we've consumed." Dismiss it. Flash the **Gentle nudges** switch in the popup.
- **VO:** "And when I've been scrolling for a good while, it has a kind word. It never nags, and there's a switch to turn it off."

### 7. Close (1:46 to 1:55)

- **Screen:** quick shot of `sproutling.pet`, then `end.mp4`.
- **VO:** "It works without Buffer too. No server, read-only, open source. Post a little, pause a little. Thanks for watching."

To trim if you run long: drop the b-roll, shorten scene 2's consent screen, or cut the second half of scene 5.

## Preparing the states

### Account state for scene 4 (this decides whether the demo works)

The mood rules (`src/lib/pet/state.ts`):
- With no posting goals, fullness = posts sent in the last 7 days divided by 3, plus 0.05 per draft made today (max 0.15).
- **Hungry** needs fullness under 0.4, **no scheduled posts** (a scheduled post counts as food in the fridge and keeps it content) and some activity in the last 3 days (otherwise it is sleepy).
- **Content** is 0.4 and up, or anything scheduled. **Full** is 1.0 and up.

So stage it like this, with no goals set:
1. Make sure exactly **one** post was sent in the last 7 days, nothing scheduled. That is 0.33, hungry.
2. Open the popup before recording and check it says "1 of 3 posts" and the pet is hungry.
3. On camera, publish one more (2 of 3 is 0.67, content).

If your account has posting goals, the target is the sum of the goals, so check the popup's "x of y" instead and pick numbers that cross 0.4.

The eating animation is driven by the poll that notices the new post and lasts five seconds from that poll. Keep the tab with the pet visible and click **Refresh** in the popup right after publishing. Do not press Refresh earlier, or the poll may miss the moment.

Post somewhere harmless (the Bluesky test channel, for example). It does count as a real publish.

### Clean slate

In the extension's service worker console:

```js
await chrome.storage.local.remove(['onboarding', 'lastNudgeAt', 'petPositions', 'napping', 'nudgesEnabled'])
```

For scene 2, use a separate Chrome profile with the store build installed, so the welcome step and the "hi" badge appear naturally and nothing else is in the toolbar.

### Scene 6 timing

The first nudge needs about 3,000 pixels of scrolling (three or four screens) since the page loaded, with a 30 second pause between nudges in all tabs. Reload LinkedIn before recording. If you want to save time, scroll about 2,500 pixels first, then record the last stretch. Clear `lastNudgeAt` (above) before each take.

## Recording

- **Tools you have:** CleanShot X (cursor highlight and keystroke overlay, which shows the WASD presses nicely), Kap, Loom. Edit in iMovie. Use a pop-free screen with notifications off.
- **Settings:** 1920×1080, 30 fps, browser zoom 125% so the pet and text read on a small player, bookmarks bar hidden, no other extensions in the toolbar, light mode.
- **Record each scene as its own take**, then cut. Record the voiceover afterwards against the picture. It is easier than talking and clicking at the same time.
- **Cursor:** slow and deliberate, hold still for a beat on anything you want read (the scopes, the 200 response, the bubble).
- **Private data:** blur or crop anything personal in the Buffer app (other channels, emails). The popup shows "Connected as <name>"; that is fine, or use a demo account.

## Editing and export

1. Timeline: `title.mp4`, scenes 1 to 6 with voiceover, shot of the site, `end.mp4`.
2. Add short captions for the key beats (read-only access, real API call, mood change). The voiceover text above doubles as the subtitle source.
3. Optional light background music, kept low. Skip it if it fights the voice.
4. Export H.264 1080p, under 100 MB. Upload as **Unlisted** on YouTube, and keep the file for the submission form.

## Before you submit

- [ ] Under 2:00 including cards.
- [ ] The consent screen shows Buffer's own sign-in (OAuth).
- [ ] The network request to `api.buffer.com` is visible and 200.
- [ ] A real post changes the pet's mood on camera.
- [ ] The pet appears on another site after the browser's permission prompt.
- [ ] The end card shows `sproutling.pet` and that it is on the Chrome Web Store.
- [ ] Captions or a readable voiceover transcript.
