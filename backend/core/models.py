from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

# =====================================================
# 1. TB_CLIENTE
# =====================================================
class Cliente(models.Model):
    class TipoCliente(models.TextChoices):
        CONTRATO = 'CONTRATO', 'Contrato'
        AVULSO = 'AVULSO', 'Avulso'

    razao_social = models.CharField(max_length=100)
    cpf = models.CharField(max_length=11, null=True, blank=True)
    cnpj = models.CharField(max_length=18, null=True, blank=True)
    endereco = models.CharField(max_length=150)
    valor_contrato_mensal = models.DecimalField(max_digits=10, decimal_places=2)
    dia_vencimento = models.PositiveSmallIntegerField()
    tipo_cliente = models.CharField(max_length=20, choices=TipoCliente.choices)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'TB_CLIENTE'
        verbose_name = 'Cliente'

    def __str__(self):
        return self.razao_social

# =====================================================
# 1.1 TB_CONTATO_CLIENTE (NOVO: Gestores e Contatos Chave)
# =====================================================
class ContatoCliente(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contatos')
    nome = models.CharField(max_length=100)
    cargo = models.CharField(max_length=50) # Ex: Gestor, Financeiro, TI Local
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_principal = models.BooleanField(default=False)

    class Meta:
        db_table = 'TB_CONTATO_CLIENTE'

# =====================================================
# 1.2 TB_PROVEDOR_INTERNET (NOVO)
# =====================================================
class ProvedorInternet(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='provedores')
    nome_operadora = models.CharField(max_length=50) # Ex: Vivo, Claro, Local
    plano_contratado = models.CharField(max_length=100, blank=True) # Ex: 300MB Fibra
    ip_fixo = models.CharField(max_length=50, blank=True, help_text="IP Estático se houver")
    telefone_suporte = models.CharField(max_length=20, blank=True)
    usuario_pppoe = models.CharField(max_length=100, blank=True)
    senha_pppoe = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'TB_PROVEDOR_INTERNET'

# =====================================================
# 1.3 TB_CONTA_EMAIL (NOVO: Revenda Locaweb e outros)
# =====================================================
class ContaEmail(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contas_email')
    email = models.EmailField()
    senha = models.CharField(max_length=100) # Simples por enquanto
    nome_usuario = models.CharField(max_length=100, blank=True, help_text="Nome de quem usa")
    provedor = models.CharField(max_length=50, default='Locaweb') # Locaweb, Google, Office365
    
    class Meta:
        db_table = 'TB_CONTA_EMAIL'

# =====================================================
# 2. TB_EQUIPE
# =====================================================
class Equipe(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    nome = models.CharField(max_length=100)
    cargo = models.CharField(max_length=50)
    custo_hora = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'TB_EQUIPE'

    def __str__(self):
        return self.nome

# =====================================================
# 3. TB_ATIVO (ATUALIZADO: PCs, Redes, Hardware, AnyDesk)
# =====================================================
class Ativo(models.Model):
    class TipoAtivo(models.TextChoices):
        COMPUTADOR = 'COMPUTADOR', 'Computador/Notebook'
        SERVIDOR = 'SERVIDOR', 'Servidor'
        REDE = 'REDE', 'Rede (Switch/Router/Modem)'
        IMPRESSORA = 'IMPRESSORA', 'Impressora'
        MONITOR = 'MONITOR', 'Monitor'
        PERIFERICO = 'PERIFERICO', 'Periférico/Outro'

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='ativos', db_column='id_cliente')
    
    # Identificação
    nome = models.CharField(max_length=100, help_text="Hostname ou Nome do dispositivo")
    tipo = models.CharField(max_length=20, choices=TipoAtivo.choices)
    marca_modelo = models.CharField(max_length=100, blank=True)
    
    # Detalhes Técnicos (Hardware)
    processador = models.CharField(max_length=100, blank=True)
    memoria_ram = models.CharField(max_length=50, blank=True)
    armazenamento = models.CharField(max_length=100, blank=True) # SSD 240GB, etc.
    sistema_operacional = models.CharField(max_length=50, blank=True)
    
    # Acesso Remoto e Credenciais Locais
    anydesk_id = models.CharField(max_length=50, blank=True)
    usuario_local = models.CharField(max_length=50, blank=True)
    senha_local = models.CharField(max_length=100, blank=True)
    ip_local = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'TB_ATIVO'

    def __str__(self):
        return f"{self.nome} ({self.tipo})"

# =====================================================
# 3.1 TB_DOCUMENTACAO_TECNICA (NOVO: Textos Longos e Estrutura)
# =====================================================
class DocumentacaoTecnica(models.Model):
    # Relacionamento 1 para 1 com Cliente (Cada cliente tem 1 ficha técnica geral)
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name='documentacao_tecnica')
    
    # Configurações Específicas
    configuracao_mikrotik = models.TextField(blank=True, help_text="Scripts, regras de firewall e rotas")
    estrutura_servidores = models.TextField(blank=True, help_text="Descrição do AD, DNS, DHCP, funções dos servidores")
    topologia_rede = models.TextField(blank=True, help_text="Descrição física da rede, cascateamento, VLANs")
    
    # Backup e Segurança
    rotina_backup = models.TextField(blank=True, help_text="Como é feito o backup e onde é salvo")
    
    # Análise Consultiva
    pontos_fracos_melhorias = models.TextField(blank=True, help_text="Relatório de gargalos e sugestões de upgrade")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'TB_DOCUMENTACAO_TECNICA'

# =====================================================
# 4. TB_CHAMADO (Mantido)
# =====================================================
class Chamado(models.Model):
    class Status(models.TextChoices):
        ABERTO = 'ABERTO', 'Aberto'
        EM_ANDAMENTO = 'EM_ANDAMENTO', 'Em Andamento'
        FINALIZADO = 'FINALIZADO', 'Finalizado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    class Prioridade(models.TextChoices):
        BAIXA = 'BAIXA', 'Baixa'
        MEDIA = 'MEDIA', 'Média'
        ALTA = 'ALTA', 'Alta'
        CRITICA = 'CRITICA', 'Crítica'

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, db_column='id_cliente')
    titulo = models.CharField(max_length=100)
    descricao_detalhada = models.TextField(max_length=500)
    origem = models.CharField(max_length=50)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTO)
    prioridade = models.CharField(max_length=20, choices=Prioridade.choices, default=Prioridade.MEDIA)
    
    protocolo = models.CharField(max_length=30, unique=True, blank=True)
    
    data_abertura = models.DateTimeField(default=timezone.now)
    data_fechamento = models.DateTimeField(null=True, blank=True)
    
    tecnicos = models.ManyToManyField(Equipe, through='ChamadoTecnico')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'TB_CHAMADO'

    def __str__(self):
        return self.protocolo

    def save(self, *args, **kwargs):
        if not self.protocolo:
            hoje = timezone.now().strftime('%Y%m%d')
            ultimo_chamado = Chamado.objects.filter(protocolo__startswith=hoje).order_by('protocolo').last()
            sequencia = int(ultimo_chamado.protocolo[-3:]) + 1 if ultimo_chamado else 1
            self.protocolo = f"{hoje}{str(sequencia).zfill(3)}"
        super().save(*args, **kwargs)

# =====================================================
# 5. TB_CHAMADO_TECNICO (Mantido)
# =====================================================
class ChamadoTecnico(models.Model):
    chamado = models.ForeignKey(Chamado, on_delete=models.CASCADE, db_column='id_chamado')
    tecnico = models.ForeignKey(Equipe, on_delete=models.PROTECT, db_column='id_tecnico')
    horas_trabalhadas = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        db_table = 'TB_CHAMADO_TECNICO'
        unique_together = ('chamado', 'tecnico')

# =====================================================
# 6. TB_APONTAMENTO_HORAS (Mantido)
# =====================================================
class ApontamentoHoras(models.Model):
    chamado_tecnico = models.ForeignKey(ChamadoTecnico, on_delete=models.CASCADE, related_name='apontamentos', db_column='id_chamado_tecnico')
    horas_gastas = models.DecimalField(max_digits=5, decimal_places=2)
    descricao_tecnica = models.CharField(max_length=255)
    data_apontamento = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'TB_APONTAMENTO_HORAS'

# =====================================================
# 7. TB_EQUIPAMENTO_ENTRADA (Mantido)
# =====================================================
class EquipamentoEntrada(models.Model):
    chamado = models.OneToOneField(Chamado, on_delete=models.CASCADE, related_name='equipamento_laboratorio', db_column='id_chamado')
    marca_modelo = models.CharField(max_length=100)
    numero_serie = models.CharField(max_length=50, null=True, blank=True)
    acessorios = models.CharField(max_length=150, null=True, blank=True)
    estado_conservacao = models.CharField(max_length=100, null=True, blank=True)
    defeito_relatado = models.TextField(max_length=500)
    data_entrada = models.DateField(default=timezone.now)
    data_prevista_entrega = models.DateField()
    relatorio_tecnico = models.TextField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = 'TB_EQUIPAMENTO_ENTRADA'

# =====================================================
# 8. TB_LANCAMENTO_FINANCEIRO (Mantido)
# =====================================================
class LancamentoFinanceiro(models.Model):
    class StatusFinanceiro(models.TextChoices):
        PENDENTE = 'PENDENTE', 'Pendente'
        PAGO = 'PAGO', 'Pago'
        CANCELADO = 'CANCELADO', 'Cancelado'
    
    class TipoLancamento(models.TextChoices):
        ENTRADA = 'ENTRADA', 'Entrada'
        SAIDA = 'SAIDA', 'Saída'

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, db_column='id_cliente')
    descricao = models.CharField(max_length=150)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=StatusFinanceiro.choices)
    tipo_lancamento = models.CharField(max_length=20, choices=TipoLancamento.choices)
    data_vencimento = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TB_LANCAMENTO_FINANCEIRO'