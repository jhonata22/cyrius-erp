from django.contrib import admin
from .models import Empresa


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    # O que aparece na lista
    list_display = (
        'nome_fantasia',
        'razao_social',
        'cnpj',
        'ativa',
        'created_at',
    )

    # Filtros laterais
    list_filter = (
        'ativa',
        'created_at',
    )

    # Campos pesquisáveis (barra de busca)
    search_fields = (
        'nome_fantasia',
        'razao_social',
        'cnpj',
    )

    # Ordenação padrão
    ordering = ('nome_fantasia',)

    # Campos somente leitura
    readonly_fields = ('created_at',)

    # Organização do formulário (UX importa muito)
    fieldsets = (
        ('Identificação da Empresa', {
            'fields': (
                'razao_social',
                'nome_fantasia',
                'cnpj',
                'ativa',
            )
        }),
        ('Identidade Visual', {
            'fields': (
                'logo',
                'cor_primaria',
                'cor_secundaria',
            )
        }),
        ('Dados Bancários', {
            'fields': (
                'banco_nome',
                'agencia',
                'conta',
                'chave_pix',
            ),
            'classes': ('collapse',),  # 🔥 deixa recolhido
        }),
        ('Controle', {
            'fields': ('created_at',),
        }),
    )
