from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Ativo, Chamado, ChamadoTecnico, LancamentoFinanceiro, 
    Fornecedor, Produto, MovimentacaoEstoque,
    OrdemServico, ItemServico, AnexoServico, ContratoCliente, DespesaRecorrente
)

# =====================================================
# 1. CLIENTES E SUB-TABELAS
# =====================================================

class ContratoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContratoCliente
        fields = ['id', 'cliente', 'arquivo', 'descricao', 'data_upload']

class ContatoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContatoCliente
        fields = '__all__'

class ProvedorInternetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProvedorInternet
        fields = '__all__'

class ContaEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaEmail
        fields = '__all__'

class DocumentacaoTecnicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentacaoTecnica
        fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    contatos = ContatoClienteSerializer(many=True, read_only=True)
    provedores = ProvedorInternetSerializer(many=True, read_only=True)
    contas_email = ContaEmailSerializer(many=True, read_only=True)
    documentacao_tecnica = DocumentacaoTecnicaSerializer(read_only=True)
    contratos = ContratoClienteSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'

# =====================================================
# 2. EQUIPE
# =====================================================

class EquipeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Equipe
        fields = ['id', 'nome', 'cargo', 'custo_hora', 'username', 'foto']
        read_only_fields = ['usuario']
        
    def create(self, validated_data):
        from core.services.equipe import criar_membro_equipe
        return criar_membro_equipe(**validated_data)

# =====================================================
# 3. CHAMADOS E ATIVOS
# =====================================================

class AtivoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    
    # --- CORREÇÃO AQUI ---
    # Removido 'nome_ativo' e 'tipo_ativo'. 
    # O Ativo É o próprio ativo, ele não tem um campo 'ativo' dentro dele.
    
    class Meta:
        model = Ativo
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    tipo_ativo = serializers.CharField(source='ativo.tipo', read_only=True)

    class Meta:
        model = Chamado
        fields = [
            'id', 'cliente', 'nome_cliente', 
            'ativo', 'nome_ativo', 'tipo_ativo',
            'titulo', 'descricao_detalhada', 'origem', 
            'status', 'prioridade', 'tipo_atendimento', 
            'data_agendamento', 'custo_ida', 'custo_volta', 
            'custo_transporte', 'protocolo', 'data_abertura', 
            'data_fechamento', 'tecnicos', 'created_at', 'updated_at'
        ]
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos']

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)
    
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

# =====================================================
# 4. FINANCEIRO
# =====================================================

class LancamentoFinanceiroSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_tecnico = serializers.CharField(source='tecnico.nome', read_only=True)

    class Meta:
        model = LancamentoFinanceiro
        fields = '__all__'
    
class DespesaRecorrenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DespesaRecorrente
        fields = '__all__'

# =====================================================
# 5. INVENTÁRIO
# =====================================================

class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = '__all__'

class ProdutoSerializer(serializers.ModelSerializer):
    estoque_atual = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = '__all__'

    def get_estoque_atual(self, obj):
        return getattr(obj, 'estoque_real', obj.estoque_atual)

class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    nome_produto = serializers.CharField(source='produto.nome', read_only=True)
    
    # Configuração para aceitar IDs no POST e exibir nomes no GET
    fornecedor = serializers.PrimaryKeyRelatedField(
        queryset=Fornecedor.objects.all(), required=False, allow_null=True
    )
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), required=False, allow_null=True
    )

    nome_usuario = serializers.SerializerMethodField()
    nome_cliente = serializers.SerializerMethodField()
    nome_fornecedor = serializers.SerializerMethodField() 

    class Meta:
        model = MovimentacaoEstoque
        # '__all__' inclui arquivo_1 e arquivo_2 automaticamente SE eles existirem no Model
        fields = '__all__'
    
    def get_nome_usuario(self, obj):
        return obj.usuario.username if obj.usuario else None

    def get_nome_cliente(self, obj):
        return obj.cliente.razao_social if obj.cliente else None

    def get_nome_fornecedor(self, obj):
        return obj.fornecedor.razao_social if obj.fornecedor else None

    def validate(self, data):
        if data.get('tipo_movimento') == 'SAIDA':
            produto = data['produto']
            # Verifica se foi passado quantidade (pode vir parcial em updates)
            qtd = data.get('quantidade', 0)
            if produto.estoque_atual < qtd:
                raise serializers.ValidationError({
                    "quantidade": f"Estoque insuficiente. Disponível: {produto.estoque_atual}"
                })
        return data

# 6. SERVIÇOS (ORDEM DE SERVIÇO)
# =====================================================

class ItemServicoSerializer(serializers.ModelSerializer):
    nome_produto = serializers.CharField(source='produto.nome', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    # --- CORREÇÃO AQUI ---
    # A Class Meta deste serializer estava errada no seu código
    class Meta:
        model = ItemServico
        fields = ['id', 'produto', 'nome_produto', 'quantidade', 'preco_venda', 'subtotal']

class AnexoServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoServico
        fields = '__all__'

class OrdemServicoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_tecnico = serializers.CharField(source='tecnico_responsavel.nome', read_only=True)
    
    # Aqui sim pode ter nome_ativo, pois OrdemServico TEM o campo ativo
    nome_ativo = serializers.CharField(source='ativo.nome', read_only=True)
    tipo_ativo = serializers.CharField(source='ativo.tipo', read_only=True)

    # Nested Serializers
    itens = ItemServicoSerializer(many=True, read_only=True)
    anexos = AnexoServicoSerializer(many=True, read_only=True)
    
    total_pecas = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    valor_total_geral = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrdemServico
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'data_conclusao', 'status', 'total_pecas', 'valor_total_geral']
        
        # Fundamental para permitir salvar o ID e ler o Nome
        extra_kwargs = {
            'tecnico_responsavel': {'required': False, 'allow_null': True},
            'ativo': {'required': False, 'allow_null': True} 
        }