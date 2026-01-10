from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import MovimentacaoEstoque, LancamentoFinanceiro, Chamado, ChamadoTecnico

@receiver(post_save, sender=MovimentacaoEstoque)
def gerar_financeiro_estoque(sender, instance, created, **kwargs):
    """
    Sempre que uma movimentação de estoque é criada:
    1. Se for SAIDA (Venda) para um Cliente -> Gera Receita (VENDA)
    2. Se for ENTRADA (Compra) com Fornecedor -> Gera Despesa (COMPRA)
    """
    # Só executa se for um registro novo (created=True) e tiver preço
    if created and instance.preco_unitario and instance.preco_unitario > 0:
        
        # CASO 1: VENDA DE PEÇA (SAIDA) -> Dinheiro Entrando
        if instance.tipo_movimento == 'SAIDA' and instance.cliente:
            valor_total = instance.quantidade * instance.preco_unitario
            
            LancamentoFinanceiro.objects.create(
                descricao=f"Venda Hardware: {instance.produto.nome} (Qtd: {instance.quantidade})",
                valor=valor_total,
                tipo_lancamento='ENTRADA', # Dinheiro entrando no caixa
                categoria='VENDA',         # Categoria correta
                status='PENDENTE',         # Fica pendente para dar baixa depois
                data_vencimento=timezone.now().date(), # Vence hoje
                cliente=instance.cliente,
            )

        # CASO 2: COMPRA DE PEÇA (ENTRADA) -> Dinheiro Saindo
        elif instance.tipo_movimento == 'ENTRADA' and instance.fornecedor:
            valor_total = instance.quantidade * instance.preco_unitario
            
            LancamentoFinanceiro.objects.create(
                descricao=f"Compra Estoque: {instance.produto.nome} - {instance.fornecedor.razao_social}",
                valor=valor_total,
                tipo_lancamento='SAIDA',   # Dinheiro saindo do caixa
                categoria='COMPRA',
                status='PENDENTE',
                data_vencimento=timezone.now().date(),
                # cliente fica null, pois é uma despesa com fornecedor
            )
@receiver(post_save, sender=Chamado)
def gerar_custo_chamado(sender, instance, created, **kwargs):
    """
    Quando um chamado é FINALIZADO:
    1. Calcula as horas trabalhadas de cada técnico.
    2. Multiplica pelo valor/hora do técnico.
    3. Gera um lançamento de SAÍDA (Custo Operacional) no financeiro.
    """
    if instance.status == 'FINALIZADO':
        # Verifica se já geramos custo para esse chamado para não duplicar
        descricao_base = f"Custo Operacional - Chamado #{instance.protocolo}"
        ja_existe = LancamentoFinanceiro.objects.filter(descricao__startswith=descricao_base).exists()
        
        if not ja_existe:
            # Busca os técnicos que trabalharam neste chamado
            tecnicos_envolvidos = ChamadoTecnico.objects.filter(chamado=instance)
            
            for tec_vinculo in tecnicos_envolvidos:
                tecnico = tec_vinculo.tecnico
                horas = tec_vinculo.horas_trabalhadas
                
                # Só gera se tiver horas apontadas e o técnico tiver custo configurado
                if horas > 0 and tecnico.custo_hora > 0:
                    custo_total = horas * tecnico.custo_hora
                    
                    LancamentoFinanceiro.objects.create(
                        descricao=f"{descricao_base} ({tecnico.nome})",
                        valor=custo_total,
                        tipo_lancamento='SAIDA', # É uma despesa para a empresa
                        categoria='CUSTO_TEC',   # Categoria para KPIs
                        status='PAGO',           # Consideramos pago pois é salário/hora
                        data_vencimento=timezone.now().date(),
                        data_pagamento=timezone.now().date(),
                        cliente=instance.cliente, # Vincula ao cliente para sabermos a rentabilidade dele
                        tecnico=tecnico
                    )