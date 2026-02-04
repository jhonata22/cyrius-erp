from django.contrib import admin
from .models import OrdemServico, ItemServico, AnexoServico, Notificacao

# --- INLINES (Tabelas dentro da OS) ---

class ItemServicoInline(admin.TabularInline):
    model = ItemServico
    extra = 0 # Não mostra linhas vazias extras
    min_num = 0
    # Importante: autocomplete_fields exige que 'Produto' tenha search_fields no estoque/admin.py
    autocomplete_fields = ['produto'] 
    fields = ('produto', 'quantidade', 'preco_venda', 'get_subtotal')
    readonly_fields = ('get_subtotal',)

    def get_subtotal(self, obj):
        if obj.quantidade and obj.preco_venda:
            return f"R$ {obj.quantidade * obj.preco_venda:.2f}"
        return "R$ 0.00"
    get_subtotal.short_description = "Subtotal"

class AnexoServicoInline(admin.TabularInline):
    model = AnexoServico
    extra = 0
    fields = ('arquivo', 'tipo', 'descricao', 'uploaded_at')
    readonly_fields = ('uploaded_at',)

# --- ADMIN PRINCIPAL ---

@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 
        'titulo', 
        'get_cliente', 
        'status', 
        'tipo', 
        'tecnico_responsavel', 
        'data_entrada',
        'get_valor_total'
    )
    
    list_filter = ('status', 'tipo', 'data_entrada', 'tecnico_responsavel')
    
    search_fields = (
        'titulo', 
        'descricao_problema', 
        'cliente__razao_social', 
        'cliente__nome', 
        'id'
    )
    
    # Adicione campos de busca no Cliente e Equipe para estes autocompletes funcionarem
    autocomplete_fields = ['cliente', 'tecnico_responsavel', 'ativo']
    
    readonly_fields = ('created_at', 'updated_at', 'get_valor_total')
    
    inlines = [ItemServicoInline, AnexoServicoInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('titulo', 'cliente', 'tecnico_responsavel', 'ativo', 'status', 'tipo')
        }),
        ('Detalhamento', {
            'fields': ('descricao_problema', 'relatorio_tecnico')
        }),
        ('Datas', {
            'fields': ('data_entrada', 'data_previsao', 'data_conclusao', 'data_finalizacao')
        }),
        ('Financeiro', {
            'fields': ('valor_mao_de_obra', 'desconto', 'custo_deslocamento', 'custo_terceiros', 'get_valor_total')
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',) # Esconde essa seção por padrão
        }),
    )

    def get_cliente(self, obj):
        return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social
    get_cliente.short_description = 'Cliente'

    def get_valor_total(self, obj):
        return f"R$ {obj.valor_total_geral:.2f}"
    get_valor_total.short_description = 'Total Geral'

# --- OUTROS ---

@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'destinatario', 'tipo', 'lida', 'data_criacao')
    list_filter = ('tipo', 'lida', 'data_criacao')
    search_fields = ('titulo', 'mensagem', 'destinatario__username')
    readonly_fields = ('data_criacao',)