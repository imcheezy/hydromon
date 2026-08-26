# Hydro-mon 💧

A water tracker where drinking feeds your Pokédex. Every so many ounces you drink — cumulative,
lifetime, never reset — reveals a random Gen 1 Pokémon you don't own yet. Collect all 151.

No build step, no backend, no accounts. Open `index.html` and drink.

## The rules

- **Every N oz = one discovery**, based on your lifetime total, not a daily count. A slow day
  still moves you forward; a missed day costs you nothing. N is set by the difficulty toggle
  on the Hydrate tab: Easy (48 oz), Medium (64 oz, the default), or Hard (100 oz). Switching
  difficulty only changes catches going forward — it can't retroactively revoke one, and at
  most it grants a single bonus catch on the spot if your banked progress already clears the
  new, lower bar.
- **Never a duplicate.** Each discovery draws only from the Pokémon you don't own. Once caught,
  a Pokémon leaves the draw pool for good.
- **Random, not sequential.** You're as likely to open with Mewtwo as with Bulbasaur.
- **Nothing is ever taken away.** Caught Pokémon are permanent. Undoing a mistyped entry
  lowers your lifetime total and pushes the *next* discovery further out — it never
  un-catches anything.
- **One entry can trigger several.** Log 300 oz at once and the discoveries queue up and
  reveal one after another.
- **Daily total is shown, not enforced.** The 64 oz goal on the Hydrate tab is there for
  awareness only; it has no effect on the collection mechanic.

## Screens

| Tab | What's there |
| --- | --- |
| **Hydrate** | Your latest catch up top, progress bar to your next discovery with an Easy/Medium/Hard difficulty toggle, quick-add buttons (+8/12/16/24/32 oz), custom amount, today vs. lifetime totals, today's log with per-entry undo |
| **Pokédex** | All 151 in a grid — caught ones in colour with a type tint, uncaught as black silhouettes marked `???`. Filter by All / Caught / Missing |
| **Stats** | All-time ounces, days tracked, average and best day, full catch history with dates and the milestone each was found at, plus export / import / reset |
| **Board** | Optional shared leaderboard — see "Leaderboard setup" below. Does nothing until configured |

Finding a Pokémon plays a Poké Ball reveal: the ball wobbles, bursts, and the Pokémon appears.

## Running it

It's a static site — no dependencies, no build.

```sh
# any static server works; opening index.html directly does too
npx http-server -p 8080
```

## Hosting

Works as-is on any static host.

- **GitHub Pages** — Settings → Pages → Source: **GitHub Actions**. The workflow in
  `.github/workflows/deploy-pages.yml` publishes the repo root on every push to `main`, and
  can be run by hand from the Actions tab ("Deploy to GitHub Pages" → Run workflow).
- **Vercel / Netlify / Cloudflare Pages** — point at the repo, no build command, output
  directory `.`.

## Data & storage

Everything lives in `localStorage` under the key `hydromon.v1`, in this browser only.
Nothing is sent anywhere. Clearing site data wipes your Pokédex, so use **Stats → Export JSON**
for a backup and **Import JSON** to restore it or move to another device.

The saved shape:

```jsonc
{
  "version": 2,
  "lifetimeOz": 4280,
  "catchMeterOz": 36,         // oz banked toward the next catch at the current difficulty;
                              // its own running counter, not derived from lifetimeOz, so a
                              // difficulty change only affects catches going forward
  "difficulty": "medium",     // "easy" (48oz) | "medium" (64oz) | "hard" (100oz)
  "entries": [{ "id": "…", "oz": 16, "ts": 1750000000000 }],
  "caught":  [{ "dex": 25, "ts": 1750000000000, "milestone": 4280 }],
  "dailyGoal": 64
}
```

Saves from before the difficulty toggle (`version: 1`, with a `discoveriesGranted` counter
implying a fixed 100oz/catch) are migrated automatically on load: the banked remainder carries
over into `catchMeterOz` and difficulty defaults to Medium.

## Leaderboard setup

The Board tab is a small, optional, best-effort feature for comparing progress with a friend.
It ships **unconfigured** — `js/firebase-config.js` has placeholder values, and until they're
filled in the Board tab just shows "Leaderboard isn't set up yet" and the rest of the app is
completely unaffected.

What it does: each device picks a nickname once, and after every local save (`persist()` in
`js/app.js`) pushes a small summary — nickname, lifetime oz, Pokémon caught, difficulty, and
your most recent catch — to a shared [Firebase](https://firebase.google.com/) Firestore
collection called `players`, keyed by a random ID generated on first launch. A live listener
renders everyone in that collection, sorted by lifetime oz. Your detailed water log and full
catch history never leave your device — only that small summary syncs.

To turn it on:

1. Create a free Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
   (the free Spark plan is far more than enough for a couple of people).
2. In the project, **Build → Firestore Database → Create database** (any region, start in
   production mode).
3. In Firestore's **Rules** tab, paste:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /players/{playerId} {
         allow read: true;
         allow write: if request.resource.data.keys().hasOnly(
           ['nickname','lifetimeOz','caughtCount','difficulty','lastCatch','updatedAt']
         )
         && request.resource.data.lifetimeOz is number
         && request.resource.data.lifetimeOz >= 0;
       }
     }
   }
   ```
   This validates the *shape* of what's written, not *who* wrote it — there's no login, just a
   nickname, which is the intended trust model for a couple of friends sharing a link.
4. **Project settings → General → Your apps → Add app → Web** (the `</>` icon), register it
   (no need for Firebase Hosting), and copy the `firebaseConfig` object it gives you.
5. Paste those values into `js/firebase-config.js` — every field, replacing the `"REPLACE_ME"`
   placeholders. This file is safe to commit: it's a public client identifier, not a secret;
   access is controlled by the Firestore rules above, not by hiding this file.
6. Push/deploy. Open the site, go to the Board tab, and pick a nickname — do the same on your
   friend's device and you should see each other live.

If Firebase is ever unreachable (offline, ad blocker, misconfigured), the Board tab shows a
friendly message instead of an error, and logging water / catching Pokémon keeps working
exactly as before — nothing else in the app depends on this.

## Sprites

Grid sprites for all 151 ship in `sprites/` (~600 KB total, from
[PokéAPI/sprites](https://github.com/PokeAPI/sprites)), so the Pokédex works offline and never
depends on a CDN or rate limit. The larger official artwork used in the discovery reveal is
fetched on demand and quietly falls back to the bundled pixel sprite if the network is slow
or unavailable.

## Layout

```
index.html               markup for all four tabs and the discovery modal
css/styles.css            theme, layout, Poké Ball and reveal animations
js/pokemon.js             the 151 Gen 1 names + types, sprite URL helpers
js/storage.js             persistence, derived totals, milestone and draw rules
js/app.js                 UI wiring, reveal sequencing, import/export
js/firebase-config.js     Firebase project config for the leaderboard (placeholders by default)
js/leaderboard.js         optional leaderboard: nickname, sync, live board render
sprites/1…151.png         bundled grid sprites
```

State rules live in `js/storage.js` and are pure functions of the saved state — that's the
place to look (or change) if you want different difficulty values (`THRESHOLDS`) or a
different starting daily goal.

## Not built yet

Ideas from the original spec left for later: shiny/duplicate variants once the dex is full,
a sound effect on catch, streaks, and a shareable collection view.

---

Pokémon and Pokémon character names are trademarks of Nintendo / Creatures Inc. / GAME FREAK.
This is a personal, non-commercial fan project and isn't affiliated with or endorsed by them.
