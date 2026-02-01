from rest_framework import serializers
from .models import Chamado, ChamadoTecnico
from clientes.models import Cliente
from infra.models import Ativo
from equipe.models import Equipe

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    # 1. Definição para aceitar IDs no POST (Escrita)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    ativo = serializers.PrimaryKeyRelatedField(queryset=Ativo.objects.all(), required=False, allow_null=True)
    tecnicos = serializers.PrimaryKeyRelatedField(queryset=Equipe.objects.all(), many=True, required=False)

    # 2. Campos de leitura (Helpers para Listagem)
    # Lógica: Prioriza Nome Fantasia > Razão Social
    nome_cliente = serializers.SerializerMethodField()
    
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
            'resolucao', 'valor_servico', # Importante para o financeiro
            'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos_nomes']

    def get_tecnicos_nomes(self, obj):
        return [t.nome for t in obj.tecnicos.all()]

    # LÓGICA PRINCIPAL DE EXIBIÇÃO DO NOME (Listagem)
    def get_nome_cliente(self, obj):
        if not obj.cliente:
            return "Cliente Removido"
        # Retorna Nome Fantasia se existir, senão Razão Social
        return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social

    # 3. Mágica para o GET (Detalhes expandidos para o Frontend)
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Expande o Cliente
        if instance.cliente:
            # Aplica a mesma lógica para o objeto detalhado
            nome_exibicao = instance.cliente.nome if instance.cliente.nome else instance.cliente.razao_social
            
            representation['cliente'] = {
                "id": instance.cliente.id,
                "razao_social": instance.cliente.razao_social,
                "nome_fantasia": instance.cliente.nome,
                "nome_exibicao": nome_exibicao, # Campo facilitador para o frontend
                "endereco": instance.cliente.endereco,
                "cnpj": instance.cliente.cnpj,
                "cpf": instance.cliente.cpf,
                "ativo": instance.cliente.ativo,
                "tipo_cliente": instance.cliente.tipo_cliente
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