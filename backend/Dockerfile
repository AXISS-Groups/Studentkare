# Canonical backend image. Build context: backend/ (e.g. docker build -f backend/Dockerfile backend).
FROM python:3.11-slim

WORKDIR /app

# tesseract-ocr + English, Hindi and Telugu data: the on-server reader for photos of
# medicine strips (services/medicine_ocr.py). Installing it does not turn the
# feature on: MEDICINE_OCR_ENABLED / Admin › Integrations stays off until the
# AI-constitution owner and the DPO sign (plan tier1-medicine-info-2026-10-22).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-tel \
    && rm -rf /var/lib/apt/lists/*

COPY config/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app/

# Set by .github/workflows/release.yml; reported by GET /api/info.
ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ENV APP_VERSION=$APP_VERSION
ENV GIT_COMMIT=$GIT_COMMIT

ENV PYTHONPATH=/app
ENV PORT=8000
ENV HOST=0.0.0.0

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Client address behind a proxy (audit TD-10). uvicorn takes the right-most
# X-Forwarded-For hop that is not one of FORWARDED_ALLOW_IPS, and only when the
# request arrived from one of them. The default trusts nothing remote, so a
# deploy that forgets to set it rate-limits by proxy address (safe, coarse)
# rather than by a header any client can forge. Set it to the proxy/ingress
# network: docker-compose.yml and the Helm values do.
ENV FORWARDED_ALLOW_IPS=127.0.0.1
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips \"$FORWARDED_ALLOW_IPS\""]
