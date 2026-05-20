FROM python:3.12-slim

# Instalar Tesseract e dependências
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-por \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar Chromium e dependencias do Playwright
RUN python -m playwright install --with-deps chromium

# Copiar código
COPY . .

# Cloud Run usa porta 8080
EXPOSE 8080

CMD uvicorn main:app --host 0.0.0.0 --port 8080