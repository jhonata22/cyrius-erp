from rest_framework import serializers
from .models import Empresa

class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        # Adicionei eh_matriz, chave_pix e banco_nome
        fields = [
            'id', 'nome_fantasia', 'razao_social', 'cnpj', 
            'cor_primaria', 'logo', 'eh_matriz',
            'banco_nome', 'chave_pix'
        ]