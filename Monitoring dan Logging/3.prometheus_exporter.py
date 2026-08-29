"""Serve the hotel booking cancellation model with Prometheus monitoring.

The application exposes prediction, health-check, sample-data, and metrics
endpoints. Prometheus scrapes /metrics, while Grafana visualizes the exported
API, model, and system metrics.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

try:
    import psutil
except ImportError:  # pragma: no cover - system metrics are optional.
    psutil = None

# Core API and prediction metrics used by Prometheus and Grafana.
REQUEST_COUNT = Counter("hotel_booking_requests_total", "Total HTTP requests.", ["endpoint", "method", "status"])
PREDICTION_COUNT = Counter("hotel_booking_predictions_total", "Prediction count by label.", ["label"])
ERROR_COUNT = Counter("hotel_booking_prediction_errors_total", "Total failed prediction requests.")
LATENCY = Histogram("hotel_booking_prediction_latency_seconds", "Prediction latency in seconds.")
PROBABILITY = Histogram("hotel_booking_cancellation_probability", "Predicted cancellation probability.")
CONFIDENCE = Histogram("hotel_booking_prediction_confidence", "Maximum class probability.")
BATCH_SIZE = Histogram("hotel_booking_batch_size", "Prediction batch size.")
INPUT_FEATURE_COUNT = Histogram("hotel_booking_input_feature_count", "Number of features received.")
MISSING_FEATURE_COUNT = Histogram("hotel_booking_missing_feature_count", "Number of missing features filled with zero.")
UNKNOWN_FEATURE_COUNT = Histogram("hotel_booking_unknown_feature_count", "Number of unknown features ignored.")

# Service health and host resource metrics.
MODEL_LOADED = Gauge("hotel_booking_model_loaded", "Whether the model is loaded.")
SYSTEM_METRICS_AVAILABLE = Gauge("hotel_booking_system_metrics_available", "Whether psutil system metrics are available.")
CPU_USAGE = Gauge("hotel_booking_cpu_usage_percent", "Current CPU usage percentage.")
RAM_USAGE = Gauge("hotel_booking_ram_usage_percent", "Current RAM usage percentage.")
DISK_USAGE = Gauge("hotel_booking_disk_usage_percent", "Current disk usage percentage.")

# Aggregated prediction metrics for dashboard summary panels.
TOTAL_PREDICTIONS = Gauge("hotel_booking_total_predictions", "Total number of predictions served.")
AVERAGE_CONFIDENCE = Gauge("hotel_booking_average_prediction_confidence_percent", "Average prediction confidence percentage.")
AVERAGE_CANCELLATION_PROBABILITY = Gauge(
    "hotel_booking_average_cancellation_probability_percent",
    "Average predicted cancellation probability percentage.",
)
CANCELLATION_RATE = Gauge("hotel_booking_cancellation_rate_percent", "Predicted cancellation rate percentage.")
LAST_PREDICTION_TIME = Gauge("hotel_booking_last_prediction_timestamp_seconds", "Unix timestamp of last prediction.")
LAST_BATCH_SIZE = Gauge("hotel_booking_last_batch_size", "Last prediction batch size.")
LAST_CANCELLATION_PROBABILITY = Gauge("hotel_booking_last_cancellation_probability", "Last cancellation probability.")

prediction_total = 0
canceled_prediction_total = 0
confidence_sum = 0.0
cancellation_probability_sum = 0.0


class BookingFeatures(BaseModel):
    """Prediction request payload.

    Use features for one manual row, rows for batch inference, or row_index to
    fetch an example from the prepared test split.
    """

    features: dict[str, float | int | bool | str] | None = Field(default=None)
    rows: list[dict[str, float | int | bool | str]] | None = Field(default=None)
    row_index: int | None = Field(default=None)


class PredictResponse(BaseModel):
    """Standard prediction response returned by the serving endpoint."""

    predictions: list[dict[str, Any]]
    model_source: str


# Keep the response model ready for environments using Pydantic v2.
PredictResponse.model_rebuild()


def project_root() -> Path:
    """Return the project root from the monitoring script location."""
    return Path(__file__).resolve().parents[1]


def update_system_metrics() -> None:
    """Refresh CPU, memory, and disk gauges when psutil is available."""
    if psutil is None:
        SYSTEM_METRICS_AVAILABLE.set(0)
        return

    SYSTEM_METRICS_AVAILABLE.set(1)
    CPU_USAGE.set(psutil.cpu_percent(interval=None))
    RAM_USAGE.set(psutil.virtual_memory().percent)
    disk_target = Path(__file__).resolve().anchor or str(project_root())
    DISK_USAGE.set(psutil.disk_usage(str(disk_target)).percent)


def update_prediction_summary(cancellation_probability: float, confidence: float, label_text: str) -> None:
    """Update cumulative counters used for dashboard summary gauges."""
    global canceled_prediction_total
    global cancellation_probability_sum
    global confidence_sum
    global prediction_total

    prediction_total += 1
    confidence_sum += confidence
    cancellation_probability_sum += cancellation_probability
    if label_text == "canceled":
        canceled_prediction_total += 1

    TOTAL_PREDICTIONS.set(prediction_total)
    AVERAGE_CONFIDENCE.set((confidence_sum / prediction_total) * 100)
    AVERAGE_CANCELLATION_PROBABILITY.set((cancellation_probability_sum / prediction_total) * 100)
    CANCELLATION_RATE.set((canceled_prediction_total / prediction_total) * 100)


def candidate_model_dirs() -> list[Path]:
    """Return model locations in priority order for local serving."""
    env_model_dir = os.getenv("MODEL_DIR")
    paths = []
    if env_model_dir:
        paths.append(Path(env_model_dir))
    root = project_root()
    paths.extend(
        [
            root / "Workflow-CI" / "MLProject" / "model_output",
            root / "Membangun_model" / "model_output_tuned",
            root / "Membangun_model" / "model_output",
        ]
    )
    return paths


def load_json(path: Path, default: Any) -> Any:
    """Load JSON metadata and use a default value when the file is missing."""
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def load_model() -> tuple[Any, list[str], dict[str, str], str]:
    """Load the trained model, feature schema, and label mapping."""
    for model_dir in candidate_model_dirs():
        model_path = model_dir / "model.joblib"
        if model_path.exists():
            feature_columns = load_json(model_dir / "feature_columns.json", [])
            label_mapping = load_json(model_dir / "label_mapping.json", {"0": "not_canceled", "1": "canceled"})
            if not feature_columns:
                data_feature_path = project_root() / "Membangun_model" / "hotel_bookings_preprocessing" / "feature_columns.json"
                feature_columns = load_json(data_feature_path, [])
            return joblib.load(model_path), list(feature_columns), label_mapping, str(model_path)
    raise FileNotFoundError("Model artifact was not found. Run Kriteria 2 or Workflow-CI first.")


def sample_data_path() -> Path:
    """Return the prepared test split used for sample inference."""
    return project_root() / "Membangun_model" / "hotel_bookings_preprocessing" / "test.csv"


model, feature_columns, label_mapping, model_source = load_model()
MODEL_LOADED.set(1)

app = FastAPI(title="Hotel Booking Cancellation Serving", version="1.0.0")


def label_name(label: int) -> str:
    """Map numeric model output to a readable class name."""
    return label_mapping.get(str(label), str(label))


def rows_from_payload(payload: BookingFeatures) -> list[dict[str, Any]]:
    """Resolve request input into one or more feature dictionaries."""
    if payload.rows:
        return payload.rows
    if payload.features:
        return [payload.features]
    if payload.row_index is not None:
        test_path = sample_data_path()
        if not test_path.exists():
            raise HTTPException(status_code=404, detail="Sample test.csv not found.")
        data = pd.read_csv(test_path)
        if payload.row_index < 0 or payload.row_index >= len(data):
            raise HTTPException(status_code=400, detail=f"row_index must be between 0 and {len(data) - 1}.")
        return [data.drop(columns=["is_canceled"], errors="ignore").iloc[payload.row_index].to_dict()]
    raise HTTPException(status_code=400, detail="Provide features, rows, or row_index.")


def frame_from_rows(rows: list[dict[str, Any]]) -> tuple[pd.DataFrame, int, int]:
    """Convert request rows into the exact feature frame expected by the model."""
    frame = pd.DataFrame(rows)
    if frame.empty:
        raise HTTPException(status_code=400, detail="No rows to predict.")
    if "is_canceled" in frame.columns:
        frame = frame.drop(columns=["is_canceled"])
    unknown_columns = [column for column in frame.columns if column not in feature_columns]
    missing_columns = [column for column in feature_columns if column not in frame.columns]
    frame = frame.drop(columns=unknown_columns, errors="ignore")
    for column in missing_columns:
        frame[column] = 0
    frame = frame[feature_columns]
    frame = frame.apply(pd.to_numeric, errors="coerce").fillna(0)
    return frame, len(missing_columns), len(unknown_columns)


@app.get("/health")
def health() -> dict[str, Any]:
    """Return service status and model metadata."""
    update_system_metrics()
    REQUEST_COUNT.labels(endpoint="/health", method="GET", status="200").inc()
    return {
        "status": "ok",
        "model_loaded": True,
        "feature_count": len(feature_columns),
        "model_source": model_source,
        "system_metrics_available": psutil is not None,
    }


@app.get("/sample")
def sample(row_index: int = 0) -> dict[str, Any]:
    """Return one prepared test row to simplify manual prediction testing."""
    REQUEST_COUNT.labels(endpoint="/sample", method="GET", status="200").inc()
    data = pd.read_csv(sample_data_path())
    if row_index < 0 or row_index >= len(data):
        raise HTTPException(status_code=400, detail=f"row_index must be between 0 and {len(data) - 1}.")
    row = data.drop(columns=["is_canceled"], errors="ignore").iloc[row_index].to_dict()
    return {"row_index": row_index, "features": row}


@app.post("/predict", response_model=PredictResponse)
def predict(payload: BookingFeatures) -> PredictResponse:
    """Run model inference and record prediction metrics."""
    start = time.perf_counter()
    status = "200"
    try:
        rows = rows_from_payload(payload)
        frame, missing_count, unknown_count = frame_from_rows(rows)
        BATCH_SIZE.observe(len(frame))
        LAST_BATCH_SIZE.set(len(frame))
        INPUT_FEATURE_COUNT.observe(len(rows[0]) if rows else 0)
        MISSING_FEATURE_COUNT.observe(missing_count)
        UNKNOWN_FEATURE_COUNT.observe(unknown_count)

        predictions = model.predict(frame)
        probabilities = model.predict_proba(frame) if hasattr(model, "predict_proba") else None
        response_rows = []
        for index, raw_label in enumerate(predictions):
            label = int(raw_label)
            cancellation_probability = float(probabilities[index][1]) if probabilities is not None else float(label)
            confidence = float(max(probabilities[index])) if probabilities is not None else 1.0
            label_text = label_name(label)
            PREDICTION_COUNT.labels(label=label_text).inc()
            PROBABILITY.observe(cancellation_probability)
            CONFIDENCE.observe(confidence)
            update_prediction_summary(cancellation_probability, confidence, label_text)
            LAST_CANCELLATION_PROBABILITY.set(cancellation_probability)
            response_rows.append(
                {
                    "label": label,
                    "label_name": label_text,
                    "cancellation_probability": cancellation_probability,
                    "confidence": confidence,
                }
            )
        LAST_PREDICTION_TIME.set(time.time())
        return PredictResponse(predictions=response_rows, model_source=model_source)
    except HTTPException as exc:
        status = str(exc.status_code)
        ERROR_COUNT.inc()
        raise
    except Exception as exc:
        status = "500"
        ERROR_COUNT.inc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        LATENCY.observe(time.perf_counter() - start)
        REQUEST_COUNT.labels(endpoint="/predict", method="POST", status=status).inc()


@app.get("/metrics")
def metrics() -> Response:
    """Expose Prometheus metrics."""
    update_system_metrics()
    REQUEST_COUNT.labels(endpoint="/metrics", method="GET", status="200").inc()
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
