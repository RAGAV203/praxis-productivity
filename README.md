# Praxis

A private, offline-first personal life dashboard: money, health, habits, journal, home and documents. It's built with Next.js and installs on your phone as an app (PWA). All data stays on the device in IndexedDB; nothing is uploaded.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 (service worker disabled in dev)
npm run build      # static export to out/ + generates out/sw.js (offline cache)
npm start          # serves out/ on http://localhost:3000
npm test           # unit tests (recurrence, streaks, EMI, reminders, sleep score, aisles)
npm run lint
```

**Install on a phone:** deploy `out/` to any static host with HTTPS (Vercel, Netlify, GitHub Pages, Cloudflare Pages). Then:
- **iPhone:** Safari → Share → Add to Home Screen
- **Android:** Chrome → menu → Install app

For local testing on a phone, the service worker and install prompt need HTTPS or `localhost`.

## Features

| Area | Modules |
|---|---|
| **Today** | Daily Rings (Move / Hydrate / Habits), Up Next reminders, habit quick-check, water, State of Mind check-in, spending vs budget, countdowns, journal prompt, focus, On This Day, 7-day recap. Widgets can be reordered and hidden. Focus modes: Personal, Fitness, Sleep. |
| **Money** | Transactions (calculator-style quick entry, receipts), Budgets with "safe to spend per day", Bills & Subscriptions (swipe to pay, which logs the expense and rolls the due date), Loans & EMI with an amortization schedule, Savings goals, Net worth with monthly snapshots, Split with friends, Reports with CSV export, Calculators (EMI, SIP, bill split, units) |
| **Health** | Habits (streaks, 20-week heatmap), Water, State of Mind (mood + feelings + associations), Sleep score, Workouts, Body metrics (weight/BMI, BP, sugar), Medications (dose check-off, refill alerts), Medical records vault, Breathe (guided animation), Cycle tracking (opt-in) |
| **Life** | Journal (prompts, gratitude, photos, streaks), Reminders (smart lists, repeats), Focus timer with a Live Activity banner, Goals with milestones, Quarterly life review (radar chart), Important dates, Countdowns, Reading tracker, Family profiles |
| **More** | Wallet (cards and passes with barcode photos), Documents with expiry alerts, Warranties, Vehicles (fuel, km/l, PUC, insurance), Home care schedule, Grocery (auto-sorted aisles, staples), Pantry, Recipes + weekly meal plan, Trips (itinerary, packing, budget), Notes (lines ending in `=` calculate), Time capsule letters, Year in Review |
| **Workflows** | iOS Shortcuts-style automations. 14 ready-made templates (Good Morning, Wind Down, Quick Spend, Big Spend Alert, Afternoon Water Check, Sunday Reset…) plus a visual builder with ~30 actions (log water/steps/expense/mood/journal, add reminders/notes/groceries, check habits, start focus or fasting, ask for text/number, choose from menu, confirm, stop-if conditions, wait, set variables, speak aloud, notify, share, copy, open pages or links, sounds, confetti). Triggers: tap, time of day + weekdays, app open, or when something is logged (with conditions like amount > 5000). `{{variables}}`, live runner, run history, pin to Today, run from search. |
| **New everyday tools** | Calendar (month + 45-day agenda across bills, reminders, birthdays, trips, meals, home/pet care, expiries), Steps (live pedometer, iPhone Shortcuts sync link, manual entry, goal streak), Fasting timer (16:8 etc. with stages), Medical ID (also on the lock screen), Toolkit (multiple timers, stopwatch with laps, tally counters, coin/dice/decision wheel, password generator, QR for links/Wi-Fi/UPI, text tools), Voice memos, Pets & Plants care, Wishlist (30-day rule), opt-in Weather |
| **Everywhere** | Favorites dock on Today (long-press any tile to pin), grouped and searchable hubs, hide unused modules, text size, reduced-motion support, Spotlight-style search and actions (Ctrl/Cmd+K or the 🔍 button), quick-add menu, swipe gestures, undo toasts, synthesized sounds and haptics, confetti, the animated Praxis Companion mascot, light/dark/auto theme with an accent colour, PIN lock, JSON backup/restore, demo data |

## Notes & limits

- **Backups matter:** clearing browser data erases everything. Use Settings → Backup → Export regularly; the Today screen nudges you after 14 days.
- **Notifications:** a daily digest and focus-timer alerts appear when the app is opened. True background push (with the app closed) needs a push server and isn't included.
- **Steps:** web apps can't read Apple Health or Android Health Connect. On iPhone, a Shortcuts automation (instructions are on the Steps page) opens `/health/steps/?steps=<count>` once a day. On any phone, Walk mode counts steps with the motion sensor while the app is open.
- **Workflows** with time or app-open triggers run while Praxis is open, or the next time it's opened. Workflows never trigger other workflows (loop protection).
- **Weather** is the only feature that goes online (Open-Meteo, no account or API key needed), and only after you turn it on.
- **Haptics** use the Vibration API, which works on Android only; iOS ignores it.
- `scripts/build-sw.mjs` also works around a Next 16 static-export quirk. Prefetch payloads are written as nested folders, but the client requests flat dotted filenames, so the script writes the flat copies.

## Structure

```
app/                 routes (all client pages; static export)
components/          ui kit (glass cards, sheets, swipe rows, rings), Shell (tab bar, palette, toasts, live activity, lock), CrudPage + Form engine
lib/                 db (Dexie schema), data helpers, recurrence, streaks, finance, reminders, sleep, aisles, sound, settings, backup, seed
scripts/             icon generator, service-worker generator
tests/               vitest unit tests
```
