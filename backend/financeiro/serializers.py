from rest_framework import serializers
from .models import LancamentoFinanceiro, DespesaRecorrente

class LancamentoFinanceiroSerializer(serializers.ModelSerializer):
    # ALTERAÇÃO AQUI: Mudamos de CharField(source=...) para SerializerMethodField
    nome_cliente = serializers.SerializerMethodField()
    
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    nome_fornecedor = serializers.CharField(source='fornecedor.razao_social', read_only=True)

    class Meta:
        model = LancamentoFinanceiro
        fields = '__all__'

    # Lógica inteligente para escolher o nome
    def get_nome_cliente(self, obj):
        if obj.cliente:
            # Retorna o nome (apelido) se existir, senão retorna a razão social
            return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social
        return None
    
class DespesaRecorrenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DespesaRecorrente
        fields = '__all__'