from django.db import transaction
from django.utils import timezone
from core.models import MovimentacaoEstoque, LancamentoFinanceiro

def processar_movimentacao_estoque(produto, quantidade, tipo_movimento, usuario, 
                                   cliente=None, fornecedor=None, preco_unitario=0, 
                                   numero_serial=None, arquivo=None,
                                   gerar_financeiro=True): # <--- 1. NOVO PARÂMETRO (Default True para não quebrar o resto)
    
    # LOG DE ENTRADA
    print(f"\n[DEBUG ESTOQUE] Iniciando: {tipo_movimento} | Prod: {produto.nome}")
    print(f"[DEBUG ESTOQUE] Fornecedor: {fornecedor} | Cliente: {cliente} | Gerar Financeiro: {gerar_financeiro}")

    with transaction.atomic():
        # 1. Cria a movimentação (Sempre acontece, pois é físico)
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

        # 2. Cálculos
        qtd = float(quantidade or 0)
        preco = float(preco_unitario or 0)
        valor_total = qtd * preco
        print(f"[DEBUG ESTOQUE] Valor Total calculado: {valor_total}")

        # 3. BLOCO DE CONTROLE FINANCEIRO
        # Só entra aqui se o parâmetro for True (Venda Direta/Compra). 
        # Se vier da OS (False), ele pula e não duplica.
        if gerar_financeiro: 
            
            # LÓGICA DE VENDA (SAÍDA)
            if tipo_movimento == 'SAIDA' and cliente and valor_total > 0:
                print("[DEBUG ESTOQUE] Criando ENTRADA financeira (Venda)...")
                LancamentoFinanceiro.objects.create(
                    cliente=cliente,
                    descricao=f"Venda: {produto.nome} (Qtd: {quantidade})",
                    valor=valor_total,
                    tipo_lancamento='ENTRADA',
                    categoria='VENDA',
                    status='PENDENTE',
                    data_vencimento=timezone.now().date()
                )

            # LÓGICA DE COMPRA (ENTRADA)
            elif tipo_movimento == 'ENTRADA' and fornecedor and valor_total > 0:
                print("[DEBUG ESTOQUE] Criando SAÍDA financeira (Compra)...")
                LancamentoFinanceiro.objects.create(
                    fornecedor=fornecedor,
                    descricao=f"Compra Estoque: {produto.nome}",
                    valor=valor_total,
                    tipo_lancamento='SAIDA',
                    categoria='COMPRA',
                    status='PENDENTE',
                    data_vencimento=timezone.now().date()
                )
            else:
                print("[DEBUG ESTOQUE] Nenhuma regra financeira aplicada (Condições não atendidas).")
                if tipo_movimento == 'ENTRADA' and not fornecedor:
                    print("[DEBUG ESTOQUE] MOTIVO: Tipo é ENTRADA mas o objeto Fornecedor é Nulo.")
                if valor_total <= 0:
                    print("[DEBUG ESTOQUE] MOTIVO: Valor total é zero ou negativo.")
        
        else:
            print("[DEBUG ESTOQUE] Financeiro PULADO (gerar_financeiro=False).")

    return movimentacao