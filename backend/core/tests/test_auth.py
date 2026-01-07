from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

class AuthenticationTests(APITestCase):
    def setUp(self):
        # Cria um usuário de teste
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.login_url = '/api/token/' # URL que vamos criar
        self.chamados_url = '/api/chamados/'

    def test_obter_token_jwt(self):
        """Teste: Usuário envia login/senha e recebe um Token de acesso"""
        data = {
            'username': 'testuser',
            'password': 'password123'
        }
        response = self.client.post(self.login_url, data)
        
        # Esperamos sucesso (200) e que venha o token 'access' na resposta
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_acesso_negado_sem_token(self):
        """Teste: Tentar acessar chamados sem estar logado deve ser proibido (401)"""
        # Limpa qualquer credencial
        self.client.credentials() 
        
        response = self.client.get(self.chamados_url)
        
        # Por enquanto isso vai FALHAR, pois nossa API ainda é pública (vai dar 200)
        # Queremos que dê 401 (Unauthorized)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)