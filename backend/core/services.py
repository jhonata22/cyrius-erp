import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notificacao

logger = logging.getLogger(__name__)

def criar_notificacao(destinatario, titulo, mensagem, tipo, link=None):
    """
    Cria uma notificação no banco de dados e a envia via WebSocket.
    """
    try:
        # 1. Create in Database
        notificacao = Notificacao.objects.create(
            destinatario=destinatario,
            titulo=titulo,
            mensagem=mensagem,
            tipo=tipo,
            lida=False,
            link=link
        )

        # 2. Broadcast via WebSocket
        channel_layer = get_channel_layer()
        room_group_name = f'user_{destinatario.id}'
        
        message_payload = {
            "id": notificacao.id,
            "titulo": notificacao.titulo,
            "mensagem": notificacao.mensagem,
            "lida": notificacao.lida,
            "tipo": notificacao.tipo,
            "data_criacao": notificacao.data_criacao.isoformat(),
            "link": notificacao.link
        }
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                "type": "send_notification",
                "message": message_payload
            }
        )
        logger.info(f"Notificação enviada com sucesso para {room_group_name}")

    except Exception as e:
        logger.error(f"Falha ao criar/enviar notificação para user {destinatario.id}: {e}", exc_info=True)