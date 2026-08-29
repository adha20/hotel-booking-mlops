"""Send sample traffic to Hotel Booking Cancellation serving endpoint."""

from __future__ import annotations

import argparse
import random
import time

import requests


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send inference traffic to hotel booking serving endpoint.")
    parser.add_argument("--url", default="http://127.0.0.1:8000/predict")
    parser.add_argument("--requests", type=int, default=40)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument("--max-row", type=int, default=500)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for index in range(args.requests):
        row_index = random.randint(0, args.max_row)
        response = requests.post(args.url, json={"row_index": row_index}, timeout=20)
        print(index + 1, response.status_code, response.text[:180])
        time.sleep(args.sleep)


if __name__ == "__main__":
    main()
