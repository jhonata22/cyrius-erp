from django.contrib import admin
from .models import (
    Cliente, Equipe, Ativo, Chamado, 
    ChamadoTecnico, ApontamentoHoras, 
    EquipamentoEntrada, LancamentoFinanceiro
)

# 1. Configuração do Inline (Técnicos dentro do Chamado)
class ChamadoTecnicoInline(admin.TabularInline):
    model = ChamadoTecnico
    extra = 1
    autocomplete_fields = ['tecnico']

# 2. Configuração do Cliente
@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('razao_social', 'tipo_cliente', 'valor_contrato_mensal')
    search_fields = ('razao_social', 'cnpj', 'cpf')

# 3. Configuração da Equipe
@admin.register(Equipe)
class EquipeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cargo')
    search_fields = ('nome',)

# 4. Configuração do Chamado com o Inline
@admin.register(Chamado)
class ChamadoAdmin(admin.ModelAdmin):
    list_display = ('protocolo', 'titulo', 'cliente', 'status', 'prioridade')
    list_filter = ('status', 'prioridade')
    search_fields = ('protocolo', 'titulo')
    inlines = [ChamadoTecnicoInline]

# 5. Registro simples das demais tabelas
admin.site.register(Ativo)
admin.site.register(ApontamentoHoras)
admin.site.register(EquipamentoEntrada)
admin.site.register(LancamentoFinanceiro)