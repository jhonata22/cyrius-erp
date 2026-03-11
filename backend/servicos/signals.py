from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import OrdemServico
from core.services import criar_notificacao
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=OrdemServico)
def notificacao_ordem_servico(sender, instance, created, **kwargs):
    try:
        if created:
            titulo = "Nova Ordem de Serviço Criada"
            mensagem = f"OS #{instance.id} criada para o cliente {instance.cliente}."
            
            if instance.tecnico_responsavel and instance.tecnico_responsavel.usuario:
                criar_notificacao(
                    destinatario=instance.tecnico_responsavel.usuario,
                    titulo=titulo,
                    mensagem=mensagem,
                    tipo='SISTEMA',
                    link=f"/ordens-servico/{instance.id}"
                )

        elif instance.status in [OrdemServico.Status.CONCLUIDO, OrdemServico.Status.FINALIZADO]:
            titulo = f"Ordem de Serviço {instance.status.capitalize()}"
            mensagem = f"A OS #{instance.id} foi {instance.status.lower()}."

            solicitante_user = getattr(instance.solicitante, 'usuario', None) if instance.solicitante else None
            if solicitante_user:
                criar_notificacao(
                    destinatario=solicitante_user,
                    titulo=titulo,
                    mensagem=mensagem,
                    tipo='SISTEMA',
                    link=f"/ordens-servico/{instance.id}"
                )
                
    except Exception as e:
        logger.error(f"Error sending WebSocket notification for OrdemServico {instance.id}: {e}", exc_info=True)