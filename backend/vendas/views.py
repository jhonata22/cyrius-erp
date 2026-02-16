from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Venda
from .serializers import VendaSerializer, VendaListSerializer
from .services import processar_venda

class VendaViewSet(viewsets.ModelViewSet):
    queryset = Venda.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return VendaListSerializer
        return VendaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # A lógica de negócio agora está no serviço
        venda_criada = processar_venda(serializer.validated_data)
        
        # Criamos um serializer de resposta para retornar o objeto criado
        response_serializer = self.get_serializer(venda_criada)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
