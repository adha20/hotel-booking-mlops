"""Production-ready FastAPI service for hotel booking cancellation prediction.

The API accepts both processed model features and business-friendly booking
fields. Raw booking inputs are transformed into the 77-feature model schema
before inference, so the web dashboard does not need to expose internal
preprocessing columns to hotel staff.
"""

from __future__ import annotations

import json
import math
import os
import time
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

try:
    import psutil
except ImportError:  # pragma: no cover - system metrics are optional.
    psutil = None


MONTH_MAP = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

NUMERIC_LOG_COLUMNS = {
    "lead_time",
    "arrival_date_week_number",
    "arrival_date_day_of_month",
    "agent",
    "company",
    "days_in_waiting_list",
    "adr",
}

DEFAULT_BOOKING = {
    "hotel": "City Hotel",
    "lead_time": 45,
    "arrival_date_year": 2017,
    "arrival_date_month": "July",
    "arrival_date_week_number": 27,
    "arrival_date_day_of_month": 15,
    "stays_in_weekend_nights": 1,
    "stays_in_week_nights": 2,
    "adults": 2,
    "children": 0,
    "babies": 0,
    "meal": "BB",
    "country": "PRT",
    "market_segment": "Online TA",
    "distribution_channel": "TA/TO",
    "is_repeated_guest": 0,
    "previous_cancellations": 0,
    "previous_bookings_not_canceled": 0,
    "reserved_room_type": "A",
    "booking_changes": 0,
    "deposit_type": "No Deposit",
    "agent": 9,
    "company": 0,
    "days_in_waiting_list": 0,
    "customer_type": "Transient",
    "adr": 95.0,
    "required_car_parking_spaces": 0,
    "total_of_special_requests": 1,
}

REQUEST_COUNT = Counter("hotel_booking_requests_total", "Total HTTP requests.", ["endpoint", "method", "status"])
PREDICTION_COUNT = Counter("hotel_booking_predictions_total", "Prediction count by label.", ["label"])
ERROR_COUNT = Counter("hotel_booking_prediction_errors_total", "Total failed prediction requests.")
LATENCY = Histogram("hotel_booking_prediction_latency_seconds", "Prediction latency in seconds.")
CONFIDENCE = Histogram("hotel_booking_prediction_confidence", "Maximum class probability.")
PROBABILITY = Histogram("hotel_booking_cancellation_probability", "Predicted cancellation probability.")
BATCH_SIZE = Histogram("hotel_booking_batch_size", "Prediction batch size.")
MODEL_LOADED = Gauge("hotel_booking_model_loaded", "Whether the model is loaded.")
SYSTEM_METRICS_AVAILABLE = Gauge("hotel_booking_system_metrics_available", "Whether psutil system metrics are available.")
CPU_USAGE = Gauge("hotel_booking_cpu_usage_percent", "Current CPU usage percentage.")
RAM_USAGE = Gauge("hotel_booking_ram_usage_percent", "Current RAM usage percentage.")
DISK_USAGE = Gauge("hotel_booking_disk_usage_percent", "Current disk usage percentage.")
TOTAL_PREDICTIONS = Gauge("hotel_booking_total_predictions", "Total number of predictions served.")
AVERAGE_CONFIDENCE = Gauge("hotel_booking_average_prediction_confidence_percent", "Average prediction confidence percentage.")
CANCELLATION_RATE = Gauge("hotel_booking_cancellation_rate_percent", "Predicted cancellation rate percentage.")
LAST_PREDICTION_TIME = Gauge("hotel_booking_last_prediction_timestamp_seconds", "Unix timestamp of last prediction.")

prediction_total = 0
canceled_prediction_total = 0
confidence_sum = 0.0


class ProcessedPredictionRequest(BaseModel):
    """Prediction payload for processed features or a prepared test row."""

    features: dict[str, Any] | None = Field(default=None)
    rows: list[dict[str, Any]] | None = Field(default=None)
    row_index: int | None = Field(default=None)


class RawBookingRequest(BaseModel):
    """Business-friendly booking payload used by the dashboard."""

    booking: dict[str, Any] | None = Field(default=None)
    bookings: list[dict[str, Any]] | None = Field(default=None)


class PredictionResponse(BaseModel):
    """Standard API response for model inference."""

    predictions: list[dict[str, Any]]
    model_source: str
    feature_count: int


ProcessedPredictionRequest.model_rebuild()
RawBookingRequest.model_rebuild()
PredictionResponse.model_rebuild()


def project_root() -> Path:
    env_project_root = os.getenv("PROJECT_ROOT")
    if env_project_root:
        return Path(env_project_root)

    current_file = Path(__file__).resolve()
    if len(current_file.parents) >= 3:
        return current_file.parents[2]
    return current_file.parent


def cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "*")
    if raw_origins.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def candidate_model_dirs() -> list[Path]:
    paths = []
    env_model_dir = os.getenv("MODEL_DIR")
    if env_model_dir:
        paths.append(Path(env_model_dir))

    root = project_root()
    paths.extend(
        [
            Path(__file__).resolve().parent / "model",
            root / "Membangun_model" / "model_output_tuned",
            root / "Workflow-CI" / "MLProject" / "model_output",
            root / "Membangun_model" / "model_output",
        ]
    )
    return paths


def sample_data_path() -> Path:
    env_sample_path = os.getenv("SAMPLE_DATA_PATH")
    if env_sample_path:
        return Path(env_sample_path)
    return project_root() / "Membangun_model" / "hotel_bookings_preprocessing" / "test.csv"


def load_model() -> tuple[Any, list[str], dict[str, str], str]:
    for model_dir in candidate_model_dirs():
        model_path = model_dir / "model.joblib"
        if model_path.exists():
            feature_columns = load_json(model_dir / "feature_columns.json", [])
            label_mapping = load_json(model_dir / "label_mapping.json", {"0": "not_canceled", "1": "canceled"})
            return joblib.load(model_path), list(feature_columns), label_mapping, str(model_path)
    raise FileNotFoundError("Model artifact was not found. Set MODEL_DIR or run training first.")


def update_system_metrics() -> None:
    if psutil is None:
        SYSTEM_METRICS_AVAILABLE.set(0)
        return

    SYSTEM_METRICS_AVAILABLE.set(1)
    CPU_USAGE.set(psutil.cpu_percent(interval=None))
    RAM_USAGE.set(psutil.virtual_memory().percent)
    DISK_USAGE.set(psutil.disk_usage(str(Path.cwd().anchor or Path.cwd())).percent)


def update_prediction_summary(cancellation_probability: float, confidence: float, label_name: str) -> None:
    global canceled_prediction_total
    global confidence_sum
    global prediction_total

    prediction_total += 1
    confidence_sum += confidence
    if label_name == "canceled":
        canceled_prediction_total += 1

    TOTAL_PREDICTIONS.set(prediction_total)
    AVERAGE_CONFIDENCE.set((confidence_sum / prediction_total) * 100)
    CANCELLATION_RATE.set((canceled_prediction_total / prediction_total) * 100)
    LAST_PREDICTION_TIME.set(time.time())


def to_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number) or math.isinf(number):
        return default
    return number


def to_int(value: Any, default: int = 0) -> int:
    return int(round(to_float(value, float(default))))


def normalize_month(value: Any) -> int:
    if isinstance(value, str):
        return MONTH_MAP.get(value.strip().title(), 0)
    return to_int(value, 0)


def log_transform(column: str, value: float) -> float:
    if column not in NUMERIC_LOG_COLUMNS:
        return value
    return math.log1p(max(value, 0.0))


def category_options(prefix: str) -> list[str]:
    return sorted(column.removeprefix(prefix) for column in feature_columns if column.startswith(prefix))


def set_numeric(output: dict[str, float], column: str, value: Any) -> None:
    if column in output:
        output[column] = log_transform(column, to_float(value))


def set_category(output: dict[str, float], prefix: str, value: Any, fallback: str | None = None) -> str:
    text = str(value or "").strip()
    if prefix == "country_group_":
        text = text.upper()

    candidates = [text]
    if fallback:
        candidates.append(fallback)
    candidates.extend(["Other", "Undefined"])

    for candidate in candidates:
        column = f"{prefix}{candidate}"
        if column in output:
            output[column] = 1.0
            return candidate
    return text


def transform_raw_booking(raw_booking: dict[str, Any]) -> dict[str, float]:
    booking = {**DEFAULT_BOOKING, **raw_booking}
    output = {column: 0.0 for column in feature_columns}

    numeric_columns = [
        "adr",
        "adults",
        "agent",
        "arrival_date_day_of_month",
        "arrival_date_week_number",
        "arrival_date_year",
        "babies",
        "booking_changes",
        "children",
        "company",
        "days_in_waiting_list",
        "is_repeated_guest",
        "lead_time",
        "previous_bookings_not_canceled",
        "previous_cancellations",
        "required_car_parking_spaces",
        "stays_in_week_nights",
        "stays_in_weekend_nights",
        "total_of_special_requests",
    ]
    for column in numeric_columns:
        set_numeric(output, column, booking.get(column))

    children = to_float(booking.get("children"))
    babies = to_float(booking.get("babies"))
    adults = to_float(booking.get("adults"))
    agent = to_float(booking.get("agent"))
    company = to_float(booking.get("company"))
    weekend_nights = to_float(booking.get("stays_in_weekend_nights"))
    week_nights = to_float(booking.get("stays_in_week_nights"))

    derived_values = {
        "arrival_month_number": normalize_month(booking.get("arrival_date_month")),
        "total_guests": adults + children + babies,
        "total_stays": weekend_nights + week_nights,
        "has_children": int(children + babies > 0),
        "has_agent": int(agent > 0),
        "has_company": int(company > 0),
    }
    for column, value in derived_values.items():
        set_numeric(output, column, value)

    set_category(output, "hotel_", booking.get("hotel"), fallback="City Hotel")
    set_category(output, "meal_", booking.get("meal"), fallback="BB")
    set_category(output, "market_segment_", booking.get("market_segment"), fallback="Online TA")
    set_category(output, "distribution_channel_", booking.get("distribution_channel"), fallback="TA/TO")
    set_category(output, "reserved_room_type_", booking.get("reserved_room_type"), fallback="A")
    set_category(output, "deposit_type_", booking.get("deposit_type"), fallback="No Deposit")
    set_category(output, "customer_type_", booking.get("customer_type"), fallback="Transient")
    set_category(output, "country_group_", booking.get("country"), fallback="Other")
    return output


def frame_from_processed_rows(rows: list[dict[str, Any]]) -> pd.DataFrame:
    frame = pd.DataFrame(rows)
    if frame.empty:
        raise HTTPException(status_code=400, detail="No rows to predict.")
    frame = frame.drop(columns=["is_canceled"], errors="ignore")
    for column in feature_columns:
        if column not in frame.columns:
            frame[column] = 0
    frame = frame[feature_columns]
    return frame.apply(pd.to_numeric, errors="coerce").fillna(0)


def processed_rows_from_payload(payload: ProcessedPredictionRequest) -> list[dict[str, Any]]:
    if payload.rows:
        return payload.rows
    if payload.features:
        return [payload.features]
    if payload.row_index is not None:
        test_path = sample_data_path()
        if not test_path.exists():
            raise HTTPException(status_code=404, detail="Prepared test sample file was not found.")
        data = pd.read_csv(test_path)
        if payload.row_index < 0 or payload.row_index >= len(data):
            raise HTTPException(status_code=400, detail=f"row_index must be between 0 and {len(data) - 1}.")
        return [data.drop(columns=["is_canceled"], errors="ignore").iloc[payload.row_index].to_dict()]
    raise HTTPException(status_code=400, detail="Provide features, rows, or row_index.")


def raw_bookings_from_payload(payload: RawBookingRequest) -> list[dict[str, Any]]:
    if payload.bookings:
        return payload.bookings
    if payload.booking:
        return [payload.booking]
    raise HTTPException(status_code=400, detail="Provide booking or bookings.")


def label_name(label: int) -> str:
    return label_mapping.get(str(label), str(label))


def risk_level(cancellation_probability: float) -> str:
    if cancellation_probability >= 0.7:
        return "High"
    if cancellation_probability >= 0.4:
        return "Medium"
    return "Low"


def recommended_action(level: str) -> str:
    actions = {
        "High": "Prioritize confirmation, send a reminder, and prepare a backup inventory plan.",
        "Medium": "Monitor the booking and send a standard pre-arrival reminder.",
        "Low": "Keep the booking in the normal operational flow.",
    }
    return actions[level]


def booking_insights(raw_booking: dict[str, Any], probability: float) -> list[str]:
    insights = []
    if to_int(raw_booking.get("lead_time", DEFAULT_BOOKING["lead_time"])) >= 90:
        insights.append("Long lead time is an important model signal for this booking.")
    if to_int(raw_booking.get("previous_cancellations", 0)) > 0:
        insights.append("Guest has previous cancellation history; follow-up is recommended.")
    if str(raw_booking.get("deposit_type", "")).strip() == "Non Refund":
        insights.append("Deposit type is one of the strongest signals used by the model.")
    if to_int(raw_booking.get("total_of_special_requests", 0)) == 0:
        insights.append("No special request is recorded, which may reduce visible guest commitment.")
    if to_float(raw_booking.get("adr", DEFAULT_BOOKING["adr"])) >= 150:
        insights.append("Higher room rate can be useful context when reviewing cancellation risk.")
    if probability >= 0.7 and not insights:
        insights.append("The model detects a high-risk feature pattern across the submitted booking fields.")
    if not insights:
        insights.append("No dominant manual risk factor was detected from the submitted fields.")
    return insights[:4]


def predict_frame(frame: pd.DataFrame, raw_rows: list[dict[str, Any]] | None = None) -> PredictionResponse:
    if model is None:
        raise HTTPException(status_code=503, detail=model_load_error or "Model is not loaded.")

    BATCH_SIZE.observe(len(frame))
    predictions = model.predict(frame)
    probabilities = model.predict_proba(frame) if hasattr(model, "predict_proba") else None
    response_rows = []

    for index, raw_label in enumerate(predictions):
        label = int(raw_label)
        cancellation_probability = float(probabilities[index][1]) if probabilities is not None else float(label)
        confidence = float(max(probabilities[index])) if probabilities is not None else 1.0
        readable_label = label_name(label)
        level = risk_level(cancellation_probability)

        PREDICTION_COUNT.labels(label=readable_label).inc()
        PROBABILITY.observe(cancellation_probability)
        CONFIDENCE.observe(confidence)
        update_prediction_summary(cancellation_probability, confidence, readable_label)

        raw_booking = raw_rows[index] if raw_rows else {}
        response_rows.append(
            {
                "label": label,
                "label_name": readable_label,
                "cancellation_probability": cancellation_probability,
                "confidence": confidence,
                "risk_level": level,
                "recommended_action": recommended_action(level),
                "insights": booking_insights(raw_booking, cancellation_probability),
            }
        )

    return PredictionResponse(
        predictions=response_rows,
        model_source=model_source,
        feature_count=len(feature_columns),
    )


try:
    model, feature_columns, label_mapping, model_source = load_model()
    model_load_error = ""
    MODEL_LOADED.set(1)
except Exception as exc:  # pragma: no cover - visible through /health in deployment.
    model = None
    feature_columns = []
    label_mapping = {"0": "not_canceled", "1": "canceled"}
    model_source = ""
    model_load_error = str(exc)
    MODEL_LOADED.set(0)


app = FastAPI(
    title="Hotel Booking Cancellation API",
    version="1.0.0",
    description="Predict booking cancellation risk and expose Prometheus metrics.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def index() -> dict[str, Any]:
    return {
        "service": "hotel-booking-cancellation-api",
        "status": "ready" if model is not None else "model_not_loaded",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    update_system_metrics()
    status = "200" if model is not None else "503"
    REQUEST_COUNT.labels(endpoint="/health", method="GET", status=status).inc()
    if model is None:
        raise HTTPException(status_code=503, detail=model_load_error)
    return {
        "status": "ok",
        "model_loaded": True,
        "feature_count": len(feature_columns),
        "model_source": model_source,
        "system_metrics_available": psutil is not None,
    }


@app.get("/booking-schema")
def booking_schema() -> dict[str, Any]:
    REQUEST_COUNT.labels(endpoint="/booking-schema", method="GET", status="200").inc()
    return {
        "description": "Recommended raw fields for the staff dashboard. Missing fields use safe defaults.",
        "required_for_demo": [
            "lead_time",
            "arrival_date_month",
            "stays_in_week_nights",
            "stays_in_weekend_nights",
            "adults",
            "market_segment",
            "deposit_type",
            "customer_type",
            "adr",
            "previous_cancellations",
            "total_of_special_requests",
        ],
        "category_options": {
            "hotel": category_options("hotel_"),
            "meal": category_options("meal_"),
            "country": category_options("country_group_"),
            "market_segment": category_options("market_segment_"),
            "distribution_channel": category_options("distribution_channel_"),
            "reserved_room_type": category_options("reserved_room_type_"),
            "deposit_type": category_options("deposit_type_"),
            "customer_type": category_options("customer_type_"),
        },
        "sample_booking": DEFAULT_BOOKING,
        "risk_thresholds": {
            "low": "0.00 - 0.39",
            "medium": "0.40 - 0.69",
            "high": "0.70 - 1.00",
        },
        "internal_feature_count": len(feature_columns),
    }


@app.get("/sample")
def sample(row_index: int = 0) -> dict[str, Any]:
    REQUEST_COUNT.labels(endpoint="/sample", method="GET", status="200").inc()
    test_path = sample_data_path()
    if not test_path.exists():
        raise HTTPException(status_code=404, detail="Prepared test sample file was not found.")
    data = pd.read_csv(test_path)
    if row_index < 0 or row_index >= len(data):
        raise HTTPException(status_code=400, detail=f"row_index must be between 0 and {len(data) - 1}.")
    row = data.drop(columns=["is_canceled"], errors="ignore").iloc[row_index].to_dict()
    return {"row_index": row_index, "features": row}


@app.get("/sample-booking")
def sample_booking() -> dict[str, Any]:
    REQUEST_COUNT.labels(endpoint="/sample-booking", method="GET", status="200").inc()
    return {"booking": DEFAULT_BOOKING}


@app.post("/predict", response_model=PredictionResponse)
def predict_processed(payload: ProcessedPredictionRequest) -> PredictionResponse:
    start = time.perf_counter()
    status = "200"
    try:
        rows = processed_rows_from_payload(payload)
        frame = frame_from_processed_rows(rows)
        return predict_frame(frame)
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


@app.post("/predict-booking", response_model=PredictionResponse)
def predict_booking(payload: RawBookingRequest) -> PredictionResponse:
    start = time.perf_counter()
    status = "200"
    try:
        raw_rows = raw_bookings_from_payload(payload)
        processed_rows = [transform_raw_booking(row) for row in raw_rows]
        frame = frame_from_processed_rows(processed_rows)
        return predict_frame(frame, raw_rows=raw_rows)
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
        REQUEST_COUNT.labels(endpoint="/predict-booking", method="POST", status=status).inc()


@app.post("/batch-predict", response_model=PredictionResponse)
def batch_predict(payload: RawBookingRequest) -> PredictionResponse:
    return predict_booking(payload)


@app.get("/metrics")
def metrics() -> Response:
    update_system_metrics()
    REQUEST_COUNT.labels(endpoint="/metrics", method="GET", status="200").inc()
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
