import re # <--- IMPORTANTE: Adicione este import no topo
from rest_framework import serializers
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, 
    ContaEmail, DocumentacaoTecnica, ContratoCliente, EmailGestao
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

class EmailGestaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailGestao
        fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    # Nested Relations (Leitura)
    contatos = ContatoClienteSerializer(many=True, read_only=True)
    provedores = ProvedorInternetSerializer(many=True, read_only=True)
    contas_email = ContaEmailSerializer(many=True, read_only=True)
    contratos = ContratoClienteSerializer(many=True, read_only=True)
    nome_exibicao = serializers.SerializerMethodField()
    
    documentacao_tecnica = serializers.SerializerMethodField()
    email_gestao = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = '__all__'

    def get_nome_exibicao(self, obj):
        return obj.nome if obj.nome else obj.razao_social

    def get_documentacao_tecnica(self, obj):
        """
        Retorna os dados da documentação técnica associada, ou null se não existir.
        Trata o caso de RelatedObjectDoesNotExist para relações OneToOne reversas.
        """
        try:
            doc = obj.documentacao_tecnica
            return DocumentacaoTecnicaSerializer(doc).data
        except DocumentacaoTecnica.DoesNotExist:
            return None

    def get_email_gestao(self, obj):
        try:
            return EmailGestaoSerializer(obj.email_gestao).data
        except EmailGestao.DoesNotExist:
            return None

    # === VALIDAÇÕES DE SEGURANÇA E LIMPEZA ===

    def validate_cpf(self, value):
        """
        Remove pontuação do CPF e valida se tem 11 dígitos.
        """
        if not value:
            return value
        
        # Remove tudo que NÃO for número
        clean_value = re.sub(r'\D', '', str(value))

        if len(clean_value) != 11:
            raise serializers.ValidationError("O CPF deve conter exatamente 11 dígitos numéricos.")
        
        return clean_value

    def validate_cnpj(self, value):
        """
        Remove pontuação do CNPJ e valida se tem 14 dígitos.
        """
        if not value:
            return value
            
        # Remove tudo que NÃO for número
        clean_value = re.sub(r'\D', '', str(value))

        if len(clean_value) != 14:
            raise serializers.ValidationError("O CNPJ deve conter exatamente 14 dígitos numéricos.")
            
        return clean_value

    def validate(self, data):
        """
        Validação geral cruzada (Ex: Garantir que tem CPF OU CNPJ)
        """
        # Exemplo opcional: Garantir que pelo menos um documento foi enviado
        # if not data.get('cpf') and not data.get('cnpj'):
        #     raise serializers.ValidationError("É necessário informar CPF ou CNPJ.")
        return data

    def create(self, validated_data):
        """
        Garante que o cliente seja criado como Ativo se o campo não for passado
        """
        if 'ativo' not in validated_data:
            validated_data['ativo'] = True
            
        return super().create(validated_data)