from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from utils.permissions import IsFuncionario
from .models import Ativo
from .serializers import AtivoSerializer

class AtivoViewSet(viewsets.ModelViewSet):
    queryset = Ativo.objects.all().select_related('cliente').order_by('nome')
    serializer_class = AtivoSerializer
    permission_classes = [IsFuncionario]

    @action(detail=False, methods=['get'], url_path='buscar-por-codigo')
    def buscar_por_codigo(self, request):
        codigo = request.query_params.get('codigo')
        if not codigo:
            return Response({'error': 'Parâmetro \"codigo\" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        ativo = get_object_or_404(self.get_queryset(), codigo_identificacao__iexact=codigo)
        serializer = self.get_serializer(ativo)
        return Response(serializer.data)

    def filter_queryset(self, queryset):
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            return queryset.filter(cliente_id=cliente_id)
        return queryset