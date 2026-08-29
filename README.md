# Hotel Booking Cancellation Prediction - MLOps Project

End-to-end machine learning project untuk memprediksi apakah sebuah reservasi hotel berpotensi dibatalkan. Proyek ini tidak hanya berfokus pada training model, tetapi juga mencakup preprocessing otomatis, experiment tracking, CI/CD retraining, model serving, monitoring Prometheus-Grafana, dan alerting.

## Ringkasan

| Item | Keterangan |
|---|---|
| Use case | Prediksi pembatalan booking hotel |
| Task | Binary classification |
| Target | `is_canceled` |
| Dataset | `hotel_bookings.csv` |
| Model baseline | Logistic Regression + MLflow autolog |
| Model tuning | Random Forest + manual MLflow logging |
| Best accuracy | 87.81% |
| Best weighted F1 | 87.89% |
| Tracking | MLflow local dan DagsHub |
| Deployment artifact | `model.joblib`, MLflow model, Docker image |
| Monitoring | FastAPI, Prometheus, Grafana |

## Problem Statement

Pembatalan reservasi dapat berdampak langsung pada pendapatan hotel, alokasi kamar, strategi overbooking, dan perencanaan operasional. Jika potensi pembatalan dapat diprediksi lebih awal, tim operasional dapat mengambil tindakan seperti penyesuaian inventory, promosi ulang kamar, atau prioritas follow-up pada booking berisiko tinggi.

## Objective

Tujuan proyek ini adalah membangun pipeline machine learning yang mampu:

1. Mengolah dataset booking hotel menjadi data siap latih.
2. Melatih model klasifikasi untuk memprediksi booking `canceled` atau `not_canceled`.
3. Mencatat eksperimen, parameter, metrik, model, dan artifact menggunakan MLflow.
4. Menyediakan workflow CI untuk retraining dan build Docker image.
5. Melakukan serving model melalui API dan memonitor performanya dengan Prometheus-Grafana.

## Dataset

Dataset yang digunakan adalah **Hotel Booking Demand** dari Kaggle.

Sumber dataset: [Hotel Booking Demand - Kaggle](https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand)

File lokal yang digunakan:

```text
Eksperimen_SML_Muhammad_Adha/hotel_bookings_raw/hotel_bookings.csv
```

Target prediksi:

| Label | Arti |
|---|---|
| `0` | Booking tidak dibatalkan |
| `1` | Booking dibatalkan |

Setelah cleaning, dataset berisi:

| Split | Jumlah baris |
|---|---:|
| Train | 95.368 |
| Test | 23.842 |
| Total | 119.210 |

Jumlah fitur akhir setelah preprocessing: **77 fitur**.

Kolom berikut dihapus karena berisiko menyebabkan data leakage:

- `reservation_status`
- `reservation_status_date`
- `assigned_room_type`

## Metodologi

Pipeline utama proyek:

```text
Raw dataset
-> EDA
-> Cleaning dan feature engineering
-> One-hot encoding
-> Stratified train-test split
-> Baseline modelling dengan MLflow autolog
-> Hyperparameter tuning dengan manual MLflow logging
-> Export artifact model
-> CI retraining dengan MLflow Project
-> Docker image build
-> Serving API
-> Monitoring dan alerting
```

### Preprocessing

Preprocessing dilakukan secara otomatis melalui:

```text
Eksperimen_SML_Muhammad_Adha/preprocessing/automate_Muhammad_Adha.py
```

Tahapan utama:

- Mengisi missing values pada `children`, `country`, `agent`, dan `company`.
- Menghapus booking tidak valid dengan jumlah tamu `0`.
- Mengubah bulan kedatangan menjadi angka.
- Membuat fitur turunan seperti `total_guests`, `total_stays`, `has_children`, `has_agent`, dan `has_company`.
- Mengelompokkan negara dengan frekuensi rendah ke kategori `Other`.
- Melakukan log transform untuk fitur numerik yang long-tailed.
- Melakukan one-hot encoding untuk fitur kategorikal.
- Menyimpan `train.csv`, `test.csv`, `feature_columns.json`, `label_mapping.json`, dan `dataset_info.json`.

Jalankan preprocessing:

```powershell
cd Eksperimen_SML_Muhammad_Adha/preprocessing
python automate_Muhammad_Adha.py --input ../hotel_bookings_raw/hotel_bookings.csv --output hotel_bookings_preprocessing
```

## Modelling

Folder modelling:

```text
Membangun_model/
```

File utama:

| File | Fungsi |
|---|---|
| `modelling.py` | Baseline Logistic Regression dengan `mlflow.sklearn.autolog()` |
| `modelling_tuning.py` | Random Forest tuning dengan manual MLflow logging |
| `run_dagshub_tuning.ps1` | Menjalankan tuning dan logging ke DagsHub |

Model tuning menggunakan Random Forest dengan parameter terbaik:

```json
{
  "n_estimators": 180,
  "min_samples_split": 10,
  "min_samples_leaf": 2,
  "max_features": 0.6,
  "max_depth": 18
}
```

## Hasil Eksperimen

Hasil model Random Forest tuned berdasarkan metrik yang tercatat di MLflow/DagsHub:

| Metrik | Nilai |
|---|---:|
| Accuracy | 0.8781142521600537 |
| Best CV F1 | 0.8377677549222015 |
| F1 canceled | 0.8410979877515311 |
| F1 macro | 0.871120500203157 |
| F1 weighted | 0.8788798627451803 |
| Log loss | 0.2687755650032006 |
| Precision canceled | 0.814034716342083 |
| Recall canceled | 0.8700226244343892 |
| ROC AUC | 0.9543256713584495 |

Artifact yang dicatat:

- model artifact
- confusion matrix
- classification report
- feature importance
- CV results
- best parameters
- sample predictions

Tracking online:

```text
https://dagshub.com/adha20/SMSML_Muhammad_Adha
```

## Export Model

Model hasil tuning disimpan sebagai:

```text
Membangun_model/model_output_tuned/model.joblib
```

Artifact pendukung:

```text
Membangun_model/model_output_tuned/feature_columns.json
Membangun_model/model_output_tuned/label_mapping.json
Membangun_model/model_output_tuned/best_params.json
```

Docker image:

```text
adha20/hotel-booking-cancellation:latest
```

Docker Hub:

```text
https://hub.docker.com/r/adha20/hotel-booking-cancellation
```

## CI/CD

Workflow CI berada di:

```text
Workflow-CI/.github/workflows/train.yml
```

Workflow menjalankan:

1. Setup Python.
2. Install dependency.
3. Run MLflow Project.
4. Simpan artifact training.
5. Build Docker image dari MLflow model.
6. Push image ke Docker Hub.

Repository CI:

```text
https://github.com/adha20/Workflow-CI
```

Workflow CD API tambahan berada di:

```text
.github/workflows/api-cd.yml
```

Workflow ini membangun Docker image khusus FastAPI untuk web dashboard dan dapat melakukan deploy otomatis ke Railway jika secret Railway sudah dikonfigurasi.

Docker image API:

```text
adha20/hotel-booking-api:latest
```

Secret yang dibutuhkan untuk CD Railway:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
RAILWAY_TOKEN
RAILWAY_PROJECT_ID
RAILWAY_ENVIRONMENT
RAILWAY_SERVICE
```

## Serving dan Monitoring

Serving API menggunakan FastAPI:

```text
Monitoring dan Logging/3.prometheus_exporter.py
```

Endpoint utama:

| Endpoint | Fungsi |
|---|---|
| `/health` | Cek status API dan model |
| `/predict` | Prediksi booking cancellation |
| `/metrics` | Endpoint metrik Prometheus |

Jalankan API:

```powershell
cd "Monitoring dan Logging"
python 3.prometheus_exporter.py
```

Jalankan Prometheus dan Grafana:

```powershell
docker compose up -d
```

URL lokal:

| Service | URL |
|---|---|
| API health | `http://127.0.0.1:8000/health` |
| API metrics | `http://127.0.0.1:8000/metrics` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3001` |

Dashboard Grafana bernama `muhamadadha`.

Metrik utama yang dimonitor:

- CPU usage
- RAM usage
- Disk usage
- API latency p95
- requests per second
- error rate
- total predictions
- prediction distribution
- average prediction confidence
- cancellation rate

Alert Grafana:

- Total request atau prediction lebih dari 10.000.
- API latency p95 lebih dari 500 ms.
- Error rate lebih dari 5%.

## Contoh Inference

Contoh request dengan sample row dari `test.csv`:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/predict" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"row_index": 10}'
```

Contoh response:

```json
{
  "predictions": [
    {
      "label": 1,
      "label_name": "canceled",
      "cancellation_probability": 0.82,
      "confidence": 0.82
    }
  ],
  "model_source": "model.joblib"
}
```

Generate traffic demo untuk dashboard:

```powershell
python "8.generate_dashboard_demo_traffic.py" --requests 360 --sleep 0.35 --cancelled-rate 0.35
```

## Struktur Folder

```text
SMSML_Muhammad_Adha_Hotel_Booking
├── Eksperimen_SML_Muhammad_Adha
│   ├── .github/workflows
│   ├── hotel_bookings_raw
│   │   └── hotel_bookings.csv
│   ├── preprocessing
│   │   ├── Eksperimen_Muhammad_Adha.ipynb
│   │   ├── automate_Muhammad_Adha.py
│   │   └── hotel_bookings_preprocessing
│   │       ├── train.csv
│   │       ├── test.csv
│   │       ├── dataset_info.json
│   │       ├── feature_columns.json
│   │       └── label_mapping.json
│   ├── README.md
│   └── requirements.txt
├── Membangun_model
│   ├── hotel_bookings_preprocessing
│   ├── mlruns
│   ├── modelling.py
│   ├── modelling_tuning.py
│   ├── run_dagshub_tuning.ps1
│   ├── model_output_tuned
│   │   ├── model.joblib
│   │   ├── feature_columns.json
│   │   ├── label_mapping.json
│   │   └── best_params.json
│   ├── training_artifacts
│   │   ├── best_params.json
│   │   ├── classification_report.json
│   │   ├── confusion_matrix.json
│   │   ├── cv_results.csv
│   │   ├── feature_importance.csv
│   │   └── sample_predictions.csv
│   ├── screenshoot_dashboard.jpg
│   ├── screenshoot_artifak.jpg
│   ├── DagsHub.txt
│   ├── README.md
│   └── requirements.txt
├── Workflow-CI
│   ├── .github/workflows/train.yml
│   └── MLProject
│       ├── MLProject
│       ├── conda.yaml
│       ├── modelling.py
│       ├── hotel_bookings_preprocessing
│       ├── model_output
│       ├── training_artifacts
│       ├── DockerHub.txt
│       └── run_id.txt
├── apps
│   └── api
│       ├── main.py
│       ├── Dockerfile
│       ├── requirements.txt
│       └── README.md
├── .github/workflows/api-cd.yml
├── railway.json
├── .dockerignore
├── Monitoring dan Logging
│   ├── 1.bukti_serving
│   ├── 2.prometheus.yml
│   ├── 3.prometheus_exporter.py
│   ├── 4.bukti monitoring Prometheus
│   ├── 5.bukti monitoring Grafana
│   ├── 6.bukti alerting Grafana
│   ├── 7.Inference.py
│   ├── 8.generate_dashboard_demo_traffic.py
│   ├── docker-compose.yml
│   ├── grafana
│   │   ├── dashboards
│   │   └── provisioning
│   │       ├── alerting
│   │       ├── dashboards
│   │       └── datasources
│   ├── .env.example
│   ├── README.md
│   └── requirements.txt
├── README.md
├── Eksperimen_SML_Muhammad_Adha.txt
└── Workflow-CI.txt
```

## Cara Menjalankan

Install dependency utama:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r Membangun_model/requirements.txt
```

Training baseline:

```powershell
cd Membangun_model
python modelling.py
```

Training tuning:

```powershell
python modelling_tuning.py
```

MLflow UI:

```powershell
mlflow ui --backend-store-uri ./mlruns --port 5000
```

Serving dan monitoring:

```powershell
cd "../Monitoring dan Logging"
python 3.prometheus_exporter.py
docker compose up -d
python 7.Inference.py
```

## Tech Stack

- Python
- Pandas, NumPy
- Scikit-learn
- MLflow
- DagsHub
- FastAPI
- Prometheus
- Grafana
- Docker
- GitHub Actions

## Catatan

Proyek ini dibuat sebagai studi kasus MLOps untuk menunjukkan alur machine learning yang lebih lengkap: mulai dari eksperimen data, training, experiment tracking, CI/CD, serving, monitoring, hingga alerting.
