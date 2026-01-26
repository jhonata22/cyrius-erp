from django.contrib import admin
from .models import Cliente, ContatoCliente

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('razao_social', 'tipo_cliente', 'valor_contrato_mensal')
    search_fields = ('razao_social', 'cnpj', 'cpf')

admin.site.register(ContatoCliente)