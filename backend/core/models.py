from django.db import models
from django.conf import settings

class Empresa(models.Model):
    razao_social = models.CharField(max_length=200)
    nome_fantasia = models.CharField(max_length=100)
    cnpj = models.CharField(max_length=20, unique=True)
    eh_matriz = models.BooleanField(default=False, verbose_name="É a Matriz?")

    # Identidade Visual (para o Frontend mudar cor/logo)
    logo = models.ImageField(upload_to='logos_empresas/', null=True, blank=True)
    cor_primaria = models.CharField(max_length=7, default='#302464', help_text="Cor HEX (ex: #302464)")
    cor_secundaria = models.CharField(max_length=7, default='#7C69AF', help_text="Cor HEX Secundária")

    # Dados Bancários (Opcional, útil para boletos futuros)
    banco_nome = models.CharField(max_length=50, blank=True)
    agencia = models.CharField(max_length=20, blank=True)
    conta = models.CharField(max_length=20, blank=True)
    chave_pix = models.CharField(max_length=100, blank=True)

    ativa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Empresa / Filial"
        verbose_name_plural = "Empresas / Filiais"

    def __str__(self):
        return f"{self.nome_fantasia} ({self.cnpj})"

class Notificacao(models.Model):
    TIPO_CHOICES = [
        ('VISITA', 'Visita Técnica'),
        ('CHURN', 'Risco de Cancelamento'),
        ('SISTEMA', 'Sistema')
    ]

    destinatario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificacoes')
    titulo = models.CharField(max_length=100)
    mensagem = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='SISTEMA')
    lida = models.BooleanField(default=False)
    data_criacao = models.DateTimeField(auto_now_add=True)
    link = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        ordering = ['-data_criacao']
        db_table = 'TB_NOTIFICACAO'

    def __str__(self):
        return f"{self.titulo} - {self.destinatario.username}"