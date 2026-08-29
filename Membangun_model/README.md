# Membangun Model

Model dibuat dari dataset `hotel_bookings_preprocessing`.

File utama:
- `modelling.py`: baseline Logistic Regression dengan MLflow autolog.
- `modelling_tuning.py`: Random Forest dengan tuning dan manual logging MLflow.
- `DagsHub.txt`: link run MLflow online.

Perintah lokal:

```powershell
python modelling.py
python modelling_tuning.py
mlflow ui --backend-store-uri ./mlruns --port 5000
```

Perintah DagsHub:

```powershell
powershell -ExecutionPolicy Bypass -File .\run_dagshub_tuning.ps1
```
