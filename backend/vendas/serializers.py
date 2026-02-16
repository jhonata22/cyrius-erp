from rest_framework import serializers
from .models import Venda

class VendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venda
        fields = '__all__'

class VendaListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.razao_social', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = Venda
        fields = ['id', 'cliente_nome', 'produto_nome', 'quantidade', 'valor_total', 'data_venda']
