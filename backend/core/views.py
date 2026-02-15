from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Empresa
from .serializers import EmpresaSerializer
from equipe.permissions import IsSocio

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