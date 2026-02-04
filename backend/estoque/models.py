from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Fornecedor(models.Model):
    # === NOVO CAMPO: EMPRESA ===
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, null=True, blank=True)

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
    # Produto geralmente é global (catálogo), mas se quiser separar estoque físico por filial,
    # precisaríamos de uma tabela intermediária. 
    # Por simplificação, o cadastro do PRODUTO é global, mas a MOVIMENTAÇÃO é por empresa.
    nome = models.CharField(max_length=100)
    estoque_minimo = models.PositiveIntegerField(default=2)
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
    
    # === NOVO CAMPO: EMPRESA ===
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, null=True, blank=True)

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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)