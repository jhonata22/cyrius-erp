from django.db import transaction
from rest_framework.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
import uuid

from estoque.models import MovimentacaoEstoque, Produto
from financeiro.models import LancamentoFinanceiro
from .models import Venda

def processar_venda(venda_data):
    with transaction.atomic():
        produto_id = venda_data['produto'].id
        quantidade_vendida = Decimal(venda_data['quantidade'])

        # 1. Lock e busca o produto
        produto = Produto.objects.select_for_update().get(pk=produto_id)

        # 2. Validação de estoque
        if produto.estoque_atual < quantidade_vendida:
            raise ValidationError(f"Estoque insuficiente para o produto {produto.nome}. Disponível: {produto.estoque_atual}")

        # 3. Dedução do estoque
        produto.estoque_atual -= quantidade_vendida
        produto.save()

        # 4. Criação da Venda
        venda = Venda.objects.create(**venda_data)

        # 5. Criação da Movimentação de Estoque (log)
        MovimentacaoEstoque.objects.create(
            empresa=venda.empresa,
            produto=venda.produto,
            quantidade=venda.quantidade,
            tipo_movimento='SAIDA',
            observacao=f"Venda para {venda.cliente}"
        )

        # 6. Lógica de Geração de Lançamento Financeiro com Parcelas
        parcelas = venda.parcelas
        valor_total = venda.valor_total

        if parcelas > 1:
            valor_parcela = round(valor_total / parcelas, 2)
            grupo_id = uuid.uuid4()
            for i in range(parcelas):
                data_venc = timezone.now().date() + timedelta(days=30 * (i + 1))
                
                if i == parcelas - 1:
                    valor_parcela = valor_total - (valor_parcela * (parcelas - 1))
                
                LancamentoFinanceiro.objects.create(
                    empresa=venda.empresa,
                    cliente=venda.cliente,
                    descricao=f"Venda #{venda.id} - Parcela {i + 1}/{parcelas} ({venda.produto.nome})",
                    valor=valor_parcela,
                    tipo_lancamento='ENTRADA',
                    categoria='VENDA',
                    data_vencimento=data_venc,
                    parcela_atual=i + 1,
                    total_parcelas=parcelas,
                    grupo_parcelamento=grupo_id
                )
        else:
            LancamentoFinanceiro.objects.create(
                empresa=venda.empresa,
                cliente=venda.cliente,
                descricao=f"Venda #{venda.id} - Pagamento Único ({venda.produto.nome})",
                valor=valor_total,
                tipo_lancamento='ENTRADA',
                categoria='VENDA',
                data_vencimento=venda.data_venda,
                parcela_atual=1,
                total_parcelas=1
            )
        
        return venda
