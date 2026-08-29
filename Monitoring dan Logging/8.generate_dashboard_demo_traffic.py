"""Generate realistic, healthy traffic for the Grafana dashboard."""

from __future__ import annotations

import argparse
import random
import time
from pathlib import Path
from typing import Any

import pandas as pd
import requests


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def test_data_path() -> Path:
    return project_root() / "Membangun_model" / "hotel_bookings_preprocessing" / "test.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send realistic hotel booking prediction traffic.")
    parser.add_argument("--url", default="http://127.0.0.1:8000/predict")
    parser.add_argument("--requests", type=int, default=360)
    parser.add_argument("--sleep", type=float, default=0.35)
    parser.add_argument("--cancelled-rate", type=float, default=0.35)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def choose_indices(data: pd.DataFrame, total: int, cancelled_rate: float, seed: int) -> list[int]:
    rng = random.Random(seed)
    if "is_canceled" not in data.columns:
        return [rng.randrange(len(data)) for _ in range(total)]

    cancelled = data.index[data["is_canceled"] == 1].tolist()
    not_cancelled = data.index[data["is_canceled"] == 0].tolist()
    cancelled_count = max(1, min(total - 1, round(total * cancelled_rate)))
    not_cancelled_count = total - cancelled_count

    selected = [
        *[rng.choice(cancelled) for _ in range(cancelled_count)],
        *[rng.choice(not_cancelled) for _ in range(not_cancelled_count)],
    ]
    rng.shuffle(selected)
    return selected


def send_request(url: str, row_index: int) -> dict[str, Any] | None:
    response = requests.post(url, json={"row_index": int(row_index)}, timeout=20)
    response.raise_for_status()
    payload = response.json()
    prediction = payload["predictions"][0]
    return {
        "label_name": prediction.get("label_name"),
        "confidence": float(prediction.get("confidence", 0)),
        "cancellation_probability": float(prediction.get("cancellation_probability", 0)),
    }


def main() -> None:
    args = parse_args()
    data = pd.read_csv(test_data_path())
    indices = choose_indices(data, args.requests, args.cancelled_rate, args.seed)

    counts = {"canceled": 0, "not_canceled": 0}
    confidence_total = 0.0
    success_count = 0
    start = time.perf_counter()

    for number, row_index in enumerate(indices, start=1):
        prediction = send_request(args.url, row_index)
        if prediction:
            label = str(prediction["label_name"])
            counts[label] = counts.get(label, 0) + 1
            confidence_total += prediction["confidence"]
            success_count += 1
            average_confidence = confidence_total / success_count
            print(
                f"{number:04d}/{args.requests} row={row_index} "
                f"label={label} confidence={average_confidence:.3f}"
            )
        time.sleep(args.sleep)

    duration = time.perf_counter() - start
    print("\nDashboard demo traffic finished.")
    print(f"Total requests     : {success_count}")
    print(f"Duration           : {duration:.1f}s")
    print(f"Approx RPS         : {success_count / duration:.2f}")
    print(f"Prediction counts  : {counts}")
    print(f"Average confidence : {confidence_total / max(success_count, 1):.3f}")


if __name__ == "__main__":
    main()
