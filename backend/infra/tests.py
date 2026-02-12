from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from clientes.models import Cliente
from equipe.models import Equipe
from .models import Ativo

class SecureAssetIDFeatureTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user = User.objects.create_user(username='testuser', password='testpassword')
        Equipe.objects.create(usuario=user, nome='Test User', cargo='TECNICO')
        cls.user = user
        cls.cliente = Cliente.objects.create(razao_social='Cliente Teste', nome='Cliente Teste')
        cls.ativo = Ativo.objects.create(cliente=cls.cliente, nome='Note Teste', tipo='COMPUTADOR')

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_codigo_is_generated_on_creation(self):
        self.assertIsNotNone(self.ativo.codigo_identificacao)
        self.assertEqual(len(self.ativo.codigo_identificacao), 6)

    def test_buscar_por_codigo_success(self):
        """Testa a busca na action com a URL correta (hífens)."""
        url = f'/api/ativos/buscar-por-codigo/?codigo={self.ativo.codigo_identificacao}'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ativo.id)

    def test_buscar_por_codigo_case_insensitive(self):
        """Testa se a busca por código não diferencia maiúsculas de minúsculas."""
        url = f'/api/ativos/buscar-por-codigo/?codigo={self.ativo.codigo_identificacao.lower()}'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ativo.id)

    def test_buscar_por_codigo_not_found(self):
        url = '/api/ativos/buscar-por-codigo/?codigo=XXXXXX'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_buscar_por_codigo_missing_param(self):
        url = '/api/ativos/buscar-por-codigo/'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_without_codigo_param(self):
        """Testa se a listagem padrão (sem o parâmetro de código) ainda funciona."""
        url = '/api/ativos/'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertTrue(len(response.data) > 0)