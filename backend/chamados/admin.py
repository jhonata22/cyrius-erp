from django.contrib import admin
from .models import (
    AssuntoChamado, 
    Chamado, 
    ChamadoTecnico, 
    ApontamentoHoras, 
    EquipamentoEntrada, 
    ComentarioChamado
)

@admin.register(AssuntoChamado)
class AssuntoChamadoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'ativo', 'created_at')
    list_filter = ('ativo',)
    search_fields = ('titulo',)
    ordering = ('titulo',)

@admin.register(Chamado)
class ChamadoAdmin(admin.ModelAdmin):
    # O que aparece na listagem principal
    list_display = (
        'protocolo', 
        'get_titulo_ou_assuntos', 
        'cliente', 
        'empresa', 
        'status', 
        'prioridade', 
        'created_at'
    )
    
    # Filtros laterais
    list_filter = ('status', 'prioridade', 'tipo_atendimento', 'empresa', 'origem')
    
    # Barra de pesquisa
    search_fields = ('protocolo', 'titulo', 'cliente__razao_social', 'cliente__nome')
    
    # Transforma o campo M2M (Assuntos) em um widget duplo super bonito (Disponíveis vs Escolhidos)
    filter_horizontal = ('assuntos',)
    
    # Campos que o usuário não pode editar manualmente para não quebrar regras de negócio
    readonly_fields = ('protocolo', 'custo_transporte', 'created_at', 'updated_at')

    # Organiza a tela de edição em blocos expansíveis
    fieldsets = (
        ('Informações Principais', {
            'fields': (
                'protocolo', 'empresa', 'cliente', 'solicitante', 
                'titulo', 'assuntos', 'descricao_detalhada'
            )
        }),
        ('Classificação e Status', {
            'fields': ('status', 'prioridade', 'tipo_atendimento', 'origem')
        }),
        ('Atribuição', {
            'fields': ('tecnico', 'ativo')
        }),
        ('Datas', {
            'fields': ('data_abertura', 'data_agendamento', 'data_fechamento', 'created_at', 'updated_at')
        }),
        ('Custos e Financeiro', {
            'fields': ('custo_ida', 'custo_volta', 'custo_transporte', 'valor_servico', 'financeiro_gerado')
        }),
        ('Resolução', {
            'fields': ('resolucao', 'arquivo_conclusao')
        }),
        ('Anexos Extras', {
            'fields': ('arquivo_1', 'arquivo_2', 'foto_antes', 'foto_depois'),
            'classes': ('collapse',) # Deixa essa sessão recolhida por padrão
        }),
    )

    # Função customizada para mostrar o título ou os assuntos separados por vírgula na listagem
    def get_titulo_ou_assuntos(self, obj):
        if obj.titulo:
            return obj.titulo
        assuntos = ", ".join([a.titulo for a in obj.assuntos.all()])
        return assuntos if assuntos else "Sem título"
    get_titulo_ou_assuntos.short_description = 'Título / Assuntos'


@admin.register(ChamadoTecnico)
class ChamadoTecnicoAdmin(admin.ModelAdmin):
    list_display = ('chamado', 'tecnico', 'horas_trabalhadas')
    search_fields = ('chamado__protocolo', 'tecnico__nome')
    list_filter = ('tecnico',)

@admin.register(ApontamentoHoras)
class ApontamentoHorasAdmin(admin.ModelAdmin):
    list_display = ('chamado_tecnico', 'horas_gastas', 'data_apontamento')
    list_filter = ('data_apontamento',)
    search_fields = ('descricao_tecnica',)

@admin.register(EquipamentoEntrada)
class EquipamentoEntradaAdmin(admin.ModelAdmin):
    list_display = ('chamado', 'marca_modelo', 'numero_serie', 'data_entrada', 'data_prevista_entrega')
    search_fields = ('marca_modelo', 'numero_serie', 'chamado__protocolo')
    list_filter = ('data_entrada', 'data_prevista_entrega')

@admin.register(ComentarioChamado)
class ComentarioChamadoAdmin(admin.ModelAdmin):
    list_display = ('chamado', 'autor', 'created_at')
    search_fields = ('texto', 'chamado__protocolo')
    list_filter = ('created_at',)