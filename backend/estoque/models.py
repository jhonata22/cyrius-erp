from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Fornecedor(models.Model):
    razao_social = models.CharField(max_length=100)
    cnpj = models.CharField(max_length=18, null=True, blank=True)
    contato_nome = models.CharField(max_length=100, null=True, blank=True)
    telefone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)

    class Meta: 
        db_table = 'TB_FORNECEDOR'
        verbose_name = 'Fornecedor'
        verbose_name_plural = 'Fornecedores'

    def __str__(self): 
        return self.razao_social

class Produto(TimeStampedModel):
    nome = models.CharField(max_length=100)
    estoque_minimo = models.PositiveIntegerField(default=2)
    # Importante: DecimalField para evitar erros de precisão (0.9999)
    estoque_atual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    preco_venda_sugerido = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta: 
        db_table = 'TB_PRODUTO'
        verbose_name = 'Produto'
        ordering = ['nome']
    
    def __str__(self): return self.nome

class MovimentacaoEstoque(models.Model):
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
    ]
    
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name='movimentacoes')
    tipo_movimento = models.CharField(max_length=10, choices=TIPO_CHOICES)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    data_movimento = models.DateTimeField(auto_now_add=True)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.SET_NULL, null=True, blank=True)
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.SET_NULL, null=True, blank=True)
    
    numero_serial = models.CharField(max_length=100, null=True, blank=True)
    
    arquivo_1 = models.FileField(upload_to='docs_estoque/', null=True, blank=True)
    arquivo_2 = models.FileField(upload_to='docs_estoque/', null=True, blank=True)
    
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta: 
        db_table = 'TB_MOVIMENTACAO_ESTOQUE'
        verbose_name = 'Movimentação de Estoque'

    # REMOVEMOS O CLEAN() DAQUI POIS O SERVICE JÁ VALIDA O ESTOQUE ANTES DE SUBTRAIR.
    # O clean aqui estava olhando o saldo já atualizado pelo service e bloqueando a gravação.

    def save(self, *args, **kwargs):
        # Mantemos apenas o save padrão para evitar conflitos com o service
        super().save(*args, **kwargs)