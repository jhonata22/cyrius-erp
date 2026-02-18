from django.db.models.signals import post_save
from django.dispatch import receiver
from chamados.models import Chamado
from .models import OrdemServico, Notificacao
from equipe.models import Equipe
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

def send_ws_notification(user_id, notificacao):
    """Helper to send WebSocket notification."""
    channel_layer = get_channel_layer()
    message_payload = {
        "id": notificacao.id,
        "titulo": notificacao.titulo,
        "mensagem": notificacao.mensagem,
        "lida": False,
        "tipo": notificacao.tipo,
        "data_criacao": notificacao.data_criacao.isoformat()
    }
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "send_notification",
            "message": message_payload
        }
    )

from django.contrib.auth import get_user_model

@receiver(post_save, sender=Chamado)
def notificacao_chamado(sender, instance, created, **kwargs):
    """Notifies the correct parties when a Chamado is created or finalized."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        recipients = set()
        should_notify = False
        titulo = ""
        mensagem = ""

        # 1. Base Recipients (Gestores)
        gestores = User.objects.filter(is_active=True, equipe__cargo__in=['GESTOR', 'SOCIO'])
        for g in gestores:
            recipients.add(g)

        # 2. Add Technician (BULLETPROOF FIX)
        if getattr(instance, 'tecnico', None):
            tecnico_user = None
            # Safely try common relation names
            if hasattr(instance.tecnico, 'usuario'):
                tecnico_user = instance.tecnico.usuario
            elif hasattr(instance.tecnico, 'user'):
                tecnico_user = instance.tecnico.user
                
            if tecnico_user and getattr(tecnico_user, 'is_active', True):
                logger.info(f"✅ Técnico encontrado! Adicionando User ID {tecnico_user.id} aos destinatários.")
                recipients.add(tecnico_user)
            else:
                logger.warning(f"⚠️ O técnico {instance.tecnico} não possui uma conta de Usuário (User) vinculada ou está inativo!")

        # 3. Determine Messages
        if created:
            should_notify = True
            titulo = "Novo Chamado Aberto"
            mensagem = f"Chamado #{instance.protocolo} aberto para o cliente {getattr(instance.cliente, 'nome', instance.cliente)}."
        elif instance.status in ['CONCLUIDO', 'FINALIZADO', 'RESOLVIDO']:
            # Only notify if not already notified
            if not Notificacao.objects.filter(link=f"/chamados/{instance.id}", titulo="Chamado Finalizado").exists():
                should_notify = True
                titulo = "Chamado Finalizado"
                nome_tecnico = instance.tecnico.nome if getattr(instance, 'tecnico', None) else "um técnico"
                mensagem = f"O chamado #{instance.protocolo} foi finalizado pelo técnico {nome_tecnico}."

        if not should_notify:
            return

        channel_layer = get_channel_layer()
        for user in recipients:
            # 1. Create in Database
            notificacao = Notificacao.objects.create(
                destinatario=user,
                titulo=titulo,
                mensagem=mensagem,
                tipo='SISTEMA',
                lida=False,
                link=f"/chamados/{instance.id}"
            )

            # 2. Broadcast via WebSocket
            room_group_name = f'user_{user.id}'
            
            try:
                message_payload = {
                    "id": notificacao.id,
                    "titulo": notificacao.titulo,
                    "mensagem": notificacao.mensagem,
                    "lida": notificacao.lida,
                    "tipo": notificacao.tipo,
                    "data_criacao": notificacao.data_criacao.isoformat()
                }
                async_to_sync(channel_layer.group_send)(
                    room_group_name,
                    {
                        "type": "send_notification",
                        "message": message_payload
                    }
                )
                logger.info(f"✅ WebSocket push enviado com sucesso para {room_group_name}")
            except Exception as ws_err:
                logger.error(f"❌ Falha ao enviar WS para {room_group_name}: {ws_err}")

    except Exception as e:
        logger.error(f"Error processing Chamado notification for {instance.id}: {e}", exc_info=True)


@receiver(post_save, sender=OrdemServico)
def notificacao_ordem_servico(sender, instance, created, **kwargs):
    try:
        if created:
            titulo = "Nova Ordem de Serviço Criada"
            mensagem = f"OS #{instance.id} criada para o cliente {instance.cliente}."
            
            if instance.tecnico_responsavel and instance.tecnico_responsavel.usuario:
                notificacao = Notificacao.objects.create(
                    destinatario=instance.tecnico_responsavel.usuario,
                    titulo=titulo,
                    mensagem=mensagem,
                    link=f"/ordens-servico/{instance.id}"
                )
                send_ws_notification(instance.tecnico_responsavel.usuario.id, notificacao)

        elif instance.status in [OrdemServico.Status.CONCLUIDO, OrdemServico.Status.FINALIZADO]:
            titulo = f"Ordem de Serviço {instance.status.capitalize()}"
            mensagem = f"A OS #{instance.id} foi {instance.status.lower()}."

            solicitante_user = getattr(instance.solicitante, 'usuario', None) if instance.solicitante else None
            if solicitante_user:
                notificacao = Notificacao.objects.create(
                    destinatario=solicitante_user,
                    titulo=titulo,
                    mensagem=mensagem,
                    link=f"/ordens-servico/{instance.id}"
                )
                send_ws_notification(solicitante_user.id, notificacao)
                
    except Exception as e:
        logger.error(f"Error sending WebSocket notification for OrdemServico {instance.id}: {e}", exc_info=True)

