# backend/core/managers.py
from django.db import models
from django.db.models import Sum, Q, F

class ProdutoQuerySet(models.QuerySet):
    def com_estoque_calculado(self):
        """
        Calcula o estoque total em uma única consulta SQL,
        sendo muito mais rápido que o @property.
        """
        return self.annotate(
            total_entradas=models.functions.Coalesce(
                Sum('movimentacoes__quantidade', filter=Q(movimentacoes__tipo_movimento='ENTRADA')), 0
            ),
            total_saidas=models.functions.Coalesce(
                Sum('movimentacoes__quantidade', filter=Q(movimentacoes__tipo_movimento='SAIDA')), 0
            )
        ).annotate(
            estoque_real=F('total_entradas') - F('total_saidas')
        )

class LancamentoQuerySet(models.QuerySet):
    def pendentes(self):
        return self.filter(status='PENDENTE')

    def atrasados(self):
        from django.utils import timezone
        return self.filter(status='PENDENTE', data_vencimento__lt=timezone.now().date())

    def receitas(self):
        return self.filter(tipo_lancamento='ENTRADA')

    def despesas(self):
        return self.filter(tipo_lancamento='SAIDA')