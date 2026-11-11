# Real-time_currency_conversion

可编辑型多货币实时汇率同步显示 — an editable multi-currency board where all
displayed rates sync from one live fetch, plus a single-pair converter and a
CLI. 160+ world currencies, in the browser or from the command line.

## What it does

- **Editable board**: add/remove currencies, change the base currency or the
  amount, and every row re-converts in sync from the same rate snapshot
- Convert any amount between 160+ currencies (USD, CNY, EUR, JPY, GBP, …)
- Shows the live rate used and when the provider last updated it
- Auto-refreshes every 60 seconds; manual refresh button too
- Swap button, instant re-conversion on change
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
| `converter.py` | Command-line converter (Python 3, stdlib only) |

## License

MIT
