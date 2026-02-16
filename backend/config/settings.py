"""
Django settings for config project.
Updated for Production/Docker environment.
"""

from pathlib import Path
import os
import environ
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Inicializa o Environ
env = environ.Env()
# Lê o arquivo .env (se existir)
environ.Env.read_env(os.path.join(BASE_DIR, '../.env'))

# =========================================================
# SEGURANÇA CRÍTICA
# =========================================================

# Lê do .env. Se não existir, lança erro (em produção isso é vital)
# Em dev, você deve adicionar isso ao seu .env
SECRET_KEY = env('SECRET_KEY', default='django-insecure-dev-key-change-in-prod')

# Converte "True"/"False" do .env para booleano. Padrão é False (seguro).
DEBUG = env.bool('DEBUG', default=False)

# Aceita lista separada por vírgula. Ex no .env: ALLOWED_HOSTS=localhost,127.0.0.1,meusite.com
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '*'])


# =========================================================
# APLICAÇÃO
# =========================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Apps de Terceiros
    'corsheaders',                
    'rest_framework',             
    'rest_framework_simplejwt',   
    # 'whitenoise', # Descomente se instalar o whitenoise: pip install whitenoise
    
    # Meus Apps
    'core',
    'clientes',
    'equipe',
    'infra',
    'estoque',
    'financeiro',
    'chamados',
    'servicos',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # OBRIGATÓRIO SER O PRIMEIRO
    'django.middleware.security.SecurityMiddleware',
    # 'whitenoise.middleware.WhiteNoiseMiddleware', # Recomendado para servir estáticos no Docker
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'utils' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# =========================================================
# BANCO DE DADOS
# =========================================================

# Constrói a URL do banco baseada nas variáveis do seu .env atual
# Se você adicionar DATABASE_URL no .env, ele usa ela. Se não, monta com as partes.
DB_USER = env('POSTGRES_USER', default='postgres')
DB_PASS = env('POSTGRES_PASSWORD', default='postgres')
DB_HOST = env('POSTGRES_HOST', default='db')
DB_NAME = env('POSTGRES_DB', default='cyrius_db')
DB_PORT = env('POSTGRES_PORT', default='5432')

DEFAULT_DB_URL = f'postgres://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

DATABASES = {
    'default': env.db('DATABASE_URL', default=DEFAULT_DB_URL)
}


# =========================================================
# VALIDAÇÃO DE SENHA
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =========================================================
# INTERNACIONALIZAÇÃO (Ajustado para Brasil)
# =========================================================

LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True

USE_TZ = True


# =========================================================
# ARQUIVOS ESTÁTICOS E MÍDIA
# =========================================================

STATIC_URL = '/static/'

# Pasta onde o 'collectstatic' reunirá os arquivos para produção. 
# Mudei para 'staticfiles' para não misturar com a pasta de desenvolvimento.
STATIC_ROOT = BASE_DIR / 'staticfiles'

# (Opcional) Configuração do WhiteNoise para compressão e cache
# STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# =========================================================
# CACHE / REDIS
# =========================================================

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env('REDIS_URL', default="redis://redis:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}


# =========================================================
# API, CORS E SEGURANÇA
# =========================================================

# Permite origens dinâmicas via .env, mas mantém localhost como fallback
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

# Configuração do DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Adicionada Paginação para evitar sobrecarga do servidor
#    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
#    'PAGE_SIZE': 20, 
}

# Configuração do JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,  # Segurança: Rotaciona o refresh token
    'BLACKLIST_AFTER_ROTATION': True, # Segurança: Invalida o anterior
    'AUTH_HEADER_TYPES': ('Bearer',),
}