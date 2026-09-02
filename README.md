# Hotel Booking Cancellation Risk Platform

Final project ini mengembangkan submission MLOps sebelumnya menjadi sistem demo end-to-end untuk prediksi risiko pembatalan booking hotel. README ini berfokus pada penambahan final project: production API, web booking berbasis Next.js, dashboard staff, deployment Railway/Vercel, monitoring Grafana Cloud, dan alerting.

## Ringkasan Proyek

| Area | Keterangan |
|---|---|
| Use case | Prediksi risiko pembatalan reservasi hotel |
| Task ML | Binary classification |
| Target | `is_canceled` |
| Dataset | Hotel Booking Demand |
| Model final | Random Forest tuned |
| Jumlah fitur model | 77 fitur |
| API serving | FastAPI |
| API deployment | Railway |
| Frontend | Next.js App Router |
| Frontend deployment target | Vercel |
| Monitoring | Prometheus metrics, Grafana Cloud, Grafana Alloy |
| Alerting | Grafana alert rules untuk latency, error rate, dan traffic |

## Tujuan Final Project

Proyek ini tidak berhenti di training model. Sistem dibuat agar model bisa dipakai dalam alur bisnis yang lebih realistis:

1. User memilih hotel, tanggal, jumlah tamu, kamar, dan add-ons melalui UI booking.
2. Sistem melengkapi field teknis yang tidak perlu diketahui user.
3. Frontend mengirim payload booking ke API model yang berjalan di Railway.
4. Backend mengubah payload booking menjadi schema 77 fitur model.
5. Model mengembalikan probability pembatalan, risk level, confidence, insight, dan rekomendasi.
6. Staff melihat booking terbaru, distribusi risiko, trend, faktor risiko, dan detail booking.
7. API diekspos ke Prometheus metrics, dikirim ke Grafana Cloud melalui Alloy, lalu dipakai untuk dashboard dan alerting.

## Arsitektur Sistem

```text
Customer Web UI (Next.js, Vercel-ready)
        |
        | POST /api/predict-booking
        v
Next.js API Proxy
        |
        | POST Railway API /predict-booking
        v
FastAPI Model Service (Railway)
        |
        | transform_raw_booking()
        v
77-feature model frame
        |
        v
Random Forest model.joblib
        |
        v
Prediction response
        |
        +--> Customer confirmation page
        +--> Staff dashboard and booking detail page

FastAPI /metrics
        |
        v
Grafana Alloy on Railway
        |
        v
Grafana Cloud Prometheus
        |
        v
Dashboard and alerting
```

## Fitur Utama

### Public Booking Website

Frontend customer berada di `apps/web`.

Fitur yang tersedia:

- Halaman publik hotel booking dengan hero, search filter, dan kartu hotel.
- Filter tanggal check-in, check-out, guests, rooms, dan hotel.
- Card hotel interaktif dengan hover lift effect.
- Klik hotel membuka halaman booking terpisah.
- Booking wizard 3 tahap:
  - Guest & Stay Info
  - Room & Add-ons
  - Confirmation
- Halaman sukses booking yang compact dan minimalis.
- Booking baru disimpan ke `localStorage` untuk kebutuhan demo staff dashboard.

Route frontend utama:

| Route | Fungsi |
|---|---|
| `/` | Public booking website |
| `/booking` | Customer booking wizard |
| `/staff` | Staff dashboard overview |
| `/staff/bookings/[bookingId]` | Detail booking staff |
| `/api/predict-booking` | Proxy dari Next.js ke Railway API |
| `/api/health` | Proxy health check ke Railway API |

### Staff Dashboard

Dashboard staff dibuat seperti operational dashboard, bukan landing page.

Fitur yang tersedia:

- Summary total bookings, high risk, medium risk, dan low risk.
- Filter rentang tanggal.
- Filter risk level.
- Risk distribution donut chart.
- Cancellation risk trend chart.
- Tabel bookings dengan scroll internal.
- Klik booking ID membuka halaman detail booking.
- Detail booking berisi guest information, stay information, booking information, cancellation risk, room summary, price summary, risk factors, dan action recommendations.

Data staff dashboard berasal dari:

- Seed demo bookings di `apps/web/lib/demo-store.ts`.
- Booking baru dari customer flow yang disimpan di browser `localStorage`.

Catatan: untuk demo final project, data booking belum memakai database server-side. Ini sengaja dibuat ringan agar mudah dipresentasikan dan dideploy.

## Model Machine Learning

Model berasal dari submission sebelumnya dan tetap menjadi basis final project.

| Komponen | Keterangan |
|---|---|
| Raw dataset | `Eksperimen_SML_Muhammad_Adha/hotel_bookings_raw/hotel_bookings.csv` |
| Preprocessing | `Eksperimen_SML_Muhammad_Adha/preprocessing/automate_Muhammad_Adha.py` |
| Training baseline | `Membangun_model/modelling.py` |
| Training tuning | `Membangun_model/modelling_tuning.py` |
| Model artifact | `Membangun_model/model_output_tuned/model.joblib` |
| Feature schema | `Membangun_model/model_output_tuned/feature_columns.json` |
| Label mapping | `Membangun_model/model_output_tuned/label_mapping.json` |

Dataset setelah cleaning:

| Split | Jumlah |
|---|---:|
| Train | 95.368 |
| Test | 23.842 |
| Total | 119.210 |

Hasil model Random Forest tuned:

| Metrik | Nilai |
|---|---:|
| Accuracy | 0.8781 |
| Precision canceled | 0.8140 |
| Recall canceled | 0.8700 |
| F1 canceled | 0.8411 |
| F1 macro | 0.8711 |
| F1 weighted | 0.8789 |
| ROC AUC | 0.9543 |
| Log loss | 0.2688 |

Best parameters:

```json
{
  "n_estimators": 180,
  "min_samples_split": 10,
  "min_samples_leaf": 2,
  "max_features": 0.6,
  "max_depth": 18
}
```

## Alur Input User ke 77 Fitur Model

UI customer tidak menampilkan field teknis seperti `previous_cancellations`, `agent`, `company`, atau `market_segment`. User hanya mengisi informasi yang masuk akal di dunia booking hotel. Sistem kemudian menurunkan field teknis tersebut.

### Field yang Diisi User

Field ini berasal dari booking form:

- Nama tamu
- Email
- Nomor telepon
- Check-in date
- Check-out date
- Jumlah adults
- Jumlah children
- Jumlah rooms
- Hotel yang dipilih
- Room plan
- Add-ons
- Special request
- Terms agreement

Tidak semua field ini dikirim langsung ke model. Nama, email, dan phone dipakai untuk display booking dan staff dashboard, bukan sebagai fitur ML.

### Field yang Dibuat Frontend

Frontend memakai fungsi `toApiBooking()` di:

```text
apps/web/lib/booking.ts
```

Fungsi ini mengubah form user menjadi payload booking bisnis untuk API.

Contoh field yang dibuat frontend:

| Field API | Cara sistem mengisi |
|---|---|
| `hotel` | Dari tipe hotel yang dipilih, misalnya `City Hotel` atau `Resort Hotel` |
| `lead_time` | Selisih tanggal hari ini dengan tanggal check-in |
| `arrival_date_year` | Tahun dari check-in date |
| `arrival_date_month` | Nama bulan dari check-in date |
| `arrival_date_week_number` | Nomor minggu dari check-in date |
| `arrival_date_day_of_month` | Tanggal dalam bulan dari check-in date |
| `stays_in_weekend_nights` | Jumlah malam weekend dari durasi stay |
| `stays_in_week_nights` | Jumlah malam weekday dari durasi stay |
| `adults` | Dari form user |
| `children` | Dari form user |
| `babies` | Default `0` |
| `meal` | `BB` jika breakfast aktif, selain itu `SC` |
| `country` | Dari profil user demo/database |
| `market_segment` | Dari purpose, jumlah rooms, jumlah guest, atau default hotel |
| `distribution_channel` | `Direct` jika market segment direct, selain itu `TA/TO` |
| `is_repeated_guest` | Dari history profil user |
| `previous_cancellations` | Dari history profil user |
| `previous_bookings_not_canceled` | Dari history profil user |
| `reserved_room_type` | Dari room plan yang dipilih |
| `booking_changes` | Aktif jika ada special request atau accessibility request |
| `deposit_type` | Mapping dari pilihan payment |
| `agent` | `0` untuk direct, `9` untuk TA/TO |
| `company` | `40` untuk corporate, selain itu `0` |
| `days_in_waiting_list` | `1` jika refundable deposit, selain itu `0` |
| `customer_type` | Diturunkan dari purpose, jumlah guest, children, dan rooms |
| `adr` | Harga room plan dikali jumlah room |
| `required_car_parking_spaces` | Jumlah room jika parking diperlukan |
| `total_of_special_requests` | Jumlah request/add-ons yang relevan, maksimum 5 |

### Transformasi ke 77 Fitur

Backend Railway memakai fungsi `transform_raw_booking()` di:

```text
apps/api/main.py
```

Endpoint yang memanggil fungsi ini:

```text
POST /predict-booking
```

Prosesnya:

1. Payload raw booking digabung dengan `DEFAULT_BOOKING`.
2. Sistem membuat dictionary berisi semua `feature_columns` dengan nilai awal `0.0`.
3. Fitur numerik diisi dan beberapa fitur diberi `log1p`, misalnya `lead_time`, `adr`, `agent`, `company`, dan `days_in_waiting_list`.
4. Fitur turunan dibuat:
   - `arrival_month_number`
   - `total_guests`
   - `total_stays`
   - `has_children`
   - `has_agent`
   - `has_company`
5. Fitur kategorikal diubah menjadi one-hot encoding:
   - `hotel_*`
   - `meal_*`
   - `market_segment_*`
   - `distribution_channel_*`
   - `reserved_room_type_*`
   - `deposit_type_*`
   - `customer_type_*`
   - `country_group_*`
6. DataFrame disusun ulang mengikuti `feature_columns.json`.
7. Model menjalankan `predict()` dan `predict_proba()`.

Dengan desain ini, frontend tetap manusiawi untuk user, sementara backend tetap kompatibel dengan schema model 77 fitur.

## API Serving

API production berada di:

```text
apps/api
```

Endpoint utama:

| Endpoint | Method | Fungsi |
|---|---|---|
| `/health` | GET | Mengecek status API, model, feature count, dan system metrics |
| `/booking-schema` | GET | Metadata field booking untuk integrasi |
| `/sample-booking` | GET | Contoh payload raw booking |
| `/predict-booking` | POST | Prediksi dari payload booking bisnis |
| `/batch-predict` | POST | Prediksi banyak booking bisnis |
| `/predict` | POST | Prediksi dari fitur processed atau sample `row_index` |
| `/metrics` | GET | Prometheus metrics |

Contoh payload raw booking:

```json
{
  "booking": {
    "hotel": "City Hotel",
    "lead_time": 20,
    "arrival_date_year": 2026,
    "arrival_date_month": "September",
    "arrival_date_week_number": 38,
    "arrival_date_day_of_month": 20,
    "stays_in_weekend_nights": 1,
    "stays_in_week_nights": 2,
    "adults": 2,
    "children": 0,
    "babies": 0,
    "meal": "BB",
    "country": "PRT",
    "market_segment": "Online TA",
    "distribution_channel": "TA/TO",
    "is_repeated_guest": 1,
    "previous_cancellations": 0,
    "previous_bookings_not_canceled": 5,
    "reserved_room_type": "A",
    "booking_changes": 1,
    "deposit_type": "No Deposit",
    "agent": 9,
    "company": 0,
    "days_in_waiting_list": 0,
    "customer_type": "Transient",
    "adr": 85,
    "required_car_parking_spaces": 0,
    "total_of_special_requests": 2
  }
}
```

Contoh response:

```json
{
  "predictions": [
    {
      "label": 1,
      "label_name": "canceled",
      "cancellation_probability": 0.82,
      "confidence": 0.82,
      "risk_level": "High",
      "recommended_action": "This booking needs staff follow-up before arrival.",
      "insights": ["Long lead time", "No deposit payment"]
    }
  ],
  "model_source": "/app/model/model.joblib",
  "feature_count": 77
}
```

## Monitoring dan Alerting

API FastAPI mengekspos `/metrics` untuk Prometheus. Metrics ini digunakan oleh dashboard dan alerting.

Metrik penting:

- `hotel_booking_requests_total`
- `hotel_booking_predictions_total`
- `hotel_booking_prediction_errors_total`
- `hotel_booking_prediction_latency_seconds`
- `hotel_booking_prediction_confidence`
- `hotel_booking_cancellation_probability`
- `hotel_booking_model_loaded`
- `hotel_booking_cpu_usage_percent`
- `hotel_booking_ram_usage_percent`
- `hotel_booking_disk_usage_percent`
- `hotel_booking_total_predictions`
- `hotel_booking_cancellation_rate_percent`

### Grafana Cloud via Alloy

Service Alloy berada di:

```text
apps/alloy
```

Alur monitoring public:

```text
Railway API /metrics
-> Grafana Alloy on Railway
-> Grafana Cloud remote write
-> Grafana dashboard and alerting
```

Variable Railway untuk Alloy:

| Variable | Keterangan |
|---|---|
| `HOTEL_BOOKING_METRICS_HOST` | Host API Railway, misalnya `your-railway-api-url.up.railway.app` |
| `HOTEL_BOOKING_METRICS_SCHEME` | `https` |
| `HOTEL_BOOKING_METRICS_PATH` | `/metrics` |
| `GRAFANA_CLOUD_REMOTE_WRITE_URL` | Remote write URL dari Grafana Cloud |
| `GRAFANA_CLOUD_USERNAME` | Username atau instance ID Grafana Cloud |
| `GRAFANA_CLOUD_TOKEN` | Token Grafana Cloud |

Alert yang dipakai:

- High API latency.
- High error rate.
- High request/prediction volume.

Catatan: untuk contact point email di Grafana Cloud, alamat penerima harus valid dan diizinkan oleh organisasi Grafana Cloud.

## CI/CD

### Continuous Training

Workflow retraining lama berada di:

```text
Workflow-CI/.github/workflows/train.yml
```

Workflow ini:

1. Menjalankan MLflow Project.
2. Melatih ulang Random Forest.
3. Menyimpan artifact training.
4. Menyimpan snapshot `model_output`.
5. Membangun dan push Docker image MLflow model jika Docker Hub secret tersedia.

### API Continuous Deployment

Workflow CD tambahan berada di:

```text
.github/workflows/api-cd.yml
```

Workflow ini:

1. Checkout repository.
2. Install dependency CT.
3. Menjalankan continuous training dari `Workflow-CI/MLProject`.
4. Memvalidasi artifact model.
5. Build Docker image FastAPI dengan model hasil CT terbaru.
6. Push image ke Docker Hub jika secret tersedia.
7. Menghubungkan image terbaru ke service Railway dan redeploy jika Railway secret tersedia.

Secret GitHub Actions yang dibutuhkan:

| Secret | Fungsi |
|---|---|
| `DOCKERHUB_USERNAME` | Username Docker Hub |
| `DOCKERHUB_TOKEN` | Token Docker Hub |
| `RAILWAY_TOKEN` | Token Railway |
| `RAILWAY_PROJECT_ID` | ID project Railway |
| `RAILWAY_SERVICE` | Nama service Railway API |
| `RAILWAY_ENVIRONMENT` | Environment Railway, default `production` |

## Cara Menjalankan Lokal

### 1. Jalankan API

Dari root project:

```powershell
pip install -r apps/api/requirements.txt
python apps/api/main.py
```

API lokal berjalan di:

```text
http://127.0.0.1:8000
```

Cek health:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

### 2. Jalankan Frontend

Dari folder frontend:

```powershell
cd apps/web
npm install
npm run dev
```

Default URL:

```text
http://localhost:3000
```

Jika port `3000` sudah dipakai, Next.js akan menggunakan port lain seperti `3001` atau `3002`.

### 3. Environment Frontend

Buat file:

```text
apps/web/.env.local
```

Isi minimal:

```env
HOTEL_API_BASE_URL=https://your-railway-api-url.up.railway.app
NEXT_PUBLIC_GRAFANA_DASHBOARD_URL=https://your-public-grafana-dashboard-url
```

Jika ingin memakai API lokal, ubah:

```env
HOTEL_API_BASE_URL=http://127.0.0.1:8000
```

### 4. Build Frontend

```powershell
cd apps/web
npm run build
```

## Deployment

### Deploy API ke Railway

Railway memakai konfigurasi:

```text
railway.json
apps/api/Dockerfile
```

Dockerfile API menyalin model dari:

```text
Membangun_model/model_output_tuned
```

atau dari artifact CT:

```text
Workflow-CI/MLProject/model_output
```

tergantung build argument di workflow.

Variable API yang umum:

| Variable | Fungsi |
|---|---|
| `MODEL_DIR` | Lokasi model dalam container, default `/app/model` |
| `SAMPLE_DATA_PATH` | Lokasi sample test CSV |
| `CORS_ORIGINS` | Origin frontend yang diizinkan |

### Deploy Web ke Vercel

Saat import repository ke Vercel:

```text
Framework Preset : Next.js
Root Directory   : apps/web
Build Command    : npm run build
Output Directory : .next
```

Tambahkan environment variables:

```env
HOTEL_API_BASE_URL=https://your-railway-api-url.up.railway.app
NEXT_PUBLIC_GRAFANA_DASHBOARD_URL=https://your-public-grafana-dashboard-url
```

## Struktur Repository

```text
SMSML_Muhammad_Adha_Hotel_Booking/
|-- README.md
|-- railway.json
|-- .github/
|   `-- workflows/
|       `-- api-cd.yml
|-- apps/
|   |-- api/
|   |   |-- main.py
|   |   |-- Dockerfile
|   |   |-- requirements.txt
|   |   `-- README.md
|   |-- alloy/
|   |   |-- config.alloy
|   |   |-- Dockerfile
|   |   |-- railway.json
|   |   `-- README.md
|   `-- web/
|       |-- app/
|       |   |-- page.tsx
|       |   |-- booking/
|       |   |-- staff/
|       |   `-- api/
|       |-- lib/
|       |   |-- booking.ts
|       |   `-- demo-store.ts
|       |-- package.json
|       |-- next.config.mjs
|       `-- README.md
|-- Eksperimen_SML_Muhammad_Adha/
|   |-- preprocessing/
|   |   |-- automate_Muhammad_Adha.py
|   |   `-- hotel_bookings_preprocessing/
|   |-- hotel_bookings_raw/
|   `-- README.md
|-- Membangun_model/
|   |-- modelling.py
|   |-- modelling_tuning.py
|   |-- model_output_tuned/
|   |-- training_artifacts/
|   |-- hotel_bookings_preprocessing/
|   `-- README.md
|-- Workflow-CI/
|   |-- .github/workflows/train.yml
|   `-- MLProject/
`-- Monitoring dan Logging/
    |-- 2.prometheus.yml
    |-- 3.prometheus_exporter.py
    |-- docker-compose.yml
    `-- grafana/
```

## Dokumen Pendukung

| File | Isi |
|---|---|
| `Eksperimen_SML_Muhammad_Adha/README.md` | Catatan eksperimen dan preprocessing |
| `Membangun_model/README.md` | Catatan training baseline dan tuning |
| `Workflow-CI/README.md` | Ringkasan MLflow Project untuk retraining |
| `apps/api/README.md` | Dokumentasi API FastAPI |
| `apps/web/README.md` | Dokumentasi frontend Next.js |
| `apps/alloy/README.md` | Dokumentasi Alloy untuk Grafana Cloud |
| `Monitoring dan Logging/README.md` | Dokumentasi monitoring lokal Prometheus-Grafana |

## Batasan Demo

- Staff dashboard memakai seed data dan `localStorage`, belum memakai database production.
- Profil user masih berupa data demo di frontend.
- Email booking confirmation pada UI customer masih simulasi.
- Action recommendations di staff detail masih interaktif lokal, belum terhubung ke CRM/email service.
- Payment flow belum diimplementasikan.
- Grafana Cloud alert email bergantung pada konfigurasi organisasi dan contact point Grafana.

## Verifikasi yang Sudah Dilakukan

Frontend berhasil dibuild dengan:

```powershell
cd apps/web
npm run build
```

Route Next.js yang tersedia:

```text
/
/booking
/staff
/staff/bookings/[bookingId]
/api/health
/api/predict-booking
```

API Railway yang dipakai frontend dikonfigurasi melalui:

```text
HOTEL_API_BASE_URL
```

Nilai ini wajib diset melalui environment variable, misalnya:

```text
https://your-railway-api-url.up.railway.app
```

## Ringkasan Nilai Tambah Final Project

Dibanding submission sebelumnya, final project ini menambahkan:

- Frontend booking hotel berbasis Next.js.
- Customer booking wizard yang realistis dan tidak mengekspos fitur teknis model.
- API proxy Next.js untuk menjaga URL model service tetap terpusat.
- FastAPI production endpoint `/predict-booking` yang menerima payload bisnis.
- Transformasi raw booking ke 77 fitur model di backend.
- Staff dashboard operasional dan halaman booking detail terpisah.
- Demo state booking baru melalui `localStorage`.
- CD API menuju Docker Hub dan Railway.
- Monitoring public menggunakan Grafana Alloy dan Grafana Cloud.
- Alerting untuk reliability API dan model-serving metrics.
