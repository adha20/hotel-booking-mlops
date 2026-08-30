# Hotel Booking Cancellation API

FastAPI service untuk demo deployment dan dashboard staff hotel. API ini memakai model Random Forest hasil tuning dan mengubah input booking mentah menjadi schema 77 fitur yang dipakai model.

## Endpoint

| Endpoint | Method | Fungsi |
|---|---|---|
| `/health` | GET | Cek status service dan model |
| `/booking-schema` | GET | Field rekomendasi untuk dashboard |
| `/sample-booking` | GET | Contoh payload raw booking |
| `/predict-booking` | POST | Prediksi dari field booking mentah |
| `/batch-predict` | POST | Prediksi banyak booking mentah |
| `/predict` | POST | Kompatibilitas untuk 77 fitur processed atau `row_index` |
| `/metrics` | GET | Metrik Prometheus |

## Local Run

Jalankan dari root project:

```powershell
pip install -r apps/api/requirements.txt
python apps/api/main.py
```

Contoh request:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/predict-booking" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"booking":{"lead_time":120,"deposit_type":"No Deposit","market_segment":"Online TA","customer_type":"Transient","adr":115,"previous_cancellations":1,"total_of_special_requests":0}}'
```

## Docker

Build dari root project:

```powershell
docker build -f apps/api/Dockerfile -t adha20/hotel-booking-api:latest .
docker run --rm -p 8000:8000 adha20/hotel-booking-api:latest
```

## Railway

Untuk CD production, Railway sebaiknya memakai Docker image yang dibuild oleh workflow `.github/workflows/api-cd.yml`. Workflow tersebut menjalankan continuous training dari `Workflow-CI/MLProject`, lalu membuild image API dengan model terbaru hasil CT.

Image production:

```text
adha20/hotel-booking-api:latest
```

Deployment lama dari source GitHub tetap bisa dipakai sebagai fallback karena Dockerfile masih memiliki default model dari `Membangun_model/model_output_tuned`.

Variable yang bisa diatur:

| Variable | Fungsi |
|---|---|
| `CORS_ORIGINS` | Domain frontend, contoh `https://hotel-dashboard.vercel.app` |
| `MODEL_DIR` | Lokasi model di container, default `/app/model` |
| `SAMPLE_DATA_PATH` | Lokasi sample test CSV, default `/app/sample/test.csv` |

Railway menyediakan variable `PORT` otomatis, dan API sudah membacanya saat startup.

Secret GitHub Actions yang dibutuhkan untuk CD penuh:

| Secret | Fungsi |
|---|---|
| `DOCKERHUB_USERNAME` | Username Docker Hub |
| `DOCKERHUB_TOKEN` | Access token Docker Hub |
| `RAILWAY_TOKEN` | Token Railway untuk deploy otomatis |
| `RAILWAY_PROJECT_ID` | ID project Railway |
| `RAILWAY_SERVICE` | Nama service Railway API |
| `RAILWAY_ENVIRONMENT` | Environment Railway, default `production` |
