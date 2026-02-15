from django.contrib import admin
from .models import Chamado, ChamadoTecnico, ApontamentoHoras, EquipamentoEntrada, AssuntoChamado, ComentarioChamado

# Permite visualizar/editar os técnicos dentro da tela do Chamado
class ChamadoTecnicoInline(admin.TabularInline):
    model = ChamadoTecnico
    extra = 0 # Não mostra linhas vazias extras
    autocomplete_fields = ['tecnico'] # Facilita buscar se tiver muitos técnicos

# Permite ver detalhes do equipamento de laboratório dentro do Chamado
class EquipamentoEntradaInline(admin.StackedInline):
    model = EquipamentoEntrada
    extra = 0

class ComentarioChamadoInline(admin.TabularInline):
    model = ComentarioChamado
    extra = 0
    readonly_fields = ('autor', 'created_at')
    fields = ('texto', 'autor', 'created_at')

@admin.register(Chamado)
class ChamadoAdmin(admin.ModelAdmin):
    # O que aparece na lista (colunas)
    list_display = (
        'id', 
        'protocolo', 
        'get_cliente_nome', 
        'titulo', 
        'status', 
        'prioridade', 
        'tipo_atendimento',
        'tecnico', # Técnico responsável principal
        'data_abertura'
    )
    
    # Filtros laterais (barra direita)
    list_filter = ('status', 'prioridade', 'tipo_atendimento', 'data_abertura', 'financeiro_gerado')
    
    # Barra de pesquisa (busca por protocolo, cliente, título, etc)
    search_fields = ('protocolo', 'titulo', 'descricao_detalhada', 'cliente__razao_social', 'cliente__nome')
    
    # Campos somente leitura (para ninguém editar data de criação manual sem querer)
    readonly_fields = ('created_at', 'updated_at', 'protocolo')
    
    # Inlines (Tabelas filhas dentro do chamado)
    inlines = [ChamadoTecnicoInline, EquipamentoEntradaInline, ComentarioChamadoInline]

    # Paginação
    list_per_page = 20

    # Helper para mostrar nome do cliente bonito
    def get_cliente_nome(self, obj):
        return obj.cliente.nome if obj.cliente.nome else obj.cliente.razao_social
    get_cliente_nome.short_description = 'Cliente'

# Registrando os outros models caso queira acessá-los individualmente
@admin.register(ChamadoTecnico)
class ChamadoTecnicoAdmin(admin.ModelAdmin):
    list_display = ('id', 'chamado', 'tecnico', 'horas_trabalhadas')
    list_filter = ('tecnico',)

@admin.register(ApontamentoHoras)
class ApontamentoHorasAdmin(admin.ModelAdmin):
    list_display = ('id', 'chamado_tecnico', 'data_apontamento', 'horas_gastas')
@admin.register(AssuntoChamado)
class AssuntoChamadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'ativo', 'created_at')
    search_fields = ('titulo',)
    list_editable = ('ativo',)

@admin.register(ComentarioChamado)
class ComentarioChamadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'chamado', 'autor', 'texto', 'created_at')
    list_filter = ('autor', 'created_at')
    search_fields = ('texto', 'chamado__protocolo')