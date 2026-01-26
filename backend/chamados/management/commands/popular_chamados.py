import random
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.apps import apps
from django.db import transaction

# Modelos
from chamados.models import Chamado, ChamadoTecnico, ApontamentoHoras
from equipe.models import Equipe
from clientes.models import Cliente
from financeiro.models import LancamentoFinanceiro
from infra.models import Ativo

class Command(BaseCommand):
    help = 'Gera chamados, visitas e OS simulando o fluxo real da empresa'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('--- INICIANDO SIMULAÇÃO DE CHAMADOS ---'))

        # 1. SETUP DA EQUIPE (CORRIGIDO: Removido 'ativo' e adicionado cargos reais)
        # Tupla: (Nome, Cargo)
        membros_equipe = [
            ("Jhonatas", "Sócio"), 
            ("Kevin", "Técnico"), 
            ("Gabriel", "Gestor")
        ]
        
        tecnicos_objs = []
        
        for nome, cargo in membros_equipe:
            # Tenta criar sem o campo 'ativo', pois ele deu erro
            try:
                tec, created = Equipe.objects.get_or_create(
                    nome=nome,
                    defaults={'cargo': cargo} 
                )
                tecnicos_objs.append(tec)
                if created:
                    self.stdout.write(f"👤 Membro criado: {nome} ({cargo})")
                else:
                    self.stdout.write(f"ℹ️ Membro já existia: {nome}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erro ao criar equipe {nome}: {e}"))

        if not tecnicos_objs:
             self.stdout.write(self.style.ERROR("❌ Falha ao carregar equipe. Verifique o model Equipe."))
             return

        # 2. CARREGAR CLIENTES E ATIVOS
        clientes = list(Cliente.objects.filter(ativo=True))
        ativos = list(Ativo.objects.all())
        
        if not clientes:
            self.stdout.write(self.style.ERROR("❌ Nenhum cliente encontrado. Rode o seed de clientes primeiro."))
            return

        # 3. LISTAS DE DADOS FICTÍCIOS
        problemas_remotos = [
            ("Lentidão no sistema", "Usuário relata travamento ao acessar ERP."),
            ("Erro de impressão", "Impressora não mapeada na rede."),
            ("Configuração de Email", "Outlook pedindo senha constantemente."),
            ("Instalação de Office", "Setup de nova máquina para colaborador."),
            ("Acesso VPN", "Erro de credenciais na VPN.")
        ]
        
        problemas_visita = [
            ("Sem internet", "Roteador principal parou, rede offline."),
            ("Computador não liga", "Possível problema na fonte ou placa mãe."),
            ("Cabeamento estruturado", "Ponto de rede danificado na sala de reunião."),
            ("Instalação de Servidor", "Setup físico do novo servidor Dell."),
            ("Manutenção Preventiva", "Limpeza física e organização do rack.")
        ]

        # 4. GERAÇÃO DOS CHAMADOS
        total_gerados = 0
        hoje = timezone.now()

        # Vamos gerar dados de 90 dias atrás até 7 dias na frente
        data_inicio = hoje - timedelta(days=90)
        
        with transaction.atomic():
            for cliente in clientes:
                # Quantidade aleatória de chamados por cliente (entre 3 e 12)
                qtd_chamados = random.randint(3, 12)
                
                for _ in range(qtd_chamados):
                    # Define data aleatória
                    dias_aleatorios = random.randint(0, 97) 
                    data_chamado = data_inicio + timedelta(days=dias_aleatorios)
                    
                    # Define Tipo e Status baseado na data
                    is_futuro = data_chamado > hoje
                    is_recente = data_chamado > (hoje - timedelta(days=2))
                    
                    if is_futuro:
                        status = 'AGENDADO'
                        tipo = 'VISITA'
                        titulo, desc = random.choice(problemas_visita)
                    else:
                        # 70% chance de ser Remoto, 30% Visita
                        if random.random() < 0.7:
                            tipo = 'REMOTO'
                            titulo, desc = random.choice(problemas_remotos)
                        else:
                            tipo = 'VISITA'
                            titulo, desc = random.choice(problemas_visita)
                        
                        # Status passado
                        if is_recente:
                            status = random.choice(['ABERTO', 'EM_ANDAMENTO'])
                        else:
                            status = 'FINALIZADO'

                    # Ativo Vinculado (Opcional)
                    ativo_vinculado = random.choice(ativos) if ativos and random.random() > 0.5 else None

                    # Cria o Chamado
                    chamado = Chamado(
                        cliente=cliente,
                        ativo=ativo_vinculado,
                        titulo=titulo,
                        descricao_detalhada=desc,
                        origem=random.choice(['WHATSAPP', 'TELEFONE', 'EMAIL']),
                        prioridade=random.choice(['BAIXA', 'MEDIA', 'ALTA']),
                        tipo_atendimento=tipo,
                        status=status,
                        data_abertura=data_chamado,
                        # Valores monetários
                        valor_servico=Decimal(random.randint(80, 400)) if cliente.tipo_cliente == 'AVULSO' else Decimal(0),
                        custo_ida=Decimal(random.randint(15, 30)) if tipo == 'VISITA' else Decimal(0),
                        custo_volta=Decimal(random.randint(15, 30)) if tipo == 'VISITA' else Decimal(0)
                    )
                    
                    # Calcula total transporte no save()
                    chamado.save()

                    # Data de agendamento se for visita
                    if tipo == 'VISITA':
                        chamado.data_agendamento = data_chamado + timedelta(hours=random.randint(1, 24))
                        chamado.save()

                    # VINCULAR TÉCNICO (ChamadoTecnico)
                    tecnico_responsavel = random.choice(tecnicos_objs)
                    ct = ChamadoTecnico.objects.create(
                        chamado=chamado,
                        tecnico=tecnico_responsavel,
                        horas_trabalhadas=Decimal(random.randint(1, 4)) if status == 'FINALIZADO' else 0
                    )

                    # APONTAMENTO DE HORAS (Se já começou)
                    if status in ['EM_ANDAMENTO', 'FINALIZADO']:
                        ApontamentoHoras.objects.create(
                            chamado_tecnico=ct,
                            horas_gastas=ct.horas_trabalhadas,
                            descricao_tecnica=f"Realizado procedimento de {titulo.lower()}.",
                            data_apontamento=data_chamado + timedelta(hours=1)
                        )

                    # FINALIZAÇÃO E FINANCEIRO
                    if status == 'FINALIZADO':
                        chamado.data_fechamento = data_chamado + timedelta(hours=2)
                        chamado.resolucao = "Problema resolvido com sucesso. Testes realizados."
                        chamado.save()

                        # Simula a lógica do services.py para gerar financeiro
                        self.gerar_financeiro_simulado(chamado, tecnico_responsavel)

                    total_gerados += 1

        self.stdout.write(self.style.SUCCESS(f'🚀 SUCESSO! {total_gerados} chamados gerados e distribuídos na linha do tempo.'))

    def gerar_financeiro_simulado(self, chamado, tecnico):
        """
        Replica a lógica simplificada de geração financeira para popular o dashboard
        """
        # 1. Cobrança de Serviço Avulso
        if chamado.cliente.tipo_cliente == 'AVULSO' and chamado.valor_servico > 0:
            LancamentoFinanceiro.objects.create(
                cliente=chamado.cliente,
                descricao=f"Atendimento Avulso - #{chamado.protocolo}",
                valor=chamado.valor_servico,
                tipo_lancamento='ENTRADA',
                categoria='SERVICO',
                status='PENDENTE' if random.random() > 0.2 else 'PAGO', # 80% chance de estar pago se for antigo
                data_vencimento=chamado.data_fechamento.date(),
                data_pagamento=chamado.data_fechamento.date() if random.random() > 0.2 else None,
                forma_pagamento='PIX'
            )
            chamado.financeiro_gerado = True
            chamado.save()

        # 2. Reembolso de Deslocamento (Custo)
        if chamado.custo_transporte > 0:
            LancamentoFinanceiro.objects.create(
                cliente=chamado.cliente,
                descricao=f"Custo do Transporte - #{chamado.protocolo} ({tecnico.nome})",
                valor=chamado.custo_transporte,
                tipo_lancamento='SAIDA',
                categoria='DESPESA',
                status='PAGO', # Assumindo que a empresa já pagou o técnico
                data_vencimento=chamado.data_fechamento.date(),
                data_pagamento=chamado.data_fechamento.date()
            )