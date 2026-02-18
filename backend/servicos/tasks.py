from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from vendas.models import Venda
from clientes.models import Cliente
from chamados.models import Chamado
from .models import Notificacao
from equipe.models import Equipe
from .signals import send_ws_notification

@shared_task
def verificar_orcamentos_vencendo():
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)
    
    orcamentos = Venda.objects.filter(
        status='ORCAMENTO',
        validade_orcamento__in=[today, tomorrow]
    )
    
    recipients = Equipe.objects.filter(
        cargo__in=[Equipe.Cargo.GESTOR, Equipe.Cargo.SOCIO],
        usuario__isnull=False
    )
    
    for orcamento in orcamentos:
        titulo = "Orçamento Vencendo"
        mensagem = f"O orçamento #{orcamento.id} para {orcamento.cliente} vence em {orcamento.validade_orcamento.strftime('%d/%m/%Y')}."
        
        for member in recipients:
            notificacao = Notificacao.objects.create(
                destinatario=member.usuario,
                titulo=titulo,
                mensagem=mensagem,
                link=f"/vendas/{orcamento.id}" # Ajuste o link conforme sua estrutura de URL
            )
            send_ws_notification(member.usuario.id, notificacao)

@shared_task
def verificar_clientes_inativos():
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    active_clients_ids = Chamado.objects.filter(
        created_at__gte=thirty_days_ago
    ).values_list('cliente_id', flat=True).distinct()
    
    inactive_clients = Cliente.objects.exclude(id__in=active_clients_ids)
    
    recipients = Equipe.objects.filter(
        cargo__in=[Equipe.Cargo.GESTOR, Equipe.Cargo.SOCIO],
        usuario__isnull=False
    )
    
    for cliente in inactive_clients:
        titulo = "Cliente Inativo (Risco de Churn)"
        mensagem = f"O cliente {cliente} não abre um chamado há mais de 30 dias."
        
        for member in recipients:
            # Evitar duplicar a notificação de churn para o mesmo cliente
            if not Notificacao.objects.filter(titulo=titulo, mensagem=mensagem, destinatario=member.usuario).exists():
                notificacao = Notificacao.objects.create(
                    destinatario=member.usuario,
                    titulo=titulo,
                    mensagem=mensagem,
                    tipo='CHURN',
                    link=f"/clientes/{cliente.id}" # Ajuste o link
                )
                send_ws_notification(member.usuario.id, notificacao)

@shared_task
def verificar_visitas_proximas():
    now = timezone.now()
    start_window = now + timedelta(hours=1, minutes=30)
    end_window = now + timedelta(hours=2)
    
    chamados_com_visita = Chamado.objects.filter(
        status='AGENDADO',
        data_agendamento__gte=start_window,
        data_agendamento__lte=end_window,
        tecnico__isnull=False,
        tecnico__usuario__isnull=False
    )
    
    for chamado in chamados_com_visita:
        tecnico_user = chamado.tecnico.usuario
        titulo = "Alerta de Visita Técnica"
        mensagem = f"Visita para o cliente {chamado.cliente} agendada para as {chamado.data_agendamento.strftime('%H:%M')}."
        
        notificacao = Notificacao.objects.create(
            destinatario=tecnico_user,
            titulo=titulo,
            mensagem=mensagem,
            tipo='VISITA',
            link=f"/chamados/{chamado.id}"
        )
        send_ws_notification(tecnico_user.id, notificacao)
