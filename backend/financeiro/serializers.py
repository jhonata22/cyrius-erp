from rest_framework import serializers
from .models import LancamentoFinanceiro, DespesaRecorrente

class LancamentoFinanceiroSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    nome_fornecedor = serializers.CharField(source='fornecedor.razao_social', read_only=True)

    class Meta:
        model = LancamentoFinanceiro
        fields = '__all__'
    
class DespesaRecorrenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DespesaRecorrente
        fields = '__all__'