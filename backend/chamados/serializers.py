from rest_framework import serializers
from .models import Chamado, ChamadoTecnico, ApontamentoHoras, EquipamentoEntrada
from clientes.models import Cliente
from infra.models import Ativo
from equipe.models import Equipe

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    # 1. Definição para aceitar IDs no POST
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    ativo = serializers.PrimaryKeyRelatedField(queryset=Ativo.objects.all(), required=False, allow_null=True)
    tecnicos = serializers.PrimaryKeyRelatedField(queryset=Equipe.objects.all(), many=True, required=False)

    # 2. Campos de leitura (Helpers)
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    tipo_ativo = serializers.CharField(source='ativo.tipo', read_only=True)
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
            'data_fechamento', 'tecnicos', 'tecnicos_nomes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos_nomes']

    def get_tecnicos_nomes(self, obj):
        return [t.nome for t in obj.tecnicos.all()]

    # 3. Mágica para o GET (CORRIGIDA: Removi o cnpj_cpf que dava erro)
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Expande o Cliente (Sem tentar acessar campos que podem não existir)
        if instance.cliente:
            representation['cliente'] = {
                "id": instance.cliente.id,
                "razao_social": instance.cliente.razao_social
                # Removi a linha do cnpj_cpf pois ela causava o erro 500
            }
        
        # Expande o Ativo
        if instance.ativo:
            representation['ativo'] = {
                "id": instance.ativo.id,
                "nome": instance.ativo.nome,
                "tipo": instance.ativo.tipo
            }
            
        # Expande os Técnicos
        if instance.tecnicos.exists():
            representation['tecnicos'] = [
                {"id": t.id, "nome": t.nome} for t in instance.tecnicos.all()
            ]

        return representation