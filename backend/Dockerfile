# Usa uma imagem leve do Python
FROM python:3.12-slim

# Define variáveis de ambiente para otimizar o Python no Docker
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para o Postgres
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências do Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código (neste momento estará vazio, mas serve para o futuro)
COPY . .

# Expõe a porta 8000
EXPOSE 8000

# Comando padrão (será sobrescrito pelo docker-compose em desenvolvimento)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]