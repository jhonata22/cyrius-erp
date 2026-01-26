from rest_framework import serializers
from .models import Ativo
# Importamos o MODELO direto, não o Serializer (para evitar loops)
from chamados.models import Chamado 

# --- 1. Serializer "Leve" (Apenas para exibir na lista do Ativo) ---
class HistoricoChamadoResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chamado
        fields = ['id', 'titulo', 'status', 'created_at', 'prioridade', 'protocolo']

# --- 2. O Serializer Principal ---
class AtivoSerializer(serializers.ModelSerializer):
    nome_cliente = serializers.CharField(source='cliente.razao_social', read_only=True)
    
    # Campo calculado manualmente
    historico_servicos = serializers.SerializerMethodField()

    class Meta:
        model = Ativo
        fields = [
            'id', 'cliente', 'nome_cliente', 'nome', 'tipo', 
            'marca_modelo', 'anydesk_id', 'ip_local',
            'historico_servicos'
        ]

    def get_historico_servicos(self, obj):
        """
        FILTRAGEM MANUAL E EXPLÍCITA:
        Em vez de confiar na relação automática, vamos no banco
        e pedimos: 'Me dê os chamados onde o ativo_id é igual a este ID'
        """
        try:
            # ADICIONEI ESTE PRINT PARA VOCÊ VER NO TERMINAL DO DOCKER
            # Se aparecer no log, o código está funcionando.
            # print(f"DEBUG: Buscando chamados para Ativo ID: {obj.id} - {obj.nome}")

            # Busca direta no banco de dados
            qs = Chamado.objects.filter(ativo_id=obj.id).order_by('-created_at')
            
            return HistoricoChamadoResumoSerializer(qs, many=True).data
        except Exception as e:
            print(f"ERRO AO SERIALIZAR HISTÓRICO: {e}")
            return []