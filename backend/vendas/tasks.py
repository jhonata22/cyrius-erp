from celery import shared_task
from django.utils import timezone
from .models import Venda

@shared_task
def verificar_orcamentos_vencidos():
    """
    Verifica e atualiza orçamentos de venda que expiraram.
    """
    hoje = timezone.now().date()
    
    # Busca orçamentos com data de validade anterior a hoje
    orcamentos_vencidos = Venda.objects.filter(
        status='ORCAMENTO',
        validade_orcamento__lt=hoje
    )
    
    # Conta quantos são antes de atualizar
    num_vencidos = orcamentos_vencidos.count()
    
    if num_vencidos > 0:
        # Atualiza o status de todos os orçamentos vencidos de uma vez
        orcamentos_vencidos.update(status='VENCIDO')
        log_message = f"{num_vencidos} orçamento(s) de venda foram marcados como 'VENCIDO'."
    else:
        log_message = "Nenhum orçamento de venda vencido encontrado."
        
    print(log_message)
    return log_message
