FROM python:3.12-slim

# CORREÇÃO: Usando o formato ENV key=value
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# O segredo: passamos variáveis falsas apenas para o build não quebrar
# se o seu settings.py exigir DATABASE_URL ou SECRET_KEY


EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application", "--workers", "3"]