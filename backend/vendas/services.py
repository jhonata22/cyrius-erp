from django.db import transaction
from rest_framework.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
import uuid
import calendar
import datetime

from estoque.models import MovimentacaoEstoque, Produto
from financeiro.models import LancamentoFinanceiro
from .models import Venda, ItemVenda

def criar_orcamento_venda(venda_data):
    """Cria uma Venda com status ORCAMENTO."""
    itens_data = venda_data.pop('itens', [])
    
    with transaction.atomic():
        venda_data['status'] = 'ORCAMENTO'
        venda_data['validade_orcamento'] = timezone.now().date() + timedelta(days=2)
        
        # Se não houver itens, o valor total é 0
        valor_total_calculado = sum(Decimal(item['quantidade']) * Decimal(item['preco_unitario']) for item in itens_data) if itens_data else Decimal('0.00')
        venda_data['valor_total'] = valor_total_calculado

        venda = Venda.objects.create(**venda_data)

        for item_data in itens_data:
            ItemVenda.objects.create(
                venda=venda, 
                produto=item_data['produto'],
                quantidade=item_data['quantidade'],
                preco_unitario=item_data['preco_unitario']
            )
    return venda

def aprovar_venda(venda: Venda):
    """Aprova uma venda, deduz o estoque e cria os lançamentos financeiros."""
    if venda.status != 'ORCAMENTO':
        raise ValidationError(f"Esta venda não é um orçamento e não pode ser aprovada.")

    if timezone.now().date() > venda.validade_orcamento:
        venda.status = 'REVOGADA'
        venda.save()
        raise ValidationError(f"Orçamento expirado em {venda.validade_orcamento.strftime('%d/%m/%Y')}. A venda foi revogada.")

    with transaction.atomic():
        # Valida o estoque de todos os itens ANTES de qualquer alteração
        for item in venda.itens.all():
            produto = item.produto
            if produto.estoque_atual < item.quantidade:
                raise ValidationError(f"Estoque insuficiente para o produto {produto.nome}. Disponível: {produto.estoque_atual}. Dê entrada no produto antes de aprovar a venda.")

        # Deduz o estoque e cria movimentações
        for item in venda.itens.all():
            produto = Produto.objects.select_for_update().get(pk=item.produto.id)
            produto.estoque_atual -= Decimal(item.quantidade)
            produto.save()

            MovimentacaoEstoque.objects.create(
                empresa=venda.empresa,
                produto=produto,
                quantidade=item.quantidade,
                tipo_movimento='SAIDA',
                cliente=venda.cliente, # <--- THIS IS THE CRITICAL ADDITION
                observacao=f"Venda #{venda.id} aprovada"
            )
        
        venda.status = 'CONCLUIDA'
        venda.save()

        valor_a_financiar = venda.valor_total - venda.desconto
        valor_entrada = venda.valor_entrada
        saldo_devedor = valor_a_financiar - valor_entrada
        forma_pagamento_display = venda.get_forma_pagamento_display()

        if valor_entrada > 0:
            LancamentoFinanceiro.objects.create(
                empresa=venda.empresa,
                cliente=venda.cliente,
                descricao=f"Venda #{venda.id} - Entrada ({forma_pagamento_display})",
                valor=valor_entrada,
                tipo_lancamento='ENTRADA', categoria='VENDA',
                data_vencimento=timezone.now().date(),
                data_pagamento=timezone.now().date(), status='PAGO',
                parcela_atual=1, total_parcelas=1
            )

        if saldo_devedor > 0:
            parcelas = venda.parcelas
            vincular_contrato = venda.vincular_contrato
            dia_venc_contrato = getattr(venda.cliente, 'dia_vencimento', None)

            def _get_smart_due_date(installment_index, dia_venc_cliente):
                mes_base = timezone.now().date().month
                ano_base = timezone.now().date().year
                ultimo_dia_mes_base = calendar.monthrange(ano_base, mes_base)[1]
                dia_real_base = min(dia_venc_cliente, ultimo_dia_mes_base)
                primeiro_vencimento = datetime.date(ano_base, mes_base, dia_real_base)
                if primeiro_vencimento <= timezone.now().date():
                    mes_base += 1
                    if mes_base > 12: mes_base = 1; ano_base += 1
                mes_parcela = mes_base + installment_index
                ano_parcela = ano_base
                while mes_parcela > 12: mes_parcela -= 12; ano_parcela += 1
                ultimo_dia_mes = calendar.monthrange(ano_parcela, mes_parcela)[1]
                dia_real = min(dia_venc_cliente, ultimo_dia_mes)
                return datetime.date(ano_parcela, mes_parcela, dia_real)

            if parcelas > 1:
                valor_parcela = round(saldo_devedor / parcelas, 2)
                grupo_id = uuid.uuid4()
                for i in range(parcelas):
                    data_venc = _get_smart_due_date(i, dia_venc_contrato) if vincular_contrato and dia_venc_contrato and venda.forma_pagamento == 'BOLETO' else timezone.now().date() + timedelta(days=30 * (i + 1))
                    if i == parcelas - 1: valor_parcela = saldo_devedor - (valor_parcela * (parcelas - 1))
                    LancamentoFinanceiro.objects.create(
                        empresa=venda.empresa, cliente=venda.cliente,
                        descricao=f"Venda #{venda.id} - Parcela {i + 1}/{parcelas}",
                        valor=valor_parcela, tipo_lancamento='ENTRADA', categoria='VENDA',
                        data_vencimento=data_venc, status='PENDENTE', parcela_atual=i + 1,
                        total_parcelas=parcelas, grupo_parcelamento=grupo_id
                    )
            else:
                status_pagamento = 'PENDENTE' if venda.forma_pagamento == 'BOLETO' else 'PAGO'
                data_pagamento = timezone.now().date() if status_pagamento == 'PAGO' else None
                data_venc = _get_smart_due_date(0, dia_venc_contrato) if vincular_contrato and dia_venc_contrato and venda.forma_pagamento == 'BOLETO' else timezone.now().date()
                LancamentoFinanceiro.objects.create(
                    empresa=venda.empresa, cliente=venda.cliente,
                    descricao=f"Venda #{venda.id} - Pagamento Único",
                    valor=saldo_devedor, tipo_lancamento='ENTRADA', categoria='VENDA',
                    data_vencimento=data_venc, data_pagamento=data_pagamento,
                    status=status_pagamento, parcela_atual=1, total_parcelas=1
                )
    return venda
