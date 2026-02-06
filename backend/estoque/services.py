from django.db import transaction
from django.core.exceptions import ValidationError
from django.apps import apps
from django.utils import timezone
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation 
from .models import MovimentacaoEstoque

def add_months(sourcedate, months):
    import calendar
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

def to_decimal(valor):
    if not valor: return Decimal('0.00')
    try:
        return Decimal(str(valor).replace(',', '.'))
    except:
        return Decimal('0.00')

@transaction.atomic
def processar_movimentacao_estoque(
    produto, quantidade, tipo_movimento, usuario, 
    cliente=None, fornecedor=None, preco_unitario=0, 
    numero_serial=None, arquivos=None, 
    gerar_financeiro=True, dados_financeiros=None,
    empresa_id=None 
):
    print(f"--- SERVICE: Processando {tipo_movimento} (Empresa ID: {empresa_id}) ---")
    
    qtd_decimal = to_decimal(quantidade)
    preco_decimal = to_decimal(preco_unitario)
    
    produto.refresh_from_db() 
    estoque_atual_decimal = to_decimal(produto.estoque_atual)

    # 1. Atualiza Saldo
    if tipo_movimento == 'SAIDA':
        if estoque_atual_decimal < qtd_decimal:
            raise ValidationError(f"Estoque insuficiente. Disp: {estoque_atual_decimal}")
        produto.estoque_atual = estoque_atual_decimal - qtd_decimal
    else:
        produto.estoque_atual = estoque_atual_decimal + qtd_decimal
    
    produto.save()

    # 2. Cria Registro de Movimentação
    arquivo_1 = arquivos.get('arquivo_1') if arquivos else None
    arquivo_2 = arquivos.get('arquivo_2') if arquivos else None

    movimentacao = MovimentacaoEstoque.objects.create(
        produto=produto,
        quantidade=qtd_decimal, 
        tipo_movimento=tipo_movimento,
        preco_unitario=preco_decimal,
        usuario=usuario,
        cliente=cliente,
        fornecedor=fornecedor,
        numero_serial=numero_serial,
        arquivo_1=arquivo_1,
        arquivo_2=arquivo_2,
        empresa_id=empresa_id # <--- VÍNCULO IMPORTANTE
    )

    # 3. Gera Financeiro
    valor_total = qtd_decimal * preco_decimal

    if gerar_financeiro and valor_total > 0:
        try:
            LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
            
            dados_fin = dados_financeiros or {}
            total_parcelas = int(dados_fin.get('total_parcelas', 1))
            
            desc_base = f"Movimentação Estoque {produto.nome}"
            tipo_lanc = 'SAIDA' if tipo_movimento == 'ENTRADA' else 'ENTRADA'
            # Ajuste de categoria para bater com seu TextChoices
            categoria = 'COMPRA' if tipo_movimento == 'ENTRADA' else 'VENDA' 
            
            entidade_kw = {}
            if cliente: entidade_kw['cliente'] = cliente
            if fornecedor: entidade_kw['fornecedor'] = fornecedor

            valor_parcela = valor_total / Decimal(total_parcelas)
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
                    **entidade_kw,
                    arquivo_1=movimentacao.arquivo_1,
                    arquivo_2=movimentacao.arquivo_2,
                    
                    # AQUI A MÁGICA ACONTECE: O financeiro nasce na empresa certa
                    empresa_id=empresa_id
                )
            
        except Exception as e:
            # Importante: Logar o erro mas não travar o estoque se o financeiro falhar (ou dar raise se for critico)
            print(f"ERRO CRÍTICO AO GERAR FINANCEIRO DO ESTOQUE: {e}")
            # raise e # Descomente se quiser que o erro financeiro aborte a movimentação

    return movimentacao