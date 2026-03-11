from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Empresa, Notificacao
from .serializers import EmpresaSerializer, NotificacaoSerializer
from equipe.permissions import IsSocio
from utils.permissions import IsFuncionario

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.filter(ativa=True).order_by('-eh_matriz', 'nome_fantasia')
    serializer_class = EmpresaSerializer
    pagination_class = None

    def get_permissions(self):
        """
        Instancia e retorna a lista de permissões que esta visualização requer.
        """
        if self.action == 'list':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsSocio]
        return [permission() for permission in permission_classes]

class NotificacaoViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacaoSerializer
    permission_classes = [IsFuncionario]

    def get_queryset(self):
        return Notificacao.objects.filter(destinatario=self.request.user)

    @action(detail=True, methods=['patch'])
    def marcar_como_lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save()
        return Response({'status': 'ok'})
        
    @action(detail=False, methods=['patch'])
    def marcar_todas_lidas(self, request):
        self.get_queryset().update(lida=True)
        return Response({'status': 'ok'})
