from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from core.models import Equipe

class EquipeUserTest(APITestCase):
    def setUp(self):
        # Cria um admin para poder postar na API (pois ela é protegida)
        self.user = User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
        self.client.force_authenticate(user=self.user)

    def test_criar_equipe_gera_usuario_automatico(self):
        """Teste: Ao criar um membro da equipe via API, deve criar um User automaticamente"""
        data = {
            "nome": "Carlos Teste",
            "cargo": "TECNICO",
            "custo_hora": 100.00
        }
        
        # 1. Faz o POST na API
        response = self.client.post('/api/equipe/', data)
        self.assertEqual(response.status_code, 201) # Created

        # 2. Verifica se o USER foi criado no banco
        # Esperamos username 'carlosteste'
        usuario_criado = User.objects.filter(username='carlosteste').first()
        self.assertIsNotNone(usuario_criado)
        
        # 3. Verifica se a EQUIPE foi vinculada
        membro_equipe = Equipe.objects.get(nome="Carlos Teste")
        self.assertEqual(membro_equipe.usuario, usuario_criado)