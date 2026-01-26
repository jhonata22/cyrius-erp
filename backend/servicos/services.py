from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.apps import apps 
from decimal import Decimal, ROUND_HALF_UP # <--- Importante para precisão

# Tenta importar a função do estoque.
try:
    from estoque.services import processar_movimentacao_estoque
except ImportError:
    def processar_movimentacao_estoque(*args, **kwargs):
        print("ERRO CRÍTICO: Serviço de estoque não encontrado!")

def limpar_decimal(valor):
    """
    Transforma qualquer valor em Decimal com exatas 2 casas decimais.
    Resolve o erro: 'Ensure that there are no more than 2 decimal places.'
    """
    if valor is None:
        return Decimal('0.00')
    # Converte para string primeiro para evitar imprecisões do float
    return Decimal(str(valor)).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)

def adicionar_peca_os(os_id, produto_id, quantidade, preco_venda=None):
    OrdemServico = apps.get_model('servicos', 'OrdemServico')
    ItemServico = apps.get_model('servicos', 'ItemServico')
    Produto = apps.get_model('estoque', 'Produto')

    os = OrdemServico.objects.get(pk=os_id)
    
    if os.status in ['CONCLUIDO', 'FINALIZADO', 'CANCELADO']:
        raise ValidationError("Não é possível adicionar itens a uma OS finalizada.")

    produto = Produto.objects.get(pk=produto_id)

    if produto.estoque_atual < quantidade:
        raise ValidationError(f"Estoque insuficiente. Disp: {produto.estoque_atual}")

    # Aplica a limpeza decimal no preço de venda
    preco_final = limpar_decimal(preco_venda if preco_venda is not None else produto.preco_venda_sugerido)

    item, created = ItemServico.objects.get_or_create(
        os=os,
        produto=produto,
        defaults={'quantidade': quantidade, 'preco_venda': preco_final}
    )
    
    if not created:
        nova_qtd = item.quantidade + quantidade
        if produto.estoque_atual < nova_qtd:
            raise ValidationError(f"Estoque insuficiente p/ adicionar. Total desejado: {nova_qtd}")
        item.quantidade = nova_qtd
        item.preco_venda = preco_final
        item.save()

    return item

@transaction.atomic
def finalizar_ordem_servico(os, usuario_responsavel):
    """
    Finaliza OS: Baixa Estoque + Gera Financeiro
    """
    LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')

    if os.status in ['FINALIZADO', 'CONCLUIDO']:
        raise ValidationError("OS já finalizada.")

    # 1. BAIXA DE ESTOQUE (Onde estava dando o erro de preco_unitario)
    for item in os.itens.all():
        processar_movimentacao_estoque(
            produto=item.produto,
            quantidade=item.quantidade,
            tipo_movimento='SAIDA',
            usuario=usuario_responsavel,
            cliente=os.cliente,
            # CORREÇÃO CRÍTICA AQUI:
            preco_unitario=limpar_decimal(item.preco_venda),
            gerar_financeiro=False 
        )

    # 2. FINANCEIRO: RECEITA
    valor_receita = limpar_decimal(os.valor_total_geral)
    
    if valor_receita > 0:
        LancamentoFinanceiro.objects.create(
            cliente=os.cliente,
            tecnico=os.tecnico_responsavel if os.tecnico_responsavel else None,
            descricao=f"Receita OS #{os.pk} - {os.titulo}",
            valor=valor_receita,
            status='PENDENTE',
            tipo_lancamento='ENTRADA',
            categoria='SERVICO',
            data_vencimento=timezone.now().date()
        )

    # 3. FINANCEIRO: DESPESAS
    if os.custo_deslocamento > 0:
        LancamentoFinanceiro.objects.create(
            tecnico=os.tecnico_responsavel if os.tecnico_responsavel else None,
            descricao=f"Custo Deslocamento OS #{os.pk}",
            valor=limpar_decimal(os.custo_deslocamento),
            status='PENDENTE',
            tipo_lancamento='SAIDA',
            categoria='DESPESA',
            data_vencimento=timezone.now().date(),
            cliente=os.cliente
        )

    if os.custo_terceiros > 0:
        LancamentoFinanceiro.objects.create(
            descricao=f"Serviço Terceiros OS #{os.pk}",
            valor=limpar_decimal(os.custo_terceiros),
            status='PENDENTE',
            tipo_lancamento='SAIDA',
            categoria='CUSTO_TEC',
            data_vencimento=timezone.now().date(),
            cliente=os.cliente
        )

    # 4. FINALIZAÇÃO
    os.status = 'FINALIZADO'
    os.data_conclusao = timezone.now()
    os.data_finalizacao = timezone.now()
    os.save()

    return os