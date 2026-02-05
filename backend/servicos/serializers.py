from rest_framework import serializers
from .models import OrdemServico, ItemServico, AnexoServico, Notificacao
from equipe.models import Equipe 

class ItemServicoSerializer(serializers.ModelSerializer):
    nome_produto = serializers.CharField(source='produto.nome', read_only=True)
    unidade = serializers.CharField(source='produto.unidade', read_only=True, default='UN')
    valor_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemServico
        fields = ['id', 'produto', 'nome_produto', 'unidade', 'quantidade', 'preco_venda', 'valor_total']

    def get_valor_total(self, obj):
        return (obj.quantidade or 0) * (obj.preco_venda or 0)

class AnexoServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoServico
        fields = '__all__'

class OrdemServicoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_tecnico = serializers.CharField(source='tecnico_responsavel.nome', read_only=True)
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)

    itens = ItemServicoSerializer(many=True, read_only=True)
    anexos = AnexoServicoSerializer(many=True, read_only=True)

    # Configuração para salvar lista de IDs de técnicos
    tecnicos = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Equipe.objects.all(),
        required=False
    )

    total_pecas = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    valor_total_geral = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrdemServico
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'data_conclusao', 'data_finalizacao', 'status', 'total_pecas', 'valor_total_geral']
        
        extra_kwargs = {
            'tecnico_responsavel': {'required': False, 'allow_null': True},
            'ativo': {'required': False, 'allow_null': True}
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        if instance.tecnicos.exists():
            representation['tecnicos'] = [
                {'id': t.id, 'nome': t.nome} for t in instance.tecnicos.all()
            ]
        else:
             representation['tecnicos'] = []
             
        return representation

# === ADICIONE ISTO NO FINAL PARA CORRIGIR O ERRO DE IMPORT ===
class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = '__all__'