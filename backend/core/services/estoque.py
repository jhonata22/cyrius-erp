from django.db import transaction
from django.utils import timezone
from core.models import MovimentacaoEstoque, LancamentoFinanceiro

def processar_movimentacao_estoque(produto, quantidade, tipo_movimento, usuario, 
                                  cliente=None, fornecedor=None, preco_unitario=0, 
                                  numero_serial=None, arquivo=None):
    """
    Cria a movimentação e gera o financeiro automaticamente.
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
            numero_serial=numero_serial,
            arquivo=arquivo
        )

        # Converte para float para garantir cálculo correto
        qtd = float(quantidade or 0)
        preco = float(preco_unitario or 0)
        valor_total = qtd * preco

        # 2. GERAÇÃO DE FINANCEIRO (VENDA -> ENTRADA)
        if tipo_movimento == 'SAIDA' and cliente and valor_total > 0:
            LancamentoFinanceiro.objects.create(
                cliente=cliente,
                descricao=f"Venda: {produto.nome} (Qtd: {quantidade})",
                valor=valor_total,
                tipo_lancamento='ENTRADA',
                categoria='VENDA',
                status='PENDENTE', # Fica a receber
                data_vencimento=timezone.now().date()
            )

        # 3. GERAÇÃO DE FINANCEIRO (COMPRA -> SAÍDA)
        elif tipo_movimento == 'ENTRADA' and fornecedor and valor_total > 0:
            LancamentoFinanceiro.objects.create(
                descricao=f"Compra Estoque: {produto.nome} - {fornecedor.razao_social}",
                valor=valor_total,
                tipo_lancamento='SAIDA',
                categoria='COMPRA',
                status='PENDENTE', # Fica a pagar
                data_vencimento=timezone.now().date()
            )

    return movimentacao