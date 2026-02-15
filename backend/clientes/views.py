from rest_framework import viewsets, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
    queryset = Cliente.objects.all().order_by('-id')
    serializer_class = ClienteSerializer
    permission_classes = [IsFuncionario] # Ajuste conforme suas regras (IsFuncionario)

    @action(detail=True, methods=['get'])
    def contatos_lista(self, request, pk=None):
        try:
            cliente = self.get_object()
            contatos = cliente.contatos.all().order_by('-is_principal', 'nome').values('id', 'nome', 'cargo', 'telefone')
            return Response(contatos)
        except Cliente.DoesNotExist:
            return Response({"erro": "Cliente não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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