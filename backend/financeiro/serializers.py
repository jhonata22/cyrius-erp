from rest_framework import serializers
from .models import LancamentoFinanceiro, DespesaRecorrente

class LancamentoFinanceiroSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.SerializerMethodField()
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    nome_fornecedor = serializers.CharField(source='fornecedor.razao_social', read_only=True)
    
    # Campo para ler o nome da empresa na listagem (Opcional, mas útil para debug)
    nome_empresa = serializers.CharField(source='empresa.nome_fantasia', read_only=True)

    class Meta:
        model = LancamentoFinanceiro
        fields = '__all__'

    def get_nome_cliente(self, obj):
        if obj.cliente:
            return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social
        return None
    
class DespesaRecorrenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DespesaRecorrente
        fields = '__all__'