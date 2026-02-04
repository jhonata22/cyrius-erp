from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Empresa
from .serializers import EmpresaSerializer

class EmpresaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Empresa.objects.filter(ativa=True)
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]