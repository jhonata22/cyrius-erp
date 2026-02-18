from rest_framework import serializers
from .models import Equipe
from .services import criar_membro_equipe

class EquipeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)
    usuario_id = serializers.IntegerField(source='usuario.id', read_only=True)

    class Meta:
        model = Equipe
        fields = ['id', 'nome', 'cargo', 'custo_hora', 'username', 'foto', 'usuario_id']
        read_only_fields = ['usuario', 'username', 'usuario_id']
        
    def create(self, validated_data):
        # Chama o serviço para criar o User + Equipe
        return criar_membro_equipe(
            nome=validated_data.get('nome'),
            cargo=validated_data.get('cargo'),
            custo_hora=validated_data.get('custo_hora'),
            foto=validated_data.get('foto')
        )