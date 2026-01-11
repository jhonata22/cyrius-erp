# backend/core/services/estoque.py
from django.db import transaction
from django.utils import timezone
from core.models import MovimentacaoEstoque, LancamentoFinanceiro

def processar_movimentacao_estoque(produto, quantidade, tipo_movimento, usuario, 
                                  cliente=None, fornecedor=None, preco_unitario=0, 
                                  numero_serial=None):
    """
    Orquestra a criação da movimentação de estoque e, se necessário,
    gera o lançamento financeiro correspondente.
    """
    with transaction.atomic():
        # 1. Cria a movimentação de estoque
        movimentacao = MovimentacaoEstoque.objects.create(
            produto=produto,
            quantidade=quantidade,
            tipo_movimento=tipo_movimento,
            usuario=usuario,
            cliente=cliente,
            fornecedor=fornecedor,
            preco_unitario=preco_unitario,
            numero_serial=numero_serial
        )

        # 2. Lógica de Negócio: Se for SAÍDA e houver cliente, gera ENTRADA financeira (VENDA)
        if tipo_movimento == 'SAIDA' and cliente and preco_unitario > 0:
            LancamentoFinanceiro.objects.create(
                cliente=cliente,
                descricao=f"Venda: {produto.nome} ({quantidade} un)",
                valor=quantidade * preco_unitario,
                tipo_lancamento='ENTRADA',
                categoria='VENDA',
                status='PENDENTE',
                data_vencimento=timezone.now().date()
            )

        # 3. Lógica de Negócio: Se for ENTRADA e houver fornecedor, gera SAÍDA financeira (COMPRA)
        elif tipo_movimento == 'ENTRADA' and fornecedor and preco_unitario > 0:
            LancamentoFinanceiro.objects.create(
                descricao=f"Compra: {produto.nome} ({quantidade} un)",
                valor=quantidade * preco_unitario,
                tipo_lancamento='SAIDA',
                categoria='COMPRA',
                status='PENDENTE',
                data_vencimento=timezone.now().date()
            )

    return movimentacao