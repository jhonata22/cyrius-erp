from django.contrib import admin
from .models import LancamentoFinanceiro, DespesaRecorrente

@admin.register(LancamentoFinanceiro)
class LancamentoFinanceiroAdmin(admin.ModelAdmin):
    # Colunas da tabela
    list_display = (
        'id', 
        'descricao', 
        'get_valor_formatado', 
        'tipo_lancamento', 
        'categoria', 
        'status', 
        'data_vencimento',
        'get_cliente_nome'
    )
    
    # Filtros laterais
    list_filter = ('status', 'tipo_lancamento', 'categoria', 'data_vencimento', 'forma_pagamento')
    
    # Barra de busca
    search_fields = ('descricao', 'cliente__razao_social', 'cliente__nome', 'tecnico__nome')
    
    # Paginação
    list_per_page = 25
    
    # Ordenação padrão (mais recentes primeiro)
    ordering = ('-data_vencimento',)

    # Helpers para exibição
    def get_valor_formatado(self, obj):
        return f"R$ {obj.valor}"
    get_valor_formatado.short_description = 'Valor'

    def get_cliente_nome(self, obj):
        if obj.cliente:
            return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social
        return "-"
    get_cliente_nome.short_description = 'Cliente'

    # Estilizando cores do Status na lista (opcional, visual)
    def get_row_css(self, obj, index):
        if obj.status == 'ATRASADO':
            return 'color: red;'
        return ''

@admin.register(DespesaRecorrente)
class DespesaRecorrenteAdmin(admin.ModelAdmin):
    list_display = ('descricao', 'valor', 'dia_vencimento', 'categoria', 'ativo')
    list_filter = ('ativo', 'categoria')
    search_fields = ('descricao',)