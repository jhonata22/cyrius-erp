from rest_framework import serializers
from .models import OrdemServico, ItemServico, AnexoServico, Notificacao, ComentarioOrdemServico
from clientes.models import ContatoCliente
from equipe.models import Equipe
from infra.models import Ativo

class AtivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ativo
        fields = ['id', 'nome', 'codigo_identificacao']

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

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.arquivo:
            request = self.context.get('request')
            if request:
                representation['arquivo'] = request.build_absolute_uri(instance.arquivo.url)
        return representation

class OrdemServicoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_tecnico = serializers.CharField(source='tecnico_responsavel.nome', read_only=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)
    empresa_cnpj = serializers.CharField(source='empresa.cnpj', read_only=True)
    empresa_endereco = serializers.CharField(source='empresa.endereco', read_only=True)
    solicitante_nome = serializers.CharField(source='solicitante.nome', read_only=True)
    solicitante_telefone = serializers.CharField(source='solicitante.telefone', read_only=True)

    # ManyToMany Ativos
    ativos = AtivoSerializer(many=True, read_only=True)
    ativos_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Ativo.objects.all(), write_only=True, source='ativos', required=False
    )

    itens = ItemServicoSerializer(many=True, read_only=True)
    anexos = AnexoServicoSerializer(many=True, read_only=True)

    # Permite escrita com IDs [1, 2] e leitura manual via to_representation
    tecnicos = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Equipe.objects.all(),
        required=False
    )
    solicitante = serializers.PrimaryKeyRelatedField(queryset=ContatoCliente.objects.all(), required=False, allow_null=True)

    total_pecas = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    valor_total_geral = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    # Write-only fields para criação inline de solicitante
    novo_solicitante_nome = serializers.CharField(write_only=True, required=False, allow_blank=True)
    novo_solicitante_telefone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    novo_solicitante_cargo = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'empresa', 'titulo', 'cliente', 'tecnico_responsavel', 'tecnicos',
            'solicitante', 'solicitante_nome', 'solicitante_telefone',
            'novo_solicitante_nome', 'novo_solicitante_telefone', 'novo_solicitante_cargo',
            'tipo', 'status', 'descricao_problema', 'relatorio_tecnico', 'data_entrada',
            'data_previsao', 'data_conclusao', 'data_finalizacao', 'custo_deslocamento',
            'custo_terceiros', 'valor_mao_de_obra', 'desconto', 'created_at', 'updated_at',
            # Campos ReadOnly/Custom
            'nome_cliente', 'nome_tecnico', 'empresa_nome', 'empresa_cnpj', 'empresa_endereco', 'itens', 'anexos', 'total_pecas', 'valor_total_geral',
            # Campos de Ativo
            'ativos', 'ativos_ids', 'arquivo_orcamento'
        ]
        read_only_fields = ['created_at', 'updated_at', 'data_conclusao', 'data_finalizacao', 'status', 'total_pecas', 'valor_total_geral']
        extra_kwargs = {
            'tecnico_responsavel': {'required': False, 'allow_null': True},
        }

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
        
        # Limpa os campos que não pertencem ao modelo
        validated_data.pop('novo_solicitante_telefone', None)
        validated_data.pop('novo_solicitante_cargo', None)

        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        if instance.tecnicos.exists():
            representation['tecnicos'] = [
                {'id': t.id, 'nome': t.nome} for t in instance.tecnicos.all()
            ]
        else:
             representation['tecnicos'] = []

        if instance.solicitante:
            representation['solicitante'] = {
                "id": instance.solicitante.id,
                "nome": instance.solicitante.nome,
                "telefone": instance.solicitante.telefone
            }

        return representation

class ComentarioOrdemServicoSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.nome', read_only=True)

    class Meta:
        model = ComentarioOrdemServico
        fields = ['id', 'texto', 'autor', 'autor_nome', 'created_at', 'ordem_servico']
        read_only_fields = ['autor', 'ordem_servico', 'created_at', 'autor_nome']


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = '__all__'
