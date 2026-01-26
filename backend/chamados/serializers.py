from rest_framework import serializers
from .models import Chamado, ChamadoTecnico, ApontamentoHoras, EquipamentoEntrada

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    tipo_ativo = serializers.CharField(source='ativo.tipo', read_only=True)
    
    # Campo calculado para exibir os técnicos vinculados na listagem
    tecnicos_nomes = serializers.SerializerMethodField()

    class Meta:
        model = Chamado
        fields = [
            'id', 'cliente', 'nome_cliente', 
            'ativo', 'nome_ativo', 'tipo_ativo',
            'titulo', 'descricao_detalhada', 'origem', 
            'status', 'prioridade', 'tipo_atendimento', 
            'data_agendamento', 'custo_ida', 'custo_volta', 
            'custo_transporte', 'protocolo', 'data_abertura', 
            'data_fechamento', 'tecnicos', 'tecnicos_nomes', # <--- ADICIONEI 'tecnicos' AQUI
            'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos_nomes']
        # O depth = 1 transforma o ID do cliente e dos técnicos em objetos completos no GET
        depth = 1

    def get_tecnicos_nomes(self, obj):
        return [t.nome for t in obj.tecnicos.all()]