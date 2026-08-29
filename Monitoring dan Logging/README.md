# Monitoring dan Logging

Alur lokal:

```powershell
python 3.prometheus_exporter.py
python 7.Inference.py
```

Prometheus dan Grafana:

```powershell
docker compose up -d
```

URL:
- Serving API: `http://127.0.0.1:8000/health`
- Metrics: `http://127.0.0.1:8000/metrics`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

Dashboard Grafana bernama `muhamadadha`.

## Alerting Grafana ke Gmail

Buat file `.env` dari `.env.example`, lalu isi dengan Gmail dan App Password.

```powershell
Copy-Item .env.example .env
notepad .env
```

Isi contoh:

```env
GRAFANA_SMTP_USER=alamat_gmail_kamu@gmail.com
GRAFANA_SMTP_PASSWORD=a
GRAFANA_ALERT_EMAIL=alamat_tujuan_alert@gmail.com
```

Setelah `.env` diisi, restart Grafana.

```powershell
docker compose up -d --force-recreate grafana
```

Alert yang dipakai:

- `Hotel Booking - Total Request atau Prediction Tinggi`: total request/prediction lebih dari 10.000.
- `Hotel Booking - High API Latency > 500 ms`: p95 latency lebih dari 500 ms.
- `Hotel Booking - High Error Rate > 5%`: error rate prediksi lebih dari 5%.
