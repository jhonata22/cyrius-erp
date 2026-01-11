# backend/core/models_base.py
from django.db import models

class TimeStampedModel(models.Model):
    """
    Classe base abstrata para adicionar data de criação e atualização.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True