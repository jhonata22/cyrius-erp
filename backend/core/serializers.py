from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Ativo, Chamado, ChamadoTecnico, LancamentoFinanceiro, Fornecedor, Produto, MovimentacaoEstoque
)

# =====================================================
# 1. CLIENTES E SUB-TABELAS
# =====================================================

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
        # Importação local para evitar erros de importação circular
        from core.services.equipe import criar_membro_equipe
        return criar_membro_equipe(**validated_data)

# =====================================================
# 3. CHAMADOS E ATIVOS
# =====================================================

class AtivoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    
    class Meta:
        model = Ativo
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    
    class Meta:
        model = Chamado
        fields = '__all__'
        read_only_fields = ['protocolo', 'custo_transporte', 'created_at', 'updated_at', 'tecnicos']

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    """ O SERIALIZER QUE ESTAVA FALTANDO """
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

# =====================================================
# 5. INVENTÁRIO
# =====================================================

class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = '__all__'

class ProdutoSerializer(serializers.ModelSerializer):
    # Usa o campo calculado pelo Manager para performance
    estoque_atual = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = '__all__'

    def get_estoque_atual(self, obj):
        return getattr(obj, 'estoque_real', obj.estoque_atual)

class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    nome_produto = serializers.CharField(source='produto.nome', read_only=True)
    nome_usuario = serializers.CharField(source='usuario.username', read_only=True)
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)

    class Meta:
        model = MovimentacaoEstoque
        fields = '__all__'
    
    def validate(self, data):
        if data.get('tipo_movimento') == 'SAIDA':
            produto = data['produto']
            if produto.estoque_atual < data['quantidade']:
                raise serializers.ValidationError({
                    "quantidade": f"Estoque insuficiente. Disponível: {produto.estoque_atual}"
                })
        return data