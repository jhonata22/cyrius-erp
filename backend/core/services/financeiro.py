# backend/core/services/financeiro.py
from django.db.models import Sum, Q
from django.utils import timezone
import datetime
import calendar
from django.apps import apps

def mes_esta_fechado(data):
    Fechamento = apps.get_model('core', 'FechamentoFinanceiro')
    return Fechamento.objects.filter(ano=data.year, mes=data.month).exists()

def calcular_estatisticas_financeiras(mes=None, ano=None):
    """
    Unifica o cálculo de estatísticas para o dashboard e para o mensal.
    """
    Lancamento = apps.get_model('core', 'LancamentoFinanceiro')
    hoje = timezone.now().date()
    
    qs = Lancamento.objects.all()
    if mes and ano:
        qs = qs.filter(data_vencimento__month=mes, data_vencimento__year=ano)

    stats = qs.aggregate(
        receita_real=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO')),
        despesa_real=Sum('valor', filter=Q(tipo_lancamento='SAIDA', status='PAGO')),
        inadimplencia=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PENDENTE', data_vencimento__lt=hoje)),
        vendas_hardware=Sum('valor', filter=Q(categoria='VENDA', status='PAGO'))
    )

    receita = stats['receita_real'] or 0
    despesa = stats['despesa_real'] or 0

    return {
        "receitaTotal": float(receita),
        "despesaTotal": float(despesa),
        "saldo": float(receita - despesa),
        "inadimplencia": float(stats['inadimplencia'] or 0),
        "vendasHardware": float(stats['vendas_hardware'] or 0),
    }

def gerar_faturas_mensalidade(usuario_executou):
    """
    Lógica de geração de mensalidades movida da View para o Service.
    """
    Cliente = apps.get_model('core', 'Cliente')
    Lancamento = apps.get_model('core', 'LancamentoFinanceiro')
    
    agora = timezone.now()
    mes, ano = agora.month, agora.year
    clientes = Cliente.objects.filter(ativo=True, tipo_cliente='CONTRATO', valor_contrato_mensal__gt=0)
    
    gerados = 0
    for cliente in clientes:
        if not Lancamento.objects.filter(cliente=cliente, categoria='CONTRATO', 
                                         data_vencimento__month=mes, data_vencimento__year=ano).exists():
            try:
                # Cálculo de vencimento
                ultimo_dia = calendar.monthrange(ano, mes)[1]
                dia = min(cliente.dia_vencimento, ultimo_dia)
                vencimento = datetime.date(ano, mes, dia)

                Lancamento.objects.create(
                    cliente=cliente,
                    descricao=f"Mensalidade - {mes:02d}/{ano}",
                    valor=cliente.valor_contrato_mensal,
                    tipo_lancamento='ENTRADA',
                    categoria='CONTRATO',
                    data_vencimento=vencimento
                )
                gerados += 1
            except Exception: continue
    return gerados