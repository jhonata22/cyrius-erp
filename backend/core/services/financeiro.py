from core.models import FechamentoFinanceiro

def mes_esta_fechado(data):
    return FechamentoFinanceiro.objects.filter(
        ano=data.year,
        mes=data.month
    ).exists()
