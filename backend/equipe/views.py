from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from django.apps import apps

# Importando suas permissões (ajuste o caminho 'utils.permissions' se necessário)
from utils.permissions import IsFuncionario, IsOwnerOrGestor

from .models import Equipe
from .serializers import EquipeSerializer

class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.all()
    serializer_class = EquipeSerializer
    # IsFuncionario permite que qualquer funcionário veja a lista.
    # Se quiser que só Gestor edite outros, use IsOwnerOrGestor no get_permissions se necessário
    permission_classes = [IsFuncionario] 

    def perform_update(self, serializer):
        """
        Intercepta a atualização para aplicar a troca de senha
        """
        # 1. Salva os dados da tabela Equipe
        equipe = serializer.save()

        # 2. Verifica se veio senha no request
        novo_pass = self.request.data.get('password')
        
        # 3. Debug no terminal para você ver se está chegando
        print(f"DEBUG UPDATE: Editando {equipe.nome}. Senha enviada? {'SIM' if novo_pass else 'NÃO'}")

        if novo_pass:
            if equipe.usuario:
                user = equipe.usuario
                user.set_password(novo_pass)
                user.save()
                print(f"DEBUG: Senha alterada para usuário {user.username}")
            else:
                print("DEBUG ERRO: Tentativa de mudar senha, mas equipe.usuario é None!")

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsFuncionario])
    def me(self, request):
        """
        Endpoint /api/equipe/me/ para o usuário editar o próprio perfil
        """
        user = request.user
        try:
            membro = user.equipe
        except AttributeError:
            return Response({"erro": "Usuário logado sem perfil de equipe."}, status=403)

        if request.method == 'GET':
            hoje = timezone.now()
            Chamado = apps.get_model('chamados', 'Chamado')
            
            stats = Chamado.objects.filter(
                chamadotecnico__tecnico=membro,
                created_at__month=hoje.month
            ).aggregate(
                total=Count('id'),
                finalizados=Count('id', filter=Q(status='FINALIZADO'))
            )
            serializer = self.get_serializer(membro)
            data = serializer.data
            # FIX: Explicitly ensure usuario_id is in the payload
            if hasattr(membro, 'usuario') and membro.usuario:
                data['usuario_id'] = membro.usuario.id
            data['stats'] = stats
            return Response(data)

        elif request.method == 'PATCH':
            # Logica manual de senha para garantir
            novo_pass = request.data.get('password')
            if novo_pass:
                user.set_password(novo_pass)
                user.save()
                print(f"DEBUG ME: Senha alterada para {user.username}")
            
            serializer = self.get_serializer(membro, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)