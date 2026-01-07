from django.test import TestCase
from django.utils import timezone
# Estamos importando classes que AINDA NÃO EXISTEM (vai dar erro, isso é esperado)
from core.models import Cliente, Equipe, Chamado, ChamadoTecnico

class SistemaModelTest(TestCase):
    
    def setUp(self):
        # Cria um cliente para usar nos testes
        self.cliente = Cliente.objects.create(
            razao_social="Cliente Padrão",
            cnpj="00.000.000/0001-00",
            endereco="Rua A",
            valor_contrato_mensal=1000,
            dia_vencimento=5,
            tipo_cliente="CONTRATO"
        )

    def test_fluxo_completo_chamado(self):
        """
        Teste: Cria Técnico, Cria Chamado e Vincula os dois.
        """
        # 1. Tenta criar um Técnico (TB_EQUIPE)
        tecnico = Equipe.objects.create(
            nome="Jhonatas",
            cargo="Sócio",
            custo_hora=150.00
        )

        # 2. Tenta criar um Chamado (TB_CHAMADO)
        chamado = Chamado.objects.create(
            cliente=self.cliente,
            titulo="Formatacao PC",
            descricao_detalhada="PC lento",
            origem="BALCAO",
            status="ABERTO",
            prioridade="MEDIA",
            protocolo="REQ-2026-001"
        )

        # 3. Tenta vincular o Técnico ao Chamado (TB_CHAMADO_TECNICO)
        vinculo = ChamadoTecnico.objects.create(
            chamado=chamado,
            tecnico=tecnico,
            horas_trabalhadas=0
        )

        # Validações
        self.assertIsNotNone(tecnico.id)
        self.assertIsNotNone(chamado.id)
        self.assertEqual(vinculo.horas_trabalhadas, 0)

    def test_geracao_automatica_protocolo(self):
        """Teste: Cria chamado sem informar protocolo e verifica se gerou automático"""
        
        # 1. Cria chamado SEM passar o campo 'protocolo'
        chamado = Chamado.objects.create(
            cliente=self.cliente,
            titulo="Teste Protocolo Auto",
            descricao_detalhada="Verificando automação",
            origem="EMAIL"
        )

        # 2. Verifica se o protocolo foi preenchido
        self.assertIsNotNone(chamado.protocolo)
        
        # 3. Verifica o formato (Deve começar com a data de hoje: Ex '20260103')
        data_hoje = timezone.now().strftime('%Y%m%d')
        self.assertTrue(chamado.protocolo.startswith(data_hoje))