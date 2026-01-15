from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from core.models import OrdemServico, ItemServico, LancamentoFinanceiro
from core.services.estoque import processar_movimentacao_estoque

def adicionar_peca_os(os_id, produto_id, quantidade, preco_venda=None):
    """
    Adiciona uma peça à OS, mas valida antes se tem estoque físico disponível.
    """
    os = OrdemServico.objects.get(pk=os_id)
    
    # 1. Bloqueia alteração se a OS já estiver concluída
    if os.status in [OrdemServico.Status.CONCLUIDO, OrdemServico.Status.CANCELADO]:
        raise ValidationError("Não é possível adicionar itens a uma OS finalizada ou cancelada.")

    # 2. Busca o produto (Django faz o lazy load, mas aqui precisamos da instância)
    # Importação local para evitar ciclo se necessário, ou usar o model direto
    from core.models import Produto
    produto = Produto.objects.get(pk=produto_id)

    # 3. Valida Estoque
    if produto.estoque_atual < quantidade:
        raise ValidationError(f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque_atual}")

    # 4. Define preço (se não informado, usa o sugerido do cadastro)
    preco_final = preco_venda if preco_venda is not None else produto.preco_venda_sugerido

    # 5. Cria ou Atualiza o Item
    item, created = ItemServico.objects.get_or_create(
        os=os,
        produto=produto,
        defaults={'quantidade': quantidade, 'preco_venda': preco_final}
    )
    
    if not created:
        # Se já existia, soma a quantidade e valida estoque novamente
        nova_qtd = item.quantidade + quantidade
        if produto.estoque_atual < nova_qtd:
            raise ValidationError(f"Estoque insuficiente para adicionar mais {quantidade}. Total desejado: {nova_qtd}")
        item.quantidade = nova_qtd
        item.preco_venda = preco_final # Atualiza preço se mudou
        item.save()

    return item

@transaction.atomic
def finalizar_ordem_servico(os, usuario_responsavel):
    """
    Finaliza a OS e dispara os gatilhos:
    1. Baixa no Estoque (Saída de peças).
    2. Geração de Receita (Financeiro Entrada).
    3. Geração de Despesa (Financeiro Saída - Transporte/Terceiros).
    """
    
    # Validação Básica
    if os.status == OrdemServico.Status.CONCLUIDO:
        raise ValidationError("Esta OS já foi finalizada anteriormente.")

    # 1. BAIXA DE ESTOQUE (Itera sobre os itens da OS)
    for item in os.itens.all():
        processar_movimentacao_estoque(
            produto=item.produto,
            quantidade=item.quantidade,
            tipo_movimento='SAIDA',
            usuario=usuario_responsavel,
            cliente=os.cliente,
            preco_unitario=item.preco_venda, 
            # --- CORREÇÃO PONTUAL AQUI ---
            # Bloqueia a criação do financeiro individual da peça,
            # pois ela será cobrada no total da OS abaixo.
            gerar_financeiro=False 
            # -----------------------------
        )

    # 2. FINANCEIRO: RECEITA (O que o cliente paga)
    valor_total = os.valor_total_geral
    if valor_total > 0:
        LancamentoFinanceiro.objects.create(
            cliente=os.cliente,
            tecnico=os.tecnico_responsavel,
            descricao=f"Receita OS #{os.pk} - {os.titulo}",
            valor=valor_total,
            status='PENDENTE', # Gera como pendente para o financeiro dar baixa quando o pix cair
            tipo_lancamento='ENTRADA',
            categoria='SERVICO',
            data_vencimento=timezone.now().date() # Vence hoje (dia da conclusão)
        )

    # 3. FINANCEIRO: DESPESAS OPERACIONAIS (Se houve custo para a empresa)
    
    # Custo de Transporte (Uber, Gasolina)
    if os.custo_deslocamento > 0:
        LancamentoFinanceiro.objects.create(
            tecnico=os.tecnico_responsavel, # Reembolso para este técnico ou caixa pequeno
            descricao=f"Deslocamento OS #{os.pk}",
            valor=os.custo_deslocamento,
            status='PENDENTE',
            tipo_lancamento='SAIDA',
            categoria='CUSTO_TEC',
            data_vencimento=timezone.now().date()
        )

    # Custo de Terceiros (Mão de obra externa)
    if os.custo_terceiros > 0:
        LancamentoFinanceiro.objects.create(
            descricao=f"Serviço Terceirizado OS #{os.pk}",
            valor=os.custo_terceiros,
            status='PENDENTE',
            tipo_lancamento='SAIDA',
            categoria='CUSTO_TEC',
            data_vencimento=timezone.now().date()
        )

    # 4. ATUALIZA STATUS DA OS
    os.status = OrdemServico.Status.CONCLUIDO
    os.data_conclusao = timezone.now()
    os.save()

    return os

def reabrir_ordem_servico(os):
    """
    (Opcional) Lógica para estornar caso tenha finalizado errado.
    Para V1, bloqueamos reabertura para garantir integridade fiscal/estoque.
    """
    if os.status == OrdemServico.Status.CONCLUIDO:
        raise ValidationError("Por segurança, uma OS concluída não pode ser reaberta automaticamente. Crie uma nova OS de correção ou contate o administrador para estorno manual.")