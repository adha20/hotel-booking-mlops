# Grafana Alloy Collector

Service ini dipakai untuk monitoring public. Alloy melakukan scrape endpoint Prometheus dari API Railway, lalu mengirim metrics ke Grafana Cloud.

Alur:

```text
Railway API /metrics
-> Railway Alloy Collector
-> Grafana Cloud Prometheus
-> Dashboard + Alerting
```

## Railway Variables

Tambahkan variable berikut pada service Alloy di Railway:

| Variable | Value |
|---|---|
| `HOTEL_BOOKING_METRICS_HOST` | `your-railway-api-url.up.railway.app` |
| `HOTEL_BOOKING_METRICS_SCHEME` | `https` |
| `HOTEL_BOOKING_METRICS_PATH` | `/metrics` |
| `GRAFANA_CLOUD_REMOTE_WRITE_URL` | Remote write URL dari Grafana Cloud |
| `GRAFANA_CLOUD_USERNAME` | Username / instance ID dari Grafana Cloud |
| `GRAFANA_CLOUD_TOKEN` | Access policy token Grafana Cloud |

Jangan commit token Grafana Cloud ke repository. Simpan hanya sebagai Railway variable.

## Deploy ke Railway

Buat service baru di Railway dari repo GitHub yang sama.

Setting service Alloy:

| Setting | Value |
|---|---|
| Service source | `adha20/hotel-booking-mlops` |
| Root Directory | `/apps/alloy` |
| Config File Path | `/apps/alloy/railway.json` |

Service ini tidak perlu public domain, karena tugasnya hanya scrape API public dan push metrics ke Grafana Cloud.

## Query Validasi

Setelah service aktif, buka Grafana Cloud Explore dan jalankan:

```promql
hotel_booking_model_loaded
```

Jika muncul nilai `1`, Alloy sudah berhasil mengirim metrics ke Grafana Cloud.
