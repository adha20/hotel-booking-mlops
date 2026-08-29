# Bukti Monitoring Prometheus

Prometheus membaca metrik dari endpoint:
`http://host.docker.internal:8000/metrics`

Contoh query untuk screenshot:
- `hotel_booking_model_loaded`
- `sum(rate(hotel_booking_requests_total[1m]))`
- `sum(rate(hotel_booking_prediction_errors_total[1m]))`
- `histogram_quantile(0.95, sum(rate(hotel_booking_prediction_latency_seconds_bucket[5m])) by (le))`
- `sum(rate(hotel_booking_predictions_total[1m])) by (label)`
- `histogram_quantile(0.95, sum(rate(hotel_booking_cancellation_probability_bucket[5m])) by (le))`
- `histogram_quantile(0.95, sum(rate(hotel_booking_prediction_confidence_bucket[5m])) by (le))`
- `hotel_booking_last_batch_size`
- `histogram_quantile(0.95, sum(rate(hotel_booking_missing_feature_count_bucket[5m])) by (le))`
- `hotel_booking_last_prediction_timestamp_seconds`
