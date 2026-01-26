from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.apps import apps
import datetime
import calendar
from .models import LancamentoFinanceiro

def calcular_estatisticas_financeiras(mes=None, ano=None):
    # Importação Dinâmica para evitar Circular Import
    Chamado = apps.get_model('chamados', 'Chamado')
    Cliente = apps.get_model('clientes', 'Cliente')
    
    hoje = timezone.now().date()
    
    # Se não passar mês/ano, usa o atual
    if not mes or not ano:
        mes = hoje.month
        ano = hoje.year
    
    mes = int(mes)
    ano = int(ano)

    # ==========================================================
    # 1. SALDO GLOBAL (ACUMULADO DESDE O INÍCIO DOS TEMPOS)
    # ==========================================================
    # Só conta o que foi efetivamente PAGO
    global_entradas = LancamentoFinanceiro.objects.filter(tipo_lancamento='ENTRADA', status='PAGO').aggregate(t=Sum('valor'))['t'] or 0
    global_saidas = LancamentoFinanceiro.objects.filter(tipo_lancamento='SAIDA', status='PAGO').aggregate(t=Sum('valor'))['t'] or 0
    saldo_acumulado = float(global_entradas) - float(global_saidas)

    # ==========================================================
    # 2. ESTATÍSTICAS DO MÊS (REGIME DE CAIXA - SÓ PAGOS)
    # ==========================================================
    filtro_mes = Q(data_vencimento__month=mes, data_vencimento__year=ano)
    
    # QuerySet base do mês
    qs_mes = LancamentoFinanceiro.objects.filter(filtro_mes)
    
    # Aqui aplicamos o filtro status='PAGO' para os cards do Dashboard
    stats_fin = qs_mes.filter(status='PAGO').aggregate(
        receita_periodo=Sum('valor', filter=Q(tipo_lancamento='ENTRADA')), 
        despesa_periodo=Sum('valor', filter=Q(tipo_lancamento='SAIDA')),
        
        # Breakdown Gráfico (Também considerando apenas o que foi pago)
        receita_contrato=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', categoria='CONTRATO')),
        receita_avulsa=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', categoria='SERVICO')),
        receita_hardware=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', categoria='VENDA')),
    )

    # Inadimplência é o contrário: olha o que está ATRASADO no mês
    inadimplencia = qs_mes.filter(tipo_lancamento='ENTRADA', status='ATRASADO').aggregate(t=Sum('valor'))['t'] or 0

    receita_periodo = float(stats_fin['receita_periodo'] or 0)
    despesa_periodo = float(stats_fin['despesa_periodo'] or 0)
    resultado_periodo = receita_periodo - despesa_periodo

    # ==========================================================
    # 3. DADOS OPERACIONAIS (INTEGRAÇÃO COM OUTROS APPS)
    # ==========================================================
    filtro_ops = Q(created_at__month=mes, created_at__year=ano)

    # Custo de Transporte (Vem dos Chamados)
    custo_transporte = Chamado.objects.filter(filtro_ops).aggregate(
        total=Sum('custo_transporte')
    )['total'] or 0

    # Contratos Ativos (Vem dos Clientes)
    contratos_ativos = Cliente.objects.filter(tipo_cliente='CONTRATO', ativo=True).count()

    # Ranking de Visitas (Quem consumiu mais visitas no mês)
    ranking_visitas = (
        Chamado.objects.filter(filtro_ops, tipo_atendimento='VISITA')
        .values('cliente__razao_social')
        .annotate(qtd=Count('id'), custo=Sum('custo_transporte'))
        .order_by('-qtd')[:5]
    )

    # Monta o objeto final para o React
    return {
        "saldo": saldo_acumulado,
        "resultadoPeriodo": resultado_periodo,
        "receitaPeriodo": receita_periodo,
        "despesaPeriodo": despesa_periodo,
        "inadimplencia": float(inadimplencia),
        "contratosAtivos": contratos_ativos,
        "custoTransporte": float(custo_transporte),
        "graficoReceita": [
            {"name": "Contratos", "value": float(stats_fin['receita_contrato'] or 0)},
            {"name": "Avulsos", "value": float(stats_fin['receita_avulsa'] or 0)},
            {"name": "Hardware", "value": float(stats_fin['receita_hardware'] or 0)},
        ],
        "rankingVisitas": list(ranking_visitas),
        "mes": mes,
        "ano": ano
    }

def gerar_faturas_mensalidade(usuario_executou):
    Cliente = apps.get_model('clientes', 'Cliente')
    
    agora = timezone.now()
    mes, ano = agora.month, agora.year
    clientes = Cliente.objects.filter(ativo=True, tipo_cliente='CONTRATO', valor_contrato_mensal__gt=0)
    
    gerados = 0
    erros = []
    
    for cliente in clientes:
        # Verifica duplicidade
        existe = LancamentoFinanceiro.objects.filter(
            cliente_id=cliente.id, 
            categoria='CONTRATO', 
            data_vencimento__month=mes, 
            data_vencimento__year=ano
        ).exists()
        
        if existe: continue
        
        try:
            ultimo_dia_mes = calendar.monthrange(ano, mes)[1]
            dia_vencimento = min(cliente.dia_vencimento, ultimo_dia_mes)
            vencimento = datetime.date(ano, mes, dia_vencimento)
            
            LancamentoFinanceiro.objects.create(
                cliente_id=cliente.id,
                descricao=f"Mensalidade Contrato - {mes:02d}/{ano}",
                valor=cliente.valor_contrato_mensal,
                tipo_lancamento='ENTRADA',
                categoria='CONTRATO',
                status='PENDENTE',
                data_vencimento=vencimento
            )
            gerados += 1
        except Exception as e:
            erros.append(f"{cliente.razao_social}: {str(e)}")
            
    return {"faturas_geradas": gerados, "erros": erros}