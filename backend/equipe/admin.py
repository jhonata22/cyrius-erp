from django.contrib import admin
from .models import Equipe

@admin.register(Equipe)
class EquipeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cargo')
    search_fields = ('nome',)