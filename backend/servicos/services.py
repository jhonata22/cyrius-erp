from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.apps import apps 
from decimal import Decimal, ROUND_HALF_UP

# Tenta importar a função do estoque (mas não vamos usar ela para validar agora)
try:
    from estoque.services import processar_movimentacao_estoque
except ImportError:
    pass

def limpar_decimal(valor):
    if valor is None:
        return Decimal('0.00')
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

    preco_final = limpar_decimal(preco_venda if preco_venda is not None else produto.preco_venda_sugerido)

    item, created = ItemServico.objects.get_or_create(
        os=os,
        produto=produto,
        defaults={'quantidade': quantidade, 'preco_venda': preco_final}
    )
    
    if not created:
        nova_qtd = item.quantidade + quantidade
        if produto.estoque_atual < nova_qtd:
             raise ValidationError(f"Estoque insuficiente. Total desejado: {nova_qtd}")
        item.quantidade = nova_qtd
        item.preco_venda = preco_final
        item.save()

    return item

@transaction.atomic
def finalizar_ordem_servico(os, usuario_responsavel):
    LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
    
    # Tenta pegar o modelo de Movimentação para gerar histórico manual
    try:
        MovimentacaoEstoque = apps.get_model('estoque', 'MovimentacaoEstoque')
    except LookupError:
        MovimentacaoEstoque = None

    if os.status in ['FINALIZADO', 'CONCLUIDO']:
        raise ValidationError("OS já finalizada.")

    # 1. BAIXA DE ESTOQUE (MANUAL)
    for item in os.itens.select_related('produto').all():
        # Atualiza leitura do banco
        item.produto.refresh_from_db()
        
        # Nossa validação (que sabemos que funciona)
        if item.produto.estoque_atual < item.quantidade:
            raise ValidationError(
                f"Estoque insuficiente para '{item.produto.nome}'. "
                f"Necessário: {item.quantidade}, Disponível: {item.produto.estoque_atual}."
            )

        # --- AQUI ESTA A CORREÇÃO ---
        # Em vez de chamar a função 'processar_movimentacao_estoque' que está bugada,
        # fazemos a subtração direta.
        
        # 1. Subtrai o estoque
        item.produto.estoque_atual -= item.quantidade
        item.produto.save()
        
        # 2. Tenta gerar o histórico manualmente (Bypass na função de serviço)
        if MovimentacaoEstoque:
            try:
                MovimentacaoEstoque.objects.create(
                    produto=item.produto,
                    quantidade=item.quantidade,
                    tipo_movimento='SAIDA',
                    usuario=usuario_responsavel,
                    observacao=f"Baixa OS #{os.pk} (Cliente: {os.cliente.razao_social})",
                    data_movimento=timezone.now() # Garantia caso o auto_now falhe
                )
            except Exception as e:
                # Se der erro no histórico, apenas printa mas não trava a OS
                print(f"Aviso: Não foi possível gerar histórico de estoque: {e}")

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

    # 3. FINANCEIRO: CUSTOS
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