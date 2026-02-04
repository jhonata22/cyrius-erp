from django.contrib import admin
from .models import Cliente, ContatoCliente

class ContatoInline(admin.TabularInline):
    model = ContatoCliente
    extra = 0

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('razao_social', 'nome', 'cnpj', 'ativo')
    # OBRIGATÓRIO:
    search_fields = ('razao_social', 'nome', 'cnpj', 'cpf')
    inlines = [ContatoInline]