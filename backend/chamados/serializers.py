from rest_framework import serializers
from django.db import transaction
from .models import Chamado, ChamadoTecnico, AssuntoChamado
from clientes.models import Cliente
from infra.models import Ativo
from equipe.models import Equipe
from core.models import Empresa


class ChamadoRelacionadoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome_fantasia', read_only=True)

    class Meta:
        model = Chamado
        fields = ['id', 'protocolo', 'resolucao', 'created_at', 'cliente_nome']


class AssuntoChamadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssuntoChamado
        fields = '__all__'

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    # IDs no POST
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    tecnico = serializers.PrimaryKeyRelatedField(queryset=Equipe.objects.all(), required=False, allow_null=True)
    ativo = serializers.PrimaryKeyRelatedField(queryset=Ativo.objects.all(), required=False, allow_null=True)
    assunto = serializers.PrimaryKeyRelatedField(queryset=AssuntoChamado.objects.all(), required=False, allow_null=True)
    
    # TÃ©cnicos (Lista de IDs para escrita)
    tecnicos = serializers.PrimaryKeyRelatedField(
        queryset=Equipe.objects.all(), 
        many=True, 
        required=False,
        write_only=True
    )
    
    # === MULTI-EMPRESA ===
    empresa = serializers.PrimaryKeyRelatedField(queryset=Empresa.objects.all(), required=False, allow_null=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)
    # =====================

    # Campos de leitura
    nome_cliente = serializers.SerializerMethodField()
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    tipo_ativo = serializers.CharField(source='ativo.tipo', read_only=True)
    tecnicos_nomes = serializers.SerializerMethodField()
    assunto_nome = serializers.CharField(source='assunto.titulo', read_only=True)
    
    # Write only field for new subject
    novo_assunto = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Chamado
        fields = [
            'id', 'empresa', 'empresa_nome', 
            'cliente', 'nome_cliente', 
            'ativo', 'nome_ativo', 'tipo_ativo',
            'tecnico', 'nome_tecnico',
            'assunto', 'assunto_nome', 'novo_assunto',
            'titulo', 'descricao_detalhada', 'origem', 
            'status', 'prioridade', 'tipo_atendimento', 
            'data_agendamento', 'custo_ida', 'custo_volta', 
            'custo_transporte', 'protocolo', 'data_abertura', 
            'data_fechamento', 'tecnicos', 'tecnicos_nomes',
            'resolucao', 'valor_servico',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos_nomes', 'nome_tecnico', 'assunto_nome', 'titulo']

    def get_tecnicos_nomes(self, obj):
        return [t.nome for t in obj.tecnicos.all()]

    def get_nome_cliente(self, obj):
        if not obj.cliente: return "Cliente Removido"
        return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        if instance.cliente:
            nome_exibicao = instance.cliente.nome if instance.cliente.nome else instance.cliente.razao_social
            representation['cliente'] = {
                "id": instance.cliente.id, "razao_social": instance.cliente.razao_social,
                "nome_fantasia": instance.cliente.nome, "nome_exibicao": nome_exibicao,
                "endereco": instance.cliente.endereco, "cnpj": instance.cliente.cnpj,
                "cpf": instance.cliente.cpf, "ativo": instance.cliente.ativo,
                "tipo_cliente": instance.cliente.tipo_cliente
            }
        
        if instance.ativo:
            representation['ativo'] = {
                "id": instance.ativo.id, "nome": instance.ativo.nome,
                "tipo": instance.ativo.tipo, "codigo_identificacao": instance.ativo.codigo_identificacao
            }

        if instance.tecnico:
            representation['tecnico'] = { "id": instance.tecnico.id, "nome": instance.tecnico.nome }
            
        if instance.tecnicos.exists():
            representation['tecnicos'] = [ {"id": t.id, "nome": t.nome} for t in instance.tecnicos.all() ]

        return representation

    def _handle_assunto(self, validated_data):
        novo_assunto_titulo = validated_data.pop('novo_assunto', None)
        if novo_assunto_titulo:
            assunto, _ = AssuntoChamado.objects.get_or_create(titulo=novo_assunto_titulo)
            validated_data['assunto'] = assunto
        return validated_data

    @transaction.atomic
    def create(self, validated_data):
        validated_data = self._handle_assunto(validated_data)
        tecnicos_data = validated_data.pop('tecnicos', [])
        chamado = Chamado.objects.create(**validated_data)
        for tecnico in tecnicos_data:
            ChamadoTecnico.objects.get_or_create(chamado=chamado, tecnico=tecnico)
        return chamado

    @transaction.atomic
    def update(self, instance, validated_data):
        validated_data = self._handle_assunto(validated_data)
        validated_data.pop('tecnicos', None) # Handled by service
        return super().update(instance, validated_data)
