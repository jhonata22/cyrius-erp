from rest_framework import serializers
from .models import Fornecedor, Produto, MovimentacaoEstoque
from django.apps import apps

class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = '__all__'

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'

class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    nome_produto = serializers.CharField(source='produto.nome', read_only=True)
    nome_usuario = serializers.CharField(source='usuario.username', read_only=True)
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    nome_fornecedor = serializers.CharField(source='fornecedor.razao_social', read_only=True)

    class Meta:
        model = MovimentacaoEstoque
        fields = '__all__'