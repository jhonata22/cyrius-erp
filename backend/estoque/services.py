from django.db import transaction
from django.core.exceptions import ValidationError
from django.apps import apps
from django.utils import timezone
import uuid
from datetime import date
from .models import MovimentacaoEstoque

def add_months(sourcedate, months):
    import calendar
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

@transaction.atomic
def processar_movimentacao_estoque(
    produto, quantidade, tipo_movimento, usuario, 
    cliente=None, fornecedor=None, preco_unitario=0, 
    numero_serial=None, arquivos=None, 
    gerar_financeiro=True, dados_financeiros=None
):
    # 1. Atualiza Saldo
    quantidade = float(quantidade)
    if tipo_movimento == 'SAIDA':
        if produto.estoque_atual < quantidade:
            raise ValidationError(f"Estoque insuficiente. Atual: {produto.estoque_atual}")
        produto.estoque_atual = float(produto.estoque_atual) - quantidade
    else:
        produto.estoque_atual = float(produto.estoque_atual) + quantidade
    produto.save()

    # 2. Cria Registro de Movimentação
    arquivo_1 = arquivos.get('arquivo_1') if arquivos else None
    arquivo_2 = arquivos.get('arquivo_2') if arquivos else None

    movimentacao = MovimentacaoEstoque.objects.create(
        produto=produto,
        quantidade=quantidade,
        tipo_movimento=tipo_movimento,
        preco_unitario=preco_unitario,
        usuario=usuario,
        cliente=cliente,
        fornecedor=fornecedor,
        numero_serial=numero_serial,
        arquivo_1=arquivo_1,
        arquivo_2=arquivo_2
    )

    # 3. Gera Financeiro (Se solicitado)
    valor_total = quantidade * float(preco_unitario)

    if gerar_financeiro and valor_total > 0:
        LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
        
        dados_fin = dados_financeiros or {}
        total_parcelas = int(dados_fin.get('total_parcelas', 1))
        
        # Define parâmetros base
        if tipo_movimento == 'SAIDA' and cliente:
            tipo_lanc = 'ENTRADA'
            categoria = 'VENDA' # Ajuste conforme choices do financeiro
            entidade_kw = {'cliente': cliente}
            desc_base = f"Venda {produto.nome}"
            
        elif tipo_movimento == 'ENTRADA' and fornecedor:
            tipo_lanc = 'SAIDA'
            categoria = 'COMPRA'
            entidade_kw = {} # Fornecedor geralmente vai na obs se não tiver campo proprio
            desc_base = f"Compra {produto.nome} - {fornecedor.razao_social}"
        else:
            return movimentacao # Sem entidade financeira, encerra aqui

        # Gera Parcelas
        valor_parcela = valor_total / total_parcelas
        grupo_id = uuid.uuid4()
        
        for i in range(total_parcelas):
            vencimento = add_months(date.today(), i)
            
            LancamentoFinanceiro.objects.create(
                descricao=f"{desc_base} ({i+1}/{total_parcelas})" if total_parcelas > 1 else desc_base,
                valor=valor_parcela,
                tipo_lancamento=tipo_lanc,
                categoria=categoria,
                status='PENDENTE',
                data_vencimento=vencimento,
                grupo_parcelamento=grupo_id,
                parcela_atual=i+1,
                total_parcelas=total_parcelas,
                **entidade_kw
            )

    return movimentacao