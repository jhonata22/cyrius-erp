from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.apps import apps
import datetime
import calendar

def calcular_estatisticas_financeiras(mes=None, ano=None):
    Lancamento = apps.get_model('core', 'LancamentoFinanceiro')
    Chamado = apps.get_model('core', 'Chamado')
    Cliente = apps.get_model('core', 'Cliente')
    
    hoje = timezone.now().date()
    
    # --- 1. CÁLCULO DO SALDO GLOBAL (CAIXA REAL) ---
    # Isso soma TUDO o que já foi pago na história da empresa
    global_entradas = Lancamento.objects.filter(tipo_lancamento='ENTRADA', status='PAGO').aggregate(t=Sum('valor'))['t'] or 0
    global_saidas = Lancamento.objects.filter(tipo_lancamento='SAIDA', status='PAGO').aggregate(t=Sum('valor'))['t'] or 0
    saldo_acumulado = float(global_entradas) - float(global_saidas)

    # --- 2. FILTROS DE PERÍODO (Para Receita/Despesa do Mês) ---
    filtro_fin = Q()
    filtro_ops = Q()
    
    if mes and ano:
        filtro_fin = Q(data_vencimento__month=mes, data_vencimento__year=ano)
        filtro_ops = Q(created_at__month=mes, created_at__year=ano)

    # --- 3. ESTATÍSTICAS DO PERÍODO SELECIONADO ---
    qs_fin = Lancamento.objects.filter(filtro_fin)
    
    stats_fin = qs_fin.aggregate(
        receita_periodo=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO')),
        despesa_periodo=Sum('valor', filter=Q(tipo_lancamento='SAIDA', status='PAGO')),
        inadimplencia=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PENDENTE', data_vencimento__lt=hoje)),
        
        # Breakdown
        receita_contrato=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO', categoria='CONTRATO')),
        receita_avulsa=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO', categoria='SERVICO')),
        receita_hardware=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO', categoria='VENDA')),
    )

    receita_periodo = float(stats_fin['receita_periodo'] or 0)
    despesa_periodo = float(stats_fin['despesa_periodo'] or 0)
    resultado_periodo = receita_periodo - despesa_periodo # Lucro/Prejuízo do mês

    # --- 4. DADOS OPERACIONAIS ---
    custo_transporte = Chamado.objects.filter(filtro_ops).aggregate(
        total=Sum('custo_transporte')
    )['total'] or 0

    ranking_visitas = (
        Chamado.objects.filter(filtro_ops, tipo_atendimento='VISITA')
        .values('cliente__razao_social')
        .annotate(qtd=Count('id'), custo=Sum('custo_transporte'))
        .order_by('-qtd')[:5]
    )

    contratos_ativos = Cliente.objects.filter(tipo_cliente='CONTRATO', ativo=True).count()

    return {
        "kpis": {
            "saldoAcumulado": saldo_acumulado,     # CAIXA REAL (Não muda com o filtro)
            "resultadoPeriodo": resultado_periodo, # LUCRO DO MÊS (Muda com o filtro)
            "receitaPeriodo": receita_periodo,
            "despesaPeriodo": despesa_periodo,
            
            "inadimplencia": float(stats_fin['inadimplencia'] or 0),
            "contratosAtivos": contratos_ativos,
            "custoTransporte": float(custo_transporte),
        },
        "graficoReceita": [
            {"name": "Contratos", "value": float(stats_fin['receita_contrato'] or 0)},
            {"name": "Avulsos", "value": float(stats_fin['receita_avulsa'] or 0)},
            {"name": "Hardware", "value": float(stats_fin['receita_hardware'] or 0)},
        ],
        "rankingVisitas": list(ranking_visitas)
    }

# ... (Mantenha as outras funções auxiliares: gerar_faturas_mensalidade, mes_esta_fechado)
def gerar_faturas_mensalidade(usuario_executou):
    Cliente = apps.get_model('core', 'Cliente')
    Lancamento = apps.get_model('core', 'LancamentoFinanceiro')
    agora = timezone.now()
    mes, ano = agora.month, agora.year
    clientes = Cliente.objects.filter(ativo=True, tipo_cliente='CONTRATO', valor_contrato_mensal__gt=0)
    gerados = 0
    erros = []
    for cliente in clientes:
        existe = Lancamento.objects.filter(cliente=cliente, categoria='CONTRATO', data_vencimento__month=mes, data_vencimento__year=ano).exists()
        if existe: continue
        try:
            ultimo_dia_mes = calendar.monthrange(ano, mes)[1]
            dia_vencimento = min(cliente.dia_vencimento, ultimo_dia_mes)
            vencimento = datetime.date(ano, mes, dia_vencimento)
            Lancamento.objects.create(
                cliente=cliente,
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

def mes_esta_fechado(data):
    FechamentoFinanceiro = apps.get_model('core', 'FechamentoFinanceiro')
    return FechamentoFinanceiro.objects.filter(ano=data.year, mes=data.month).exists()