from django.contrib import admin
from .models import Produto, Fornecedor, MovimentacaoEstoque

@admin.register(Fornecedor)
class FornecedorAdmin(admin.ModelAdmin):
    list_display = ('razao_social', 'cnpj', 'telefone', 'contato_nome')
    search_fields = ('razao_social', 'cnpj', 'email')

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'estoque_atual', 'preco_venda_sugerido')
    # OBRIGATÓRIO:
    search_fields = ('nome', 'descricao', 'codigo_barras')

@admin.register(MovimentacaoEstoque)
class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = (
        'data_movimento', 
        'tipo_movimento', 
        'produto', 
        'quantidade', 
        'usuario', 
        'origem_destino'
    )
    
    list_filter = ('tipo_movimento', 'data_movimento', 'produto')
    search_fields = ('produto__nome', 'usuario__username', 'numero_serial')
    
    # Como é histórico, é bom deixar como leitura para não fraudarem o histórico
    # Se precisar editar, comente a linha abaixo
    readonly_fields = ('data_movimento', 'usuario')

    def origem_destino(self, obj):
        if obj.tipo_movimento == 'SAIDA' and obj.cliente:
            return f"Cliente: {obj.cliente.razao_social}"
        elif obj.tipo_movimento == 'ENTRADA' and obj.fornecedor:
            return f"Fornecedor: {obj.fornecedor.razao_social}"
        return "-"
    origem_destino.short_description = 'Origem/Destino'