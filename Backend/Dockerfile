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

# Expor porta (Render usa porta dinâmica)
EXPOSE $PORT

# Comando para iniciar - usa variável de ambiente PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}