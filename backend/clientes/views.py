from rest_framework import viewsets, parsers
from utils.permissions import IsFuncionario, IsSocio, IsGestor, IsOwnerOrGestor

# Models e Serializers
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, 
    ContaEmail, DocumentacaoTecnica, ContratoCliente, 
)
from .serializers import (
    ClienteSerializer, ContatoClienteSerializer, ProvedorInternetSerializer,
    ContaEmailSerializer, DocumentacaoTecnicaSerializer, ContratoClienteSerializer, 
)

class OptimizedQuerySetMixin:
    """Mixin simples para evitar N+1 queries"""
    def get_queryset(self):
        qs = super().get_queryset()
        # Se o modelo tem campo 'cliente', faz join automático
        if hasattr(qs.model, 'cliente'):
            return qs.select_related('cliente')
        return qs

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsFuncionario] # Ajuste conforme suas regras (IsFuncionario)

class ContatoClienteViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ContatoCliente.objects.all()
    serializer_class = ContatoClienteSerializer
    permission_classes = [IsFuncionario]

class ProvedorInternetViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ProvedorInternet.objects.all()
    serializer_class = ProvedorInternetSerializer
    permission_classes = [IsFuncionario]

class ContaEmailViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ContaEmail.objects.all()
    serializer_class = ContaEmailSerializer
    permission_classes = [IsFuncionario]

class DocumentacaoTecnicaViewSet(viewsets.ModelViewSet):
    queryset = DocumentacaoTecnica.objects.all()
    serializer_class = DocumentacaoTecnicaSerializer
    permission_classes = [IsFuncionario]

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = ContratoCliente.objects.all()
    serializer_class = ContratoClienteSerializer
    permission_classes = [IsSocio] # Seu React bloqueia a aba, aqui bloqueamos a API
    
    # OBRIGATÓRIO PARA O UPLOAD DE ARQUIVO FUNCIONAR
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)