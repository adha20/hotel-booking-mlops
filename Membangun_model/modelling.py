"""Train the baseline hotel booking cancellation model with MLflow autolog."""

from __future__ import annotations

import argparse
from pathlib import Path

import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def load_dataset(data_dir: Path, target_column: str) -> tuple[pd.DataFrame, pd.Series]:
    """Load the preprocessed training split produced by the preprocessing step."""
    train_path = data_dir / "train.csv"
    if not train_path.exists():
        raise FileNotFoundError(f"Preprocessed train.csv was not found in {data_dir}")

    train_data = pd.read_csv(train_path)
    x_train = train_data.drop(columns=[target_column])
    y_train = train_data[target_column]
    return x_train, y_train


def build_pipeline(random_state: int) -> Pipeline:
    """Build the baseline pipeline used for the basic MLflow autolog run."""
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    C=1.0,
                    class_weight="balanced",
                    max_iter=1000,
                    random_state=random_state,
                ),
            ),
        ]
    )


def parse_args() -> argparse.Namespace:
    """Parse command-line options for local baseline training."""
    parser = argparse.ArgumentParser(description="Train baseline hotel booking model with MLflow autolog.")
    parser.add_argument("--data-dir", type=Path, default=Path("hotel_bookings_preprocessing"))
    parser.add_argument("--target-column", default="is_canceled")
    parser.add_argument("--tracking-uri", default="file:./mlruns")
    parser.add_argument("--experiment-name", default="Hotel Booking Cancellation - Baseline")
    parser.add_argument("--random-state", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    x_train, y_train = load_dataset(args.data_dir, args.target_column)

    mlflow.set_tracking_uri(args.tracking_uri)
    mlflow.set_experiment(args.experiment_name)
    mlflow.sklearn.autolog(log_models=True)

    model = build_pipeline(args.random_state)

    with mlflow.start_run(run_name="baseline_logreg_autolog") as run:
        model.fit(x_train, y_train)
        print("Baseline Logistic Regression training finished.")
        print(f"MLflow run_id: {run.info.run_id}")


if __name__ == "__main__":
    main()

