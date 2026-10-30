# Buffer Commit submission: Sproutling

Draft for the submission form. Square brackets are for you to fill in or confirm.

- **App:** https://sproutling.pet
- **Install:** https://chromewebstore.google.com/detail/dndkfdgjaokpffieimgaoheogiohinmn
- **Code:** https://github.com/andreasvirkus/buffer-feedling
- **Demo video:** [YouTube link]
- **Privacy policy:** https://sproutling.pet/privacy

## The pitch (short form)

Sproutling is a tiny pixel pet that lives in your browser and is fed by what you post on Buffer. Post, and it perks up. Let your queue run dry and it gets hungry. Vanish for a few days and it takes a nap. It never dies.

It follows you to the sites of the channels you use, one site at a time and only when you allow it. When you have been scrolling for a good while, it has a kind word for you ("Let's pause and reflect on what we've consumed."). Buffer's streak widget lives inside Buffer, so you only see it once you have already remembered to post. Sproutling sits where the scrolling actually happens.

## What it does

- **Reads your Buffer activity** (read-only) and turns it into a mood: hungry, content, full, sleepy, or eating when a poll notices something new.
- **Lives on the Buffer app, and on the sites you choose.** LinkedIn, X, Instagram, Facebook, Threads, TikTok, YouTube, Pinterest, Bluesky and Substack, each requested through the browser's own permission prompt when you tap that site.
- **Offers gentle scroll nudges** in a speech bubble. They start chatty and ease off, and there is a switch to turn them off.
- **Can be walked around the page** with the arrow keys or WASD. If it bumps into an edge it jogs on the spot for a few steps, then turns to face you.
- **Works without Buffer.** Pick sites and keep the nudges; the streak side waits until you connect.

## How it uses the Buffer API

**OAuth.** A public app client with PKCE (S256), through Buffer's own authorize screen. Scopes are read-only: `account:read posts:read ideas:read`, plus `offline_access` so the session can refresh. Refresh tokens rotate, so refreshing is single-flight and the new token is saved before it is used.

**Real API calls.** One aliased GraphQL request to `api.buffer.com` every 15 minutes (and when you open a tab or press Refresh). One request, because the API allows about 100 per 15 minutes. It asks for:

- each channel's `service`, connection state and `postingGoal` (goal, sent count, scheduled count),
- posts sent in the last seven days (filtered on `dueAt`, because `posts` has no `sentAt` filter),
- posts created recently (drafts count as small snacks, and any new activity triggers the eating animation),
- scheduled posts (the pet stays calm when food is on the way),
- ideas created today (a cosmetic treat).

A 429 backs off using `Retry-After`. Nothing is ever written to Buffer.

**What the mood means.** Fullness is posts sent against your posting goals, or against a default of three a week with no goals, plus a small capped bonus for drafts. The rules are one pure function with unit tests.

**One thing worth telling other builders.** Buffer's token endpoint only accepts requests whose `Origin` matches a registered redirect URI, and a browser extension's origin can never match (it is not an `https` origin, and app clients only accept `https` redirects). So the extension does not call `/token` itself. The redirect URI is a small static page on `sproutling.pet` that finishes the code exchange from its own origin and hands the tokens to the extension, and a second page does the same for refresh inside a hidden offscreen document. A native app can skip all that, because requests without an `Origin` header pass the check (I tested it).

## What was built, and when

I started prototyping before the window opened, and I would rather say so than blur it:

- **Before 28 October (19 to 21 Oct, 14 commits):** the WXT scaffold, a first OAuth attempt that did not yet work against Buffer's token endpoint, the pixel-art generator and the five mood animations, polling and the pet-state rules, the popup, a first landing page and the README.
- **During the window (from 28 Oct):** the working sign-in and refresh through our own site, the pet on other sites with per-site permissions, the speech bubble and scroll nudges, dragging, the click panel and nap, walking in four directions, a pixel focus ring, the mode without Buffer, first-run onboarding, the privacy policy, the Chrome Web Store listing and its assets, the `sproutling.pet` domain and deploys, and the demo video. [Update this list as the remaining days go.]

[Confirm with the Commit organisers that the earlier prototyping is acceptable, and reword this section to match their answer.]

## How it is built

- WXT (Manifest V3), strict TypeScript, vanilla TypeScript for everything injected into pages. No framework, no backend.
- The overlay lives in a closed shadow root, never blocks the host page (the wrapper ignores pointer events), and puts itself back if a single-page app removes it.
- Pixel art is generated by a Python script, not drawn by hand, so outlines and shading stay consistent. Frames are drawn at whole-pixel scale. The sprites are bundled into the content script, so the sites it visits cannot detect the extension by probing for files.
- About 1,900 lines of TypeScript and about 700 lines of tests across 10 files (119 tests). The pet rules, token handling, site mapping, walking and the wall-bump behaviour are all tested pure functions. A build check fails the release if the manifest ever asks for permissions beyond the promised ones.
- The landing page and privacy policy are static pages on Cloudflare Pages.

## Privacy and safety

Everything stays in the browser. There is no server of ours and no analytics. Tokens live only in the extension's background worker and never reach the pages it visits. The sites it appears on are opt-in, one at a time. It never reads page content: the only thing measured is scroll distance, held in memory and thrown away.

## What I would do next

- A Safari extension and a macOS menubar app (the plan is written; the Mac app would own sign-in and refresh, since native requests do not hit the origin check).
- Reflecting Buffer's own streak, if the API ever exposes it.
- More words in the bag of kind nudges.

## Notes for the judges

- To try it without a Buffer account: install, press **Skip Buffer for now**, tap a site, and scroll.
- To try it with Buffer: connect, then press Refresh after posting. The eating animation plays for five seconds.
- [Conflict of interest note: built by a Buffer employee on their own time; confirm the wording you want here.]
