from rest_framework import viewsets
from utils.permissions import IsFuncionario, IsSocio, IsGestor, IsOwnerOrGestor
from .models import Ativo
from .serializers import AtivoSerializer

class OptimizedQuerySetMixin:
    """Mixin para otimizar consultas e evitar N+1"""
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'cliente'):
            return qs.select_related('cliente')
        return qs

class AtivoViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):

    queryset = Ativo.objects.all().prefetch_related('historico_servicos').order_by('nome')
    serializer_class = AtivoSerializer
    permission_classes = [IsFuncionario]
   
    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            return queryset.filter(cliente_id=cliente_id)
        return queryset