from rest_framework import serializers
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, 
    ContaEmail, DocumentacaoTecnica, ContratoCliente
)

class ContratoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContratoCliente
        fields = '__all__'

class ContatoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContatoCliente
        fields = '__all__'

class ProvedorInternetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProvedorInternet
        fields = '__all__'

class ContaEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaEmail
        fields = '__all__'

class DocumentacaoTecnicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentacaoTecnica
        fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    # Nested Relations (Leitura)
    contatos = ContatoClienteSerializer(many=True, read_only=True)
    provedores = ProvedorInternetSerializer(many=True, read_only=True)
    contas_email = ContaEmailSerializer(many=True, read_only=True)
    contratos = ContratoClienteSerializer(many=True, read_only=True)
    
    # CORREÇÃO: Sem many=True (Um cliente tem UM dossiê)
    documentacao_tecnica = DocumentacaoTecnicaSerializer(read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'