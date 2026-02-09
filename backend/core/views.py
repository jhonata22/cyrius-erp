from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Empresa
from .serializers import EmpresaSerializer
from equipe.permissions import IsSocio

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.filter(ativa=True).order_by('-eh_matriz', 'nome_fantasia')
    serializer_class = EmpresaSerializer
    permission_classes = [IsSocio]
    pagination_class = None