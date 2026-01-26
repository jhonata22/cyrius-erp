from django.db import models
from django.contrib.auth.models import User

class Equipe(models.Model):
    # Definindo os cargos permitidos
    class Cargo(models.TextChoices):
        TECNICO = 'TECNICO', 'Técnico'
        GESTOR = 'GESTOR', 'Gestor'
        SOCIO = 'SOCIO', 'Sócio'
        ESTAGIARIO = 'ESTAGIARIO', 'Estagiário'

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    nome = models.CharField(max_length=100)
    foto = models.ImageField(upload_to='fotos_equipe/', null=True, blank=True)
    cargo = models.CharField(
        max_length=50, 
        choices=Cargo.choices, 
        default=Cargo.TECNICO
    )
    custo_hora = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'TB_EQUIPE'
        verbose_name = 'Membro da Equipe'
        verbose_name_plural = 'Equipe'

    def __str__(self):
        return self.nome