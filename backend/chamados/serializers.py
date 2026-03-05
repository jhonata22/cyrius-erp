from rest_framework import serializers
from django.db import transaction
from .models import Chamado, ChamadoTecnico, AssuntoChamado, ComentarioChamado
from clientes.models import Cliente, ContatoCliente
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


class ComentarioChamadoSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.nome', read_only=True)

    class Meta:
        model = ComentarioChamado
        fields = ['id', 'texto', 'autor', 'autor_nome', 'created_at', 'chamado']
        read_only_fields = ['autor', 'chamado', 'created_at', 'autor_nome']


class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    # IDs no POST
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    solicitante = serializers.PrimaryKeyRelatedField(queryset=ContatoCliente.objects.all(), required=False, allow_null=True)
    tecnico = serializers.PrimaryKeyRelatedField(queryset=Equipe.objects.all(), required=False, allow_null=True)
    ativo = serializers.PrimaryKeyRelatedField(queryset=Ativo.objects.all(), required=False, allow_null=True)
    assuntos = serializers.PrimaryKeyRelatedField(queryset=AssuntoChamado.objects.all(), many=True, required=False)

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
    assuntos_detalhes = serializers.SerializerMethodField()
    solicitante_nome = serializers.CharField(source='solicitante.nome', read_only=True)
    solicitante_telefone = serializers.CharField(source='solicitante.telefone', read_only=True)
    titulo = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)

    # Write-only fields for new solicitante
    novo_solicitante_nome = serializers.CharField(write_only=True, required=False, allow_blank=True)
    novo_solicitante_telefone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    novo_solicitante_cargo = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Chamado
        fields = [
            'id', 'empresa', 'empresa_nome',
            'cliente', 'nome_cliente',
            'solicitante', 'solicitante_nome', 'solicitante_telefone',
            'novo_solicitante_nome', 'novo_solicitante_telefone', 'novo_solicitante_cargo',
            'ativo', 'nome_ativo', 'tipo_ativo',
            'tecnico', 'nome_tecnico',
            'assuntos', 'assuntos_detalhes',
            'titulo', 'descricao_detalhada', 'origem',
            'status', 'prioridade', 'tipo_atendimento',
            'data_agendamento', 'custo_ida', 'custo_volta',
            'custo_transporte', 'protocolo', 'data_abertura',
            'data_fechamento', 'tecnicos', 'tecnicos_nomes',
            'resolucao', 'valor_servico',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos_nomes', 'nome_tecnico', 'assuntos_detalhes']

    def get_assuntos_detalhes(self, obj):
        return [{'id': assunto.id, 'titulo': assunto.titulo} for assunto in obj.assuntos.all()]

    def get_tecnicos_nomes(self, obj):
        return [t.nome for t in obj.tecnicos.all()]

    def get_nome_cliente(self, obj):
        if not obj.cliente: return "Cliente Removido"
        return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        representation['assuntos_detalhes'] = self.get_assuntos_detalhes(instance)

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

        if instance.solicitante:
            representation['solicitante'] = {
                "id": instance.solicitante.id,
                "nome": instance.solicitante.nome,
                "telefone": instance.solicitante.telefone
            }

        return representation

    @transaction.atomic
    def create(self, validated_data):
        # Lógica para criar novo solicitante inline
        novo_solicitante_nome = validated_data.pop('novo_solicitante_nome', None)
        if novo_solicitante_nome:
            cliente = validated_data.get('cliente')
            if cliente:
                solicitante = ContatoCliente.objects.create(
                    cliente=cliente,
                    nome=novo_solicitante_nome,
                    telefone=validated_data.pop('novo_solicitante_telefone', ''),
                    cargo=validated_data.pop('novo_solicitante_cargo', '')
                )
                validated_data['solicitante'] = solicitante

        # Limpa os campos que não pertencem ao modelo Chamado
        validated_data.pop('novo_solicitante_telefone', None)
        validated_data.pop('novo_solicitante_cargo', None)

        tecnicos_data = validated_data.pop('tecnicos', [])
        assuntos_data = validated_data.pop('assuntos', [])

        chamado = Chamado.objects.create(**validated_data)

        for tecnico in tecnicos_data:
            ChamadoTecnico.objects.get_or_create(chamado=chamado, tecnico=tecnico)

        if assuntos_data:
            chamado.assuntos.set(assuntos_data)

        if not chamado.titulo and chamado.assuntos.exists():
            chamado.titulo = " - ".join([a.titulo for a in chamado.assuntos.all()])
            chamado.save()

        return chamado

    @transaction.atomic
    def update(self, instance, validated_data):
        validated_data.pop('tecnicos', None) # Handled by service
        assuntos_data = validated_data.pop('assuntos', None)

        if assuntos_data is not None:
            instance.assuntos.set(assuntos_data)

        return super().update(instance, validated_data)
