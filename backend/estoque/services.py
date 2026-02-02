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
    """ Converte qualquer coisa para Decimal de forma segura """
    if not valor: return Decimal('0.00')
    try:
        return Decimal(str(valor).replace(',', '.'))
    except (ValueError, InvalidOperation):
        return Decimal('0.00')

@transaction.atomic
def processar_movimentacao_estoque(
    produto, quantidade, tipo_movimento, usuario, 
    cliente=None, fornecedor=None, preco_unitario=0, 
    numero_serial=None, arquivos=None, 
    gerar_financeiro=True, dados_financeiros=None
):
    print(f"--- SERVICE: Processando {tipo_movimento} de {quantidade} itens ---")
    
    # --- CONVERSÃO PARA DECIMAL SEGURA ---
    qtd_decimal = to_decimal(quantidade)
    preco_decimal = to_decimal(preco_unitario)
    
    # Garantimos que o estoque atual venha do banco atualizado e seja decimal
    produto.refresh_from_db() 
    estoque_atual_decimal = to_decimal(produto.estoque_atual)

    print(f"DEBUG ESTOQUE: Atual={estoque_atual_decimal} | Movimentação={qtd_decimal}")

    # 1. Atualiza Saldo
    if tipo_movimento == 'SAIDA':
        if estoque_atual_decimal < qtd_decimal:
            msg = f"Estoque insuficiente. Disponível: {estoque_atual_decimal}, Solicitado: {qtd_decimal}"
            print(f"ERRO SERVICE: {msg}")
            raise ValidationError(msg)
        
        produto.estoque_atual = estoque_atual_decimal - qtd_decimal
    else:
        produto.estoque_atual = estoque_atual_decimal + qtd_decimal
    
    produto.save()
    print(f"Novo estoque salvo: {produto.estoque_atual}")

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
        arquivo_2=arquivo_2
    )

    # 3. Gera Financeiro
    valor_total = qtd_decimal * preco_decimal
    print(f"Valor Total Financeiro: {valor_total}")

    if gerar_financeiro and valor_total > 0:
        try:
            LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
            
            dados_fin = dados_financeiros or {}
            total_parcelas = int(dados_fin.get('total_parcelas', 1))
            
            # Define parâmetros base
            tipo_lanc = ''
            categoria = ''
            entidade_kw = {}
            desc_base = ''

            if tipo_movimento == 'SAIDA' and cliente:
                tipo_lanc = 'ENTRADA'
                categoria = 'VENDA' 
                entidade_kw = {'cliente': cliente}
                desc_base = f"Venda {produto.nome}"
                
            elif tipo_movimento == 'ENTRADA' and fornecedor:
                tipo_lanc = 'SAIDA'
                categoria = 'COMPRA'
                desc_base = f"Compra {produto.nome} - {fornecedor.razao_social}"
            else:
                print("Financeiro ignorado: falta cliente na saída ou fornecedor na entrada")
                return movimentacao 

            # Gera Parcelas
            valor_parcela = valor_total / Decimal(total_parcelas)
            grupo_id = uuid.uuid4()
            
            for i in range(total_parcelas):
                vencimento = add_months(date.today(), i)
                
                LancamentoFinanceiro.objects.create(
                    descricao=f"{desc_base} ({i+1}/{total_parcelas})" if total_parcelas > 1 else desc_base,
                    valor=valor_parcela,
                    tipo_lancamento=tipo_lanc,
                    categoria='SERVICO', 
                    status='PENDENTE',
                    data_vencimento=vencimento,
                    grupo_parcelamento=grupo_id,
                    parcela_atual=i+1,
                    total_parcelas=total_parcelas,
                    **entidade_kw,
                    
                    # === AQUI ESTÁ A CORREÇÃO ===
                    # Isso pega o arquivo que acabou de ser salvo no Estoque
                    # e vincula também no Financeiro
                    arquivo_1=movimentacao.arquivo_1,
                    arquivo_2=movimentacao.arquivo_2
                )
            print("Financeiro gerado com sucesso.")
            
        except Exception as e:
            print(f"ERRO AO GERAR FINANCEIRO (Mas estoque foi movido): {e}")

    return movimentacao