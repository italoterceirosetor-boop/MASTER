FROM python:3.11-slim

# Instalar dependências do sistema pro WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libcairo-gobject2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libgobject-2.0-0 \
    libglib2.0-0 \
    libxml2-dev \
    libxslt1-dev \
    libpangocairo-1.0-0 \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements primeiro (cache de layers do Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Porta do Railway
EXPOSE 8080

# Comando de inicialização
CMD gunicorn main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
