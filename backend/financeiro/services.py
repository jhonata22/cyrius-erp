from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.apps import apps
import datetime
import calendar
from .models import LancamentoFinanceiro

def calcular_estatisticas_financeiras(mes=None, ano=None, empresa_id=None):
    Chamado = apps.get_model('chamados', 'Chamado') # Lazy load
    Cliente = apps.get_model('clientes', 'Cliente')
    
    hoje = timezone.now().date()
    
    if not mes or not ano:
        mes = hoje.month
        ano = hoje.year
    
    mes = int(mes)
    ano = int(ano)

    # === FILTRO BASE (FINANCEIRO) ===
    filtros_fin = {}
    if empresa_id:
        filtros_fin['empresa_id'] = empresa_id

    # ==========================================================
    # 1. SALDO GLOBAL (Respeitando a empresa)
    # ==========================================================
    global_entradas = LancamentoFinanceiro.objects.filter(
        tipo_lancamento='ENTRADA', status='PAGO', **filtros_fin
    ).aggregate(t=Sum('valor'))['t'] or 0
    
    global_saidas = LancamentoFinanceiro.objects.filter(
        tipo_lancamento='SAIDA', status='PAGO', **filtros_fin
    ).aggregate(t=Sum('valor'))['t'] or 0
    
    saldo_acumulado = float(global_entradas) - float(global_saidas)

    # ==========================================================
    # 2. ESTATÍSTICAS DO MÊS
    # ==========================================================
    qs_mes = LancamentoFinanceiro.objects.filter(
        data_vencimento__month=mes, 
        data_vencimento__year=ano,
        **filtros_fin
    )
    
    stats_fin = qs_mes.filter(status='PAGO').aggregate(
        receita_periodo=Sum('valor', filter=Q(tipo_lancamento='ENTRADA')), 
        despesa_periodo=Sum('valor', filter=Q(tipo_lancamento='SAIDA')),
        receita_contrato=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', categoria='CONTRATO')),
        receita_avulsa=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', categoria='SERVICO')),
        receita_hardware=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', categoria='VENDA')),
    )

    inadimplencia = qs_mes.filter(tipo_lancamento='ENTRADA', status='ATRASADO').aggregate(t=Sum('valor'))['t'] or 0

    receita_periodo = float(stats_fin['receita_periodo'] or 0)
    despesa_periodo = float(stats_fin['despesa_periodo'] or 0)
    resultado_periodo = receita_periodo - despesa_periodo

    # ==========================================================
    # 3. DADOS OPERACIONAIS (CHAMADOS)
    # ==========================================================
    # IMPORTANTE: Filtrar chamados pela empresa também
    filtros_chamado = {'status': 'FINALIZADO'}
    if empresa_id:
        filtros_chamado['empresa_id'] = empresa_id

    qs_chamados_mes = Chamado.objects.filter(
        data_fechamento__month=mes, 
        data_fechamento__year=ano,
        **filtros_chamado
    )

    custo_transporte = qs_chamados_mes.aggregate(total=Sum('custo_transporte'))['total'] or 0
    
    # Contratos Ativos (Se o cliente tiver vínculo com empresa no futuro, filtrar aqui tb)
    contratos_ativos = Cliente.objects.filter(tipo_cliente='CONTRATO', ativo=True).count()

    raw_ranking = (
        qs_chamados_mes.filter(tipo_atendimento='VISITA')
        .values('cliente')
        .annotate(qtd=Count('id'), custo=Sum('custo_transporte'))
        .order_by('-qtd')[:5]
    )

    lista_ranking_processada = []
    for item in raw_ranking:
        cliente_id = item['cliente']
        nome_exibicao = "Cliente Desconhecido"
        if cliente_id:
            try:
                cli = Cliente.objects.get(id=cliente_id)
                nome_exibicao = cli.nome if cli.nome else cli.razao_social
            except: pass
        
        lista_ranking_processada.append({
            "nome_cliente": nome_exibicao, 
            "qtd": item['qtd'],
            "custo": float(item['custo'] or 0)
        })

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
        "rankingVisitas": lista_ranking_processada,
        "mes": mes,
        "ano": ano
    }

def gerar_faturas_mensalidade(usuario_executou, empresa_id=None):
    """
    Gera faturas. Se empresa_id for passado, gera vinculando a essa empresa.
    """
    Cliente = apps.get_model('clientes', 'Cliente')
    agora = timezone.now()
    mes, ano = agora.month, agora.year
    clientes = Cliente.objects.filter(ativo=True, tipo_cliente='CONTRATO', valor_contrato_mensal__gt=0)
    
    gerados = 0
    erros = []
    
    for cliente in clientes:
        # Verifica se já existe fatura deste cliente, neste mês, PARA ESTA EMPRESA (ou qualquer se None)
        filtro_duplicidade = {
            'cliente_id': cliente.id, 
            'categoria': 'CONTRATO',
            'data_vencimento__month': mes, 
            'data_vencimento__year': ano
        }
        if empresa_id:
            filtro_duplicidade['empresa_id'] = empresa_id
            
        existe = LancamentoFinanceiro.objects.filter(**filtro_duplicidade).exists()
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
                data_vencimento=vencimento,
                empresa_id=empresa_id # Vincula à empresa selecionada no painel
            )
            gerados += 1
        except Exception as e:
            erros.append(f"{cliente.razao_social}: {str(e)}")
            
    return {"faturas_geradas": gerados, "erros": erros}