# Hydro-mon 💧

A water tracker where drinking feeds your Pokédex. Every **100 oz** you drink — cumulative,
lifetime, never reset — reveals a random Gen 1 Pokémon you don't own yet. Collect all 151.

No build step, no backend, no accounts. Open `index.html` and drink.

## The rules

- **Every 100 oz = one discovery.** Based on your lifetime total, not a daily count. A slow
  day still moves you forward; a missed day costs you nothing.
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
| **Hydrate** | Progress bar to your next discovery, quick-add buttons (+8/12/16/24/32 oz), custom amount, today vs. lifetime totals, today's log with per-entry undo |
| **Pokédex** | All 151 in a grid — caught ones in colour with a type tint, uncaught as black silhouettes marked `???`. Filter by All / Caught / Missing |
| **Stats** | All-time ounces, days tracked, average and best day, full catch history with dates and the milestone each was found at, plus export / import / reset |

Finding a Pokémon plays a Poké Ball reveal: the ball wobbles, bursts, and the Pokémon appears.

## Running it

It's a static site — no dependencies, no build.

```sh
# any static server works; opening index.html directly does too
npx http-server -p 8080
```

## Hosting

Works as-is on any static host.

- **GitHub Pages** — Settings → Pages → Deploy from branch, pick the branch and `/ (root)`.
- **Vercel / Netlify / Cloudflare Pages** — point at the repo, no build command, output
  directory `.`.

## Data & storage

Everything lives in `localStorage` under the key `hydromon.v1`, in this browser only.
Nothing is sent anywhere. Clearing site data wipes your Pokédex, so use **Stats → Export JSON**
for a backup and **Import JSON** to restore it or move to another device.

The saved shape:

```jsonc
{
  "version": 1,
  "lifetimeOz": 4280,
  "discoveriesGranted": 42,   // milestones paid out; kept separate from lifetimeOz so an
                              // undo can't revoke a catch or pay the same milestone twice
  "entries": [{ "id": "…", "oz": 16, "ts": 1750000000000 }],
  "caught":  [{ "dex": 25, "ts": 1750000000000, "milestone": 400 }],
  "dailyGoal": 64
}
```

## Sprites

Grid sprites for all 151 ship in `sprites/` (~600 KB total, from
[PokéAPI/sprites](https://github.com/PokeAPI/sprites)), so the Pokédex works offline and never
depends on a CDN or rate limit. The larger official artwork used in the discovery reveal is
fetched on demand and quietly falls back to the bundled pixel sprite if the network is slow
or unavailable.

## Layout

```
index.html          markup for all three tabs and the discovery modal
css/styles.css      theme, layout, Poké Ball and reveal animations
js/pokemon.js       the 151 Gen 1 names + types, sprite URL helpers
js/storage.js       persistence, derived totals, milestone and draw rules
js/app.js           UI wiring, reveal sequencing, import/export
sprites/1…151.png   bundled grid sprites
```

State rules live in `js/storage.js` and are pure functions of the saved state — that's the
place to look (or change) if you want different milestone spacing than 100 oz
(`OZ_PER_DISCOVERY`) or a different starting goal.

## Not built yet

Ideas from the original spec left for later: shiny/duplicate variants once the dex is full,
a sound effect on catch, streaks, and a shareable collection view.

---

Pokémon and Pokémon character names are trademarks of Nintendo / Creatures Inc. / GAME FREAK.
This is a personal, non-commercial fan project and isn't affiliated with or endorsed by them.
