FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV MODEL_DIR=/app/model
ENV SAMPLE_DATA_PATH=/app/sample/test.csv

WORKDIR /app

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY apps/api/main.py ./main.py
COPY Membangun_model/model_output_tuned ./model
RUN mkdir -p /app/sample
COPY Membangun_model/hotel_bookings_preprocessing/test.csv ./sample/test.csv

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
