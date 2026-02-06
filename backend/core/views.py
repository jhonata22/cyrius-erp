from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Empresa
from .serializers import EmpresaSerializer

class EmpresaViewSet(viewsets.ReadOnlyModelViewSet):
    # Ordena pela Matriz primeiro, depois alfabético
    queryset = Empresa.objects.filter(ativa=True).order_by('-eh_matriz', 'nome_fantasia')
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    

    pagination_class = None