from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Chamado
from core.models import Notificacao # Need this for the check
from core.services import criar_notificacao
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Chamado)
def notificacao_chamado(sender, instance, created, **kwargs):
    """Notifies the correct parties when a Chamado is created or finalized."""
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

        # 2. Add Technician
        if getattr(instance, 'tecnico', None):
            tecnico_user = getattr(instance.tecnico, 'usuario', None)
            if tecnico_user and getattr(tecnico_user, 'is_active', True):
                recipients.add(tecnico_user)
            else:
                logger.warning(f"O técnico {instance.tecnico} não possui uma conta de Usuário (User) vinculada ou está inativo!")

        # 3. Determine Messages
        if created:
            should_notify = True
            titulo = "Novo Chamado Aberto"
            mensagem = f"Chamado #{instance.protocolo} aberto para o cliente {getattr(instance.cliente, 'nome', instance.cliente)}."
        elif instance.status in ['CONCLUIDO', 'FINALIZADO', 'RESOLVIDO']:
            if not Notificacao.objects.filter(link=f"/chamados/{instance.id}", titulo="Chamado Finalizado").exists():
                should_notify = True
                titulo = "Chamado Finalizado"
                nome_tecnico = instance.tecnico.nome if getattr(instance, 'tecnico', None) else "um técnico"
                mensagem = f"O chamado #{instance.protocolo} foi finalizado pelo técnico {nome_tecnico}."

        if not should_notify:
            return

        for user in recipients:
            criar_notificacao(
                destinatario=user,
                titulo=titulo,
                mensagem=mensagem,
                tipo='SISTEMA',
                link=f"/chamados/{instance.id}"
            )

    except Exception as e:
        logger.error(f"Error processing Chamado notification for {instance.id}: {e}", exc_info=True)