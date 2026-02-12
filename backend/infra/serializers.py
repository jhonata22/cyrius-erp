from rest_framework import serializers
from .models import Ativo
from chamados.models import Chamado
from clientes.models import Cliente
from clientes.serializers import ClienteSerializer

class HistoricoChamadoResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chamado
        fields = ['id', 'titulo', 'status', 'created_at', 'prioridade', 'protocolo']

class AtivoSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(read_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), source='cliente', write_only=True
    )
    historico_servicos = serializers.SerializerMethodField()

    class Meta:
        model = Ativo
        fields = [
            'id', 'cliente', 'cliente_id', 'nome', 'tipo', 
            'marca_modelo', 'numero_serial', 'descricao',
            'processador', 'memoria_ram', 'armazenamento', 
            'sistema_operacional', 'anydesk_id', 'usuario_local', 
            'senha_local', 'ip_local', 'historico_servicos',
            'codigo_identificacao'
        ]

    def get_historico_servicos(self, obj):
        try:
            qs = Chamado.objects.filter(ativo_id=obj.id).order_by('-created_at')
            return HistoricoChamadoResumoSerializer(qs, many=True).data
        except Exception as e:
            print(f"ERRO AO SERIALIZAR HISTÓRICO: {e}")
            return []