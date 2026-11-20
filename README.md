# Real-time_currency_conversion

可编辑型多货币实时汇率同步显示 — an editable multi-currency board where all
displayed rates sync from one live fetch, plus a single-pair converter and a
CLI. 160+ world currencies, in the browser or from the command line.

## What it does

- **Synced input board**: every currency row has its own input box. Type an
  amount in **any** box and every other box updates instantly at the live
  rate — the box you are typing in is never overwritten, so input never
  jitters. Clearing a box clears the rest.
- **Circular flag icons**: each row shows the currency's round flag
  (circle-flags set, **self-hosted in `flags/`** — no external CDN, so the
  icons always load, including the EU flag for EUR); non-country currencies
  (gold XAU, silver XAG, BTC, ETH…) get a circular symbol badge instead.
  No dropdowns in the rows.
- **Canvas board**: the currency list is drawn on a `<canvas>`, so gestures
  fully own the surface — the page never scrolls along with a drag
  (`touch-action: none` + scroll lock while dragging), and the red Delete
  area is drawn only during a swipe, never during a drag.
- **30-day trend chart**: tap a row's flag or currency name and a chart
  expands inline directly under that row (only one row stays expanded;
  tapping another row moves it). The chart shows the pair between the
  **benchmark currency (the first row)** and the tapped currency over
  the last 30 days — drag on it to scrub values — with 30-day change /
  high / low, and a ⇄ pill in its header flips the pair (base ⇄ quote).
  Fiat history comes from Frankfurter (ECB), BTC/ETH from CoinGecko,
  and everything else (CNH, gold, silver, exotics) from dated
  currency-api snapshots — all free, no key.
- **Benchmark currency**: the first row is the benchmark — every other
  row's rate hint reads `1 <benchmark> = …`. The benchmark row is
  pinned (it cannot be dragged away), but long-press-dragging any other
  row onto the top displaces it and makes the dropped row the new
  benchmark.
- **Logo**: a self-designed mark (`logo.svg` — circular exchange arrows
  around a gold coin on a blue→purple gradient) used as the header logo,
  favicon and touch icon (`apple-touch-icon.png`, `icon-192/512.png`).
- **Editable currency list** (max **7** at once; defaults USD, CNH, TRY,
  HKD, JPY, GBP, EUR): add currencies from a searchable flag picker
  (tap ＋ Add currency), **tap a row to edit its amount** (a real input
  overlays the row), **swipe a row left to delete it**, **long-press a
  row and drag to reorder**. Your list and its order are remembered
  (localStorage) for the next visit.
- **12 interface languages** (English by default): English, 简体中文,
  繁體中文, 日本語, 한국어, Español, Français, Deutsch, Português,
  Italiano, Русский, العربية — currency names are localized automatically
  via `Intl.DisplayNames`.
- **Apple-style dark UI**: true-black background, iOS grouped card,
  SF system font, iOS blue accent.
- 160+ currencies supported (USD, CNY, EUR, JPY, GBP, …), all converted
  from a single rate snapshot so the whole board is always consistent
- Shows each row's rate and when the provider last updated the rates
- Rates auto-refresh every 60 seconds (the amount you typed stays put);
  manual refresh button too
- No API key, no build step, no dependencies

## Data source

[ExchangeRate-API open endpoint](https://open.er-api.com/v6/latest/USD)
(`https://open.er-api.com/v6/latest/<BASE>`) — free, no key required.
The provider refreshes rates daily; the app always fetches the latest
published rates and displays the provider's update timestamp, so the
rate you see is never silently stale.

> Note: these are mid-market reference rates, suitable for information and
> everyday conversion — not dealing rates for actual FX trades.

## Web app

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## CLI

```bash
python3 converter.py 100 USD CNY
# 100 USD = 719.XXXX CNY   (exact figure depends on the live rate)
# 1 USD = 7.19XX CNY
# Rates last updated: ...
```

## Files

| File | Purpose |
|---|---|
| `index.html` / `style.css` / `app.js` | Browser converter |
| `logo.svg` / `favicon-64.png` / `apple-touch-icon.png` / `icon-*.png` | Site logo and icons |
| `converter.py` | Command-line converter (Python 3, stdlib only) |

## License

MIT
