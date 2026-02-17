from django.db import models
from core.models import Empresa
from clientes.models import Cliente
from estoque.models import Produto
from equipe.models import Equipe

class Venda(models.Model):
    PAGAMENTO_CHOICES = (
        ('DINHEIRO', 'Dinheiro'),
        ('PIX', 'PIX'),
        ('CARTAO_CREDITO', 'Cartão de Crédito'),
        ('BOLETO', 'Boleto'),
    )
    STATUS_CHOICES = (
        ('ORCAMENTO', 'Orçamento'),
        ('CONCLUIDA', 'Concluída'),
        ('REVOGADA', 'Revogada'),
    )

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT)
    solicitante = models.ForeignKey('clientes.ContatoCliente', on_delete=models.SET_NULL, null=True, blank=True, related_name='vendas')
    
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    valor_entrada = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    parcelas = models.IntegerField(default=1)
    forma_pagamento = models.CharField(max_length=20, choices=PAGAMENTO_CHOICES, default='DINHEIRO')
    vincular_contrato = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ORCAMENTO')
    data_venda = models.DateTimeField(auto_now_add=True)
    validade_orcamento = models.DateField(null=True, blank=True)
    vendedor = models.ForeignKey(Equipe, on_delete=models.PROTECT)

    arquivo_orcamento = models.FileField(upload_to='orcamentos_vendas/', null=True, blank=True)
    comprovante_pagamento = models.FileField(upload_to='comprovantes_vendas/', null=True, blank=True)

    def __str__(self):
        return f"Venda #{self.id} para {self.cliente}"

class ItemVenda(models.Model):
    venda = models.ForeignKey(Venda, related_name='itens', on_delete=models.CASCADE)
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2) # Preço no momento da venda
    valor_total_item = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.valor_total_item = self.preco_unitario * self.quantidade
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} na Venda #{self.venda.id}"
