FROM python:3.11-slim

# Instalar Chromium e dependências pro pdfkit funcionar
# Inclui xvfb (display virtual) e dbus
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    fonts-liberation \
    fonts-dejavu-core \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxkbcommon0 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    xvfb \
    libdbus-1-3 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Apontar pdfkit pro chromium do sistema
ENV PDFKIT_BIN=/usr/bin/chromium

EXPOSE 8080

# Inicia Xvfb (display virtual) + gunicorn
CMD xvfb-run -a --server-args="-screen 0 1024x768x24" gunicorn main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
