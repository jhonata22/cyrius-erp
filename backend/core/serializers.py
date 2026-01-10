from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Ativo, Chamado, ChamadoTecnico, LancamentoFinanceiro, Fornecedor, Produto, MovimentacaoEstoque
)

# --- 1. CLIENTE & SUB-TABELAS ---

class ContatoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContatoCliente
        fields = '__all__'
        # REMOVIDO read_only_fields PARA PERMITIR SALVAR O ID DO CLIENTE

class ProvedorInternetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProvedorInternet
        fields = '__all__'
        # REMOVIDO read_only_fields

class ContaEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaEmail
        fields = '__all__'
        # REMOVIDO read_only_fields

class DocumentacaoTecnicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentacaoTecnica
        fields = '__all__'
        # REMOVIDO read_only_fields

class ClienteSerializer(serializers.ModelSerializer):
    # Nested Serializers (apenas para leitura/exibição)
    contatos = ContatoClienteSerializer(many=True, read_only=True)
    provedores = ProvedorInternetSerializer(many=True, read_only=True)
    contas_email = ContaEmailSerializer(many=True, read_only=True)
    documentacao_tecnica = DocumentacaoTecnicaSerializer(read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'

# --- 2. EQUIPE ---

class EquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        fields = '__all__'
        read_only_fields = ['usuario']

    def create(self, validated_data):
        nome_completo = validated_data.get('nome', '')
        username = nome_completo.lower().replace(" ", "")
        
        if User.objects.filter(username=username).exists():
            import random
            username = f"{username}{random.randint(1,99)}"

        novo_usuario = User.objects.create_user(
            username=username,
            password='123456'
        )

        equipe = Equipe.objects.create(
            usuario=novo_usuario,
            **validated_data
        )
        return equipe

# --- 3. ATIVOS (INVENTÁRIO) ---

class AtivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ativo
        fields = '__all__'

# --- 4. CHAMADOS ---

class ChamadoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)

    class Meta:
        model = Chamado
        fields = '__all__'
        read_only_fields = ['tecnicos', 'protocolo']

class ChamadoTecnicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChamadoTecnico
        fields = '__all__'

# --- 5. FINANCEIRO ---

class LancamentoFinanceiroSerializer(serializers.ModelSerializer):
    cliente_detalhes = ClienteSerializer(source='cliente', read_only=True)

    class Meta:
        model = LancamentoFinanceiro
        fields = '__all__'

# =====================================================
# INVENTÁRIO - NOVOS SERIALIZERS
# =====================================================

class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = '__all__'

class ProdutoSerializer(serializers.ModelSerializer):
    # Campo calculado (somente leitura) que vem do @property no Model
    estoque_atual = serializers.IntegerField(read_only=True)

    class Meta:
        model = Produto
        fields = '__all__'

class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    nome_produto = serializers.CharField(source='produto.nome', read_only=True)
    nome_usuario = serializers.CharField(source='usuario.username', read_only=True)
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    class Meta:
        model = MovimentacaoEstoque
        fields = '__all__'
    
    def validate(self, data):
        # Regra de Negócio: Não deixar sair se não tiver estoque
        if data['tipo_movimento'] == 'SAIDA':
            produto = data['produto']
            qtd_saida = data['quantidade']
            if produto.estoque_atual < qtd_saida:
                raise serializers.ValidationError(f"Estoque insuficiente! Atual: {produto.estoque_atual}")
        return data