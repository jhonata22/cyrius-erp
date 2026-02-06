from rest_framework import serializers
from django.db import transaction
from .models import Chamado, ChamadoTecnico
from clientes.models import Cliente
from infra.models import Ativo
from equipe.models import Equipe
from core.models import Empresa 

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    # IDs no POST
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    ativo = serializers.PrimaryKeyRelatedField(queryset=Ativo.objects.all(), required=False, allow_null=True)
    
    # Técnicos (Lista de IDs para escrita)
    tecnicos = serializers.PrimaryKeyRelatedField(
        queryset=Equipe.objects.all(), 
        many=True, 
        required=False,
        write_only=True # Importante: Só serve para entrada
    )
    
    # === MULTI-EMPRESA ===
    empresa = serializers.PrimaryKeyRelatedField(queryset=Empresa.objects.all(), required=False, allow_null=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)
    # =====================

    # Campos de leitura
    nome_cliente = serializers.SerializerMethodField()
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    tipo_ativo = serializers.CharField(source='ativo.tipo', read_only=True)
    tecnicos_nomes = serializers.SerializerMethodField()

    class Meta:
        model = Chamado
        fields = [
            'id', 'empresa', 'empresa_nome', 
            'cliente', 'nome_cliente', 
            'ativo', 'nome_ativo', 'tipo_ativo',
            'titulo', 'descricao_detalhada', 'origem', 
            'status', 'prioridade', 'tipo_atendimento', 
            'data_agendamento', 'custo_ida', 'custo_volta', 
            'custo_transporte', 'protocolo', 'data_abertura', 
            'data_fechamento', 'tecnicos', 'tecnicos_nomes',
            'resolucao', 'valor_servico',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos_nomes']

    def get_tecnicos_nomes(self, obj):
        return [t.nome for t in obj.tecnicos.all()]

    def get_nome_cliente(self, obj):
        if not obj.cliente: return "Cliente Removido"
        return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # ... (Mantive sua lógica de representação igual) ...
        if instance.cliente:
            nome_exibicao = instance.cliente.nome if instance.cliente.nome else instance.cliente.razao_social
            representation['cliente'] = {
                "id": instance.cliente.id,
                "razao_social": instance.cliente.razao_social,
                "nome_fantasia": instance.cliente.nome,
                "nome_exibicao": nome_exibicao,
                "endereco": instance.cliente.endereco,
                "cnpj": instance.cliente.cnpj,
                "cpf": instance.cliente.cpf,
                "ativo": instance.cliente.ativo,
                "tipo_cliente": instance.cliente.tipo_cliente
            }
        
        if instance.ativo:
            representation['ativo'] = {
                "id": instance.ativo.id,
                "nome": instance.ativo.nome,
                "tipo": instance.ativo.tipo
            }
            
        if instance.tecnicos.exists():
            representation['tecnicos'] = [
                {"id": t.id, "nome": t.nome} for t in instance.tecnicos.all()
            ]

        return representation

    # === CORREÇÃO CRÍTICA: CREATE CUSTOMIZADO ===
    @transaction.atomic
    def create(self, validated_data):
        # Remove tecnicos do validated_data pois o M2M through não aceita direto
        tecnicos_data = validated_data.pop('tecnicos', [])
        
        # Cria o Chamado
        chamado = Chamado.objects.create(**validated_data)
        
        # Cria as relações na tabela intermediária
        for tecnico in tecnicos_data:
            ChamadoTecnico.objects.create(chamado=chamado, tecnico=tecnico)
            
        return chamado