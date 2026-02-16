from django.db import models
from core.models import Empresa
from clientes.models import Cliente
from estoque.models import Produto
from equipe.models import Equipe

class Venda(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT)
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    parcelas = models.IntegerField(default=1)
    data_venda = models.DateTimeField(auto_now_add=True)
    vendedor = models.ForeignKey(Equipe, on_delete=models.PROTECT)

    def __str__(self):
        return f"Venda de {self.produto} para {self.cliente} em {self.data_venda.strftime('%d/%m/%Y')}" 
