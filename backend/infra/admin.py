from django.contrib import admin
from .models import Ativo

@admin.register(Ativo)
class AtivoAdmin(admin.ModelAdmin):
    # Agora 'numero_serial' existe no model, então vai funcionar
    list_display = ('nome', 'tipo', 'numero_serial', 'marca_modelo', 'cliente')
    
    # Campos que podem ser pesquisados na barra de busca e pelo autocomplete da OS
    search_fields = ('nome', 'numero_serial', 'anydesk_id', 'marca_modelo', 'descricao') 
    
    list_filter = ('tipo', 'cliente')