from django.contrib.auth.models import User
from django.db import transaction
from .models import Equipe

def criar_membro_equipe(nome, cargo, custo_hora, foto=None):
    """
    Cria um usuário no Django e o vincula a um novo membro da equipe.
    """
    with transaction.atomic():
        # Gera username simples: nome.sobrenome
        username = nome.lower().replace(" ", ".")
        
        # Garante username único
        original_username = username
        contador = 1
        while User.objects.filter(username=username).exists():
            username = f"{original_username}{contador}"
            contador += 1

        # Cria o usuário com uma senha padrão (Alterar em produção ou forçar troca)
        # Se quiser algo mais seguro, use secrets.token_urlsafe(8)
        user = User.objects.create_user(
            username=username,
            password='123456'
        )

        # Cria o membro da equipe vinculado ao usuário
        return Equipe.objects.create(
            usuario=user,
            nome=nome,
            cargo=cargo,
            custo_hora=custo_hora,
            foto=foto
        )