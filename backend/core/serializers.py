from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Ativo, Chamado, ChamadoTecnico, LancamentoFinanceiro
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
    class Meta:
        model = LancamentoFinanceiro
        fields = '__all__'