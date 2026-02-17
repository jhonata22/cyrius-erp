from rest_framework import serializers
from .models import Venda, ItemVenda
from clientes.serializers import ClienteSerializer, ContatoClienteSerializer
from estoque.serializers import ProdutoSerializer

class ItemVendaSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ItemVenda
        fields = ['id', 'produto', 'produto_nome', 'quantidade', 'preco_unitario', 'valor_total_item']
        read_only_fields = ['valor_total_item']

class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Venda
        fields = [
            'id', 'empresa', 'cliente', 'solicitante', 'vendedor', 'valor_total', 'desconto', 
            'valor_entrada', 'parcelas', 'forma_pagamento', 'vincular_contrato', 'itens'
        ]

class VendaDetailSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True, read_only=True)
    cliente = ClienteSerializer(read_only=True)
    solicitante = ContatoClienteSerializer(read_only=True)
    
    class Meta:
        model = Venda
        fields = '__all__'

class VendaListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.razao_social', read_only=True)
    produtos_resumo = serializers.SerializerMethodField()

    class Meta:
        model = Venda
        fields = ['id', 'cliente_nome', 'produtos_resumo', 'valor_total', 'status', 'data_venda']

    def get_produtos_resumo(self, obj):
        primeiro_item = obj.itens.first()
        if not primeiro_item:
            return "Nenhum item"
        
        count = obj.itens.count()
        if count == 1:
            return primeiro_item.produto.nome
        
        return f"{primeiro_item.produto.nome} (+{count - 1} itens)"
