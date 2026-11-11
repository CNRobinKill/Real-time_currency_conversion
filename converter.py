#!/usr/bin/env python3
"""Real-time currency conversion CLI.

Uses the free ExchangeRate-API open endpoint (no API key required).

Examples:
    python converter.py 100 USD CNY
    python converter.py 49.99 EUR JPY
"""
import json
import sys
import urllib.request

API = "https://open.er-api.com/v6/latest/"


def get_rates(base: str) -> dict:
    with urllib.request.urlopen(API + base, timeout=15) as resp:
        data = json.load(resp)
    if data.get("result") != "success":
        raise RuntimeError("Provider returned an error")
    return data


def convert(amount: float, base: str, target: str) -> None:
    data = get_rates(base)
    rates = data["rates"]
    if target not in rates:
        raise SystemExit(f"Unknown currency: {target}")
    rate = rates[target]
    print(f"{amount:g} {base} = {amount * rate:,.4f} {target}")
    print(f"1 {base} = {rate} {target}")
    print(f"Rates last updated: {data['time_last_update_utc']}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    convert(float(sys.argv[1]), sys.argv[2].upper(), sys.argv[3].upper())
