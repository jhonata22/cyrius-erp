from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.apps import apps
import datetime
import calendar
from .models import LancamentoFinanceiro

def calcular_estatisticas_financeiras(mes=None, ano=None):
    # Importação Dinâmica
    Chamado = apps.get_model('chamados', 'Chamado')
    Cliente = apps.get_model('clientes', 'Cliente')
    
    hoje = timezone.now().date()
    
    if not mes or not ano:
        mes = hoje.month
        ano = hoje.year
    
    mes = int(mes)
    ano = int(ano)

    # ==========================================================
    # 1. SALDO GLOBAL
    # ==========================================================
    global_entradas = LancamentoFinanceiro.objects.filter(tipo_lancamento='ENTRADA', status='PAGO').aggregate(t=Sum('valor'))['t'] or 0
    global_saidas = LancamentoFinanceiro.objects.filter(tipo_lancamento='SAIDA', status='PAGO').aggregate(t=Sum('valor'))['t'] or 0
    saldo_acumulado = float(global_entradas) - float(global_saidas)

    # ==========================================================
    # 2. ESTATÍSTICAS DO MÊS (REGIME DE CAIXA)
    # ==========================================================
    filtro_mes = Q(data_vencimento__month=mes, data_vencimento__year=ano)
    qs_mes = LancamentoFinanceiro.objects.filter(filtro_mes)
    
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
    # 3. DADOS OPERACIONAIS (CORRIGIDO PARA O DASHBOARD)
    # ==========================================================
    
    # [CORREÇÃO 1] Filtra chamados FINALIZADOS fechados no mês selecionado
    # Isso resolve o problema de aparecer valor 0.00 se o chamado foi aberto antes
    qs_chamados_mes = Chamado.objects.filter(
        data_fechamento__month=mes, 
        data_fechamento__year=ano,
        status='FINALIZADO' 
    )

    # Custo de Transporte (Soma total dos chamados fechados no mês)
    custo_transporte = qs_chamados_mes.aggregate(
        total=Sum('custo_transporte')
    )['total'] or 0

    # Contratos Ativos
    contratos_ativos = Cliente.objects.filter(tipo_cliente='CONTRATO', ativo=True).count()

    # [CORREÇÃO 2] Ranking de Visitas - Busca ID e depois resolve o Nome
    raw_ranking = (
        qs_chamados_mes.filter(tipo_atendimento='VISITA')
        .values('cliente') # Agrupa por ID
        .annotate(qtd=Count('id'), custo=Sum('custo_transporte'))
        .order_by('-qtd')[:5]
    )

    # Processa a lista para trocar o ID pelo Nome Fantasia (Apelido)
    lista_ranking_processada = []
    for item in raw_ranking:
        cliente_id = item['cliente']
        nome_exibicao = "Cliente Desconhecido"
        
        if cliente_id:
            try:
                cli = Cliente.objects.get(id=cliente_id)
                # Prioriza Nome Fantasia (nome), se não tiver, vai Razão Social
                nome_exibicao = cli.nome if cli.nome else cli.razao_social
            except:
                pass
        
        lista_ranking_processada.append({
            "nome_cliente": nome_exibicao, # Enviamos o nome correto para o Front
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
        "rankingVisitas": lista_ranking_processada, # Lista corrigida
        "mes": mes,
        "ano": ano
    }

def gerar_faturas_mensalidade(usuario_executou):
    # ... (Mantenha o código original desta função inalterado) ...
    Cliente = apps.get_model('clientes', 'Cliente')
    agora = timezone.now()
    mes, ano = agora.month, agora.year
    clientes = Cliente.objects.filter(ativo=True, tipo_cliente='CONTRATO', valor_contrato_mensal__gt=0)
    gerados = 0
    erros = []
    for cliente in clientes:
        existe = LancamentoFinanceiro.objects.filter(
            cliente_id=cliente.id, categoria='CONTRATO', 
            data_vencimento__month=mes, data_vencimento__year=ano
        ).exists()
        if existe: continue
        try:
            ultimo_dia_mes = calendar.monthrange(ano, mes)[1]
            dia_vencimento = min(cliente.dia_vencimento, ultimo_dia_mes)
            vencimento = datetime.date(ano, mes, dia_vencimento)
            LancamentoFinanceiro.objects.create(
                cliente_id=cliente.id, descricao=f"Mensalidade Contrato - {mes:02d}/{ano}",
                valor=cliente.valor_contrato_mensal, tipo_lancamento='ENTRADA',
                categoria='CONTRATO', status='PENDENTE', data_vencimento=vencimento
            )
            gerados += 1
        except Exception as e:
            erros.append(f"{cliente.razao_social}: {str(e)}")
    return {"faturas_geradas": gerados, "erros": erros}