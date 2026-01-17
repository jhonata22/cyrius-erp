import uuid  # <--- ADICIONADO
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import Sum
from core.models_base import TimeStampedModel
from core.services.financeiro import mes_esta_fechado
from django.core.exceptions import ValidationError
from core.managers import ProdutoQuerySet, LancamentoQuerySet

# =====================================================
# 1. CLIENTES E CONTATOS
# =====================================================
class Cliente(TimeStampedModel):
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
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = 'TB_CLIENTE'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['razao_social']

    def __str__(self):
        return self.razao_social

class ContatoCliente(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contatos')
    nome = models.CharField(max_length=100)
    cargo = models.CharField(max_length=50)
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_principal = models.BooleanField(default=False)
    
    class Meta: 
        db_table = 'TB_CONTATO_CLIENTE'
        verbose_name = 'Contato do Cliente'

class ProvedorInternet(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='provedores')
    nome_operadora = models.CharField(max_length=50)
    plano_contratado = models.CharField(max_length=100, blank=True)
    ip_fixo = models.CharField(max_length=50, blank=True)
    telefone_suporte = models.CharField(max_length=20, blank=True)
    usuario_pppoe = models.CharField(max_length=100, blank=True)
    senha_pppoe = models.CharField(max_length=100, blank=True)
    class Meta: db_table = 'TB_PROVEDOR_INTERNET'

class ContaEmail(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contas_email')
    email = models.EmailField()
    senha = models.CharField(max_length=100)
    nome_usuario = models.CharField(max_length=100, blank=True)
    provedor = models.CharField(max_length=50, default='Locaweb')
    class Meta: db_table = 'TB_CONTA_EMAIL'

# =====================================================
# 2. EQUIPE
# =====================================================
class Equipe(models.Model):
    # Definindo os cargos permitidos
    class Cargo(models.TextChoices):
        TECNICO = 'TECNICO', 'Técnico'
        GESTOR = 'GESTOR', 'Gestor'
        SOCIO = 'SOCIO', 'Sócio'
        ESTAGIARIO = 'ESTAGIARIO', 'Estagiário'

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    nome = models.CharField(max_length=100)
    foto = models.ImageField(upload_to='fotos_equipe/', null=True, blank=True)
    cargo = models.CharField(
        max_length=50, 
        choices=Cargo.choices, 
        default=Cargo.TECNICO
    )
    custo_hora = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'TB_EQUIPE'
        verbose_name = 'Membro da Equipe'
        verbose_name_plural = 'Equipe'

    def __str__(self):
        return self.nome

# =====================================================
# 3. ATIVOS E DOCUMENTAÇÃO
# =====================================================

class ContratoCliente(models.Model):
    cliente = models.ForeignKey(
        'Cliente', 
        on_delete=models.CASCADE, 
        related_name='contratos'
    )
    arquivo = models.FileField(upload_to='contratos/%Y/%m/') 
    descricao = models.CharField(max_length=200, verbose_name="Descrição do Contrato")
    data_upload = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TB_CONTRATO_CLIENTE'
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-data_upload']

    def __str__(self):
        return f"Contrato {self.descricao} - {self.cliente}"

class Ativo(models.Model):
    class TipoAtivo(models.TextChoices):
        COMPUTADOR = 'COMPUTADOR', 'Computador/Notebook'
        SERVIDOR = 'SERVIDOR', 'Servidor'
        REDE = 'REDE', 'Rede (Switch/Router/Modem)'
        IMPRESSORA = 'IMPRESSORA', 'Impressora'
        MONITOR = 'MONITOR', 'Monitor'
        PERIFERICO = 'PERIFERICO', 'Periférico/Outro'

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='ativos')
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TipoAtivo.choices)
    marca_modelo = models.CharField(max_length=100, blank=True)
    processador = models.CharField(max_length=100, blank=True)
    memoria_ram = models.CharField(max_length=50, blank=True)
    armazenamento = models.CharField(max_length=100, blank=True)
    sistema_operacional = models.CharField(max_length=50, blank=True)
    anydesk_id = models.CharField(max_length=50, blank=True)
    usuario_local = models.CharField(max_length=50, blank=True)
    senha_local = models.CharField(max_length=100, blank=True)
    ip_local = models.CharField(max_length=20, blank=True)

    class Meta: 
        db_table = 'TB_ATIVO'
        verbose_name = 'Ativo/Hardware'
        verbose_name_plural = 'Ativos'
        ordering = ['nome']

    def __str__(self): return f"{self.nome} ({self.tipo})"

class DocumentacaoTecnica(TimeStampedModel):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name='documentacao_tecnica')
    configuracao_mikrotik = models.TextField(blank=True)
    estrutura_servidores = models.TextField(blank=True)
    topologia_rede = models.TextField(blank=True)
    rotina_backup = models.TextField(blank=True)
    pontos_fracos_melhorias = models.TextField(blank=True)
    class Meta: db_table = 'TB_DOCUMENTACAO_TECNICA'

# =====================================================
# 4. CHAMADOS
# =====================================================

class Chamado(TimeStampedModel):
    class Status(models.TextChoices):
        ABERTO = 'ABERTO', 'Aberto'
        EM_ANDAMENTO = 'EM_ANDAMENTO', 'Em Andamento'
        FINALIZADO = 'FINALIZADO', 'Finalizado'
        CANCELADO = 'CANCELADO', 'Cancelado'
        AGENDADO = 'AGENDADO', 'Agendado (Visita)'

    class Prioridade(models.TextChoices):
        BAIXA = 'BAIXA', 'Baixa'
        MEDIA = 'MEDIA', 'Média'
        ALTA = 'ALTA', 'Alta'
        CRITICA = 'CRITICA', 'Crítica'
    
    class TipoAtendimento(models.TextChoices):
        REMOTO = 'REMOTO', 'Acesso Remoto'
        VISITA = 'VISITA', 'Visita Técnica'
        LABORATORIO = 'LABORATORIO', 'Laboratório Interno'

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT)

    ativo = models.ForeignKey(
        Ativo, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='historico_servicos',
        help_text="Equipamento que recebeu o serviço")
    
    titulo = models.CharField(max_length=100)
    descricao_detalhada = models.TextField(max_length=500)
    origem = models.CharField(max_length=50, default='TELEFONE')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTO)
    prioridade = models.CharField(max_length=20, choices=Prioridade.choices, default=Prioridade.MEDIA)
    tipo_atendimento = models.CharField(max_length=20, choices=TipoAtendimento.choices, default=TipoAtendimento.REMOTO) 
    
    data_agendamento = models.DateTimeField(null=True, blank=True)
    
    # Custos
    custo_ida = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    custo_volta = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    custo_transporte = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    protocolo = models.CharField(max_length=30, unique=True, blank=True)
    
    data_abertura = models.DateTimeField(default=timezone.now)
    data_fechamento = models.DateTimeField(null=True, blank=True)
    
    tecnicos = models.ManyToManyField(Equipe, through='ChamadoTecnico')

    class Meta: 
        db_table = 'TB_CHAMADO'
        ordering = ['-created_at']

    def __str__(self):
        return self.protocolo or f"ID {self.pk}"

    def save(self, *args, **kwargs):
        # 1. Tratamento seguro de custos
        ida = float(self.custo_ida or 0)
        volta = float(self.custo_volta or 0)
        self.custo_transporte = ida + volta

        # 2. Geração de Protocolo
        if not self.protocolo:
            hoje = timezone.now().strftime('%Y%m%d')
            ultimo = Chamado.objects.filter(protocolo__startswith=hoje).order_by('-protocolo').first()
            
            sequencia = 1
            if ultimo and ultimo.protocolo:
                try:
                    sequencia = int(ultimo.protocolo[-3:]) + 1
                except ValueError:
                    sequencia = 1
            
            self.protocolo = f"{hoje}{str(sequencia).zfill(3)}"

        super().save(*args, **kwargs)

class ChamadoTecnico(models.Model):
    chamado = models.ForeignKey(Chamado, on_delete=models.CASCADE)
    tecnico = models.ForeignKey(Equipe, on_delete=models.PROTECT)
    horas_trabalhadas = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    class Meta:
        db_table = 'TB_CHAMADO_TECNICO'
        unique_together = ('chamado', 'tecnico')

class ApontamentoHoras(models.Model):
    chamado_tecnico = models.ForeignKey(ChamadoTecnico, on_delete=models.CASCADE, related_name='apontamentos')
    horas_gastas = models.DecimalField(max_digits=5, decimal_places=2)
    descricao_tecnica = models.CharField(max_length=255)
    data_apontamento = models.DateTimeField(default=timezone.now)
    class Meta: db_table = 'TB_APONTAMENTO_HORAS'

class EquipamentoEntrada(models.Model):
    chamado = models.OneToOneField(Chamado, on_delete=models.CASCADE, related_name='equipamento_laboratorio')
    marca_modelo = models.CharField(max_length=100)
    numero_serie = models.CharField(max_length=50, null=True, blank=True)
    defeito_relatado = models.TextField(max_length=500)
    data_entrada = models.DateField(default=timezone.now)
    data_prevista_entrega = models.DateField()
    class Meta: db_table = 'TB_EQUIPAMENTO_ENTRADA'

# =====================================================
# 5. FINANCEIRO
# =====================================================
class LancamentoFinanceiro(TimeStampedModel):
    objects = LancamentoQuerySet.as_manager() 
       
    class StatusFinanceiro(models.TextChoices):
        PENDENTE = 'PENDENTE', 'Pendente'
        PAGO = 'PAGO', 'Pago'
        ATRASADO = 'ATRASADO', 'Atrasado'
        CANCELADO = 'CANCELADO', 'Cancelado'
    
    class Categoria(models.TextChoices):
        CONTRATO = 'CONTRATO', 'Mensalidade de Contrato'
        VENDA = 'VENDA', 'Venda de Hardware'
        SERVICO = 'SERVICO', 'Serviço Avulso'
        CUSTO_TEC = 'CUSTO_TEC', 'Custo Operacional Técnico'
        DESPESA = 'DESPESA', 'Despesa Administrativa'
        COMPRA = 'COMPRA', 'Compra de Estoque'
        SALARIO = 'SALARIO', 'Salário/Pessoal'
        IMPOSTO = 'IMPOSTO', 'Impostos'
        OUTRO = 'OUTRO', 'Outro'

    # NOVAS OPÇÕES DE PAGAMENTO (Enum)
    FORMA_PAGAMENTO_CHOICES = [
        ('BOLETO', 'Boleto'),
        ('CREDITO', 'Cartão de Crédito'),
        ('DEBITO', 'Cartão de Débito'),
        ('PIX', 'PIX'),
        ('DINHEIRO', 'Dinheiro'),
        ('TRANSFERENCIA', 'Transferência'),
    ]

    # Campos principais
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, null=True, blank=True)
    tecnico = models.ForeignKey(Equipe, on_delete=models.SET_NULL, null=True, blank=True)
    fornecedor = models.ForeignKey('Fornecedor', on_delete=models.SET_NULL, null=True, blank=True, related_name='lancamentos')
    
    descricao = models.CharField(max_length=150)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=StatusFinanceiro.choices, default=StatusFinanceiro.PENDENTE)
    tipo_lancamento = models.CharField(max_length=20, choices=[('ENTRADA', 'Entrada'), ('SAIDA', 'Saída')])
    categoria = models.CharField(max_length=20, choices=Categoria.choices, default=Categoria.DESPESA)
    
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)
    observacao = models.TextField(blank=True, null=True)
    arquivo_1 = models.FileField(upload_to='financeiro/comprovantes/%Y/%m/', null=True, blank=True)
    arquivo_2 = models.FileField(upload_to='financeiro/comprovantes/%Y/%m/', null=True, blank=True)

    # --- CAMPOS NOVOS PARA PARCELAMENTO ---
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO_CHOICES, default='DINHEIRO')
    parcela_atual = models.IntegerField(default=1)
    total_parcelas = models.IntegerField(default=1)
    grupo_parcelamento = models.UUIDField(null=True, blank=True, help_text="ID único para agrupar parcelas de uma mesma venda")

    class Meta: 
        db_table = 'TB_LANCAMENTO_FINANCEIRO'
        verbose_name = 'Lançamento Financeiro'
        ordering = ['-data_vencimento']

    def clean(self):
        if self.data_vencimento and mes_esta_fechado(self.data_vencimento):
            raise ValidationError(f"Mês {self.data_vencimento.month}/{self.data_vencimento.year} está fechado.")

    def save(self, *args, **kwargs):
        self.full_clean()
        # Atualiza status automático se não for PAGO
        if self.status != self.StatusFinanceiro.PAGO:
            if self.data_vencimento < timezone.now().date():
                self.status = self.StatusFinanceiro.ATRASADO
            else:
                self.status = self.StatusFinanceiro.PENDENTE
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.descricao} - {self.get_tipo_lancamento_display()}"

# --- NOVO MODELO: RECORRÊNCIA ---
class DespesaRecorrente(models.Model):
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.CharField(max_length=20, choices=LancamentoFinanceiro.Categoria.choices, default='DESPESA')
    dia_vencimento = models.IntegerField(help_text="Dia do mês que vence (1-31)")
    
    ativo = models.BooleanField(default=True)
    ultima_geracao = models.DateField(null=True, blank=True, help_text="Data em que foi gerada a última cobrança")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recorrente: {self.descricao} (Dia {self.dia_vencimento})"

class FechamentoFinanceiro(models.Model):
    ano = models.PositiveIntegerField()
    mes = models.PositiveSmallIntegerField()
    fechado_em = models.DateTimeField(auto_now_add=True)
    fechado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    class Meta: unique_together = ('ano', 'mes')

# =====================================================
# 6. ESTOQUE
# =====================================================

class Fornecedor(models.Model):
    razao_social = models.CharField(max_length=100)
    cnpj = models.CharField(max_length=18, null=True, blank=True)
    
    contato_nome = models.CharField(max_length=100, null=True, blank=True)
    telefone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)

    class Meta: 
        db_table = 'TB_FORNECEDOR'
        verbose_name = 'Fornecedor'
        verbose_name_plural = 'Fornecedores'

    def __str__(self): 
        return self.razao_social

class Produto(TimeStampedModel):
    nome = models.CharField(max_length=100)
    estoque_minimo = models.PositiveIntegerField(default=2)
    preco_venda_sugerido = models.DecimalField(max_digits=10, decimal_places=2)
    objects = ProdutoQuerySet.as_manager()

    @property
    def estoque_atual(self):
        if hasattr(self, 'estoque_real'):
            return self.estoque_real
        entradas = self.movimentacoes.filter(tipo_movimento='ENTRADA').aggregate(total=Sum('quantidade'))['total'] or 0
        saidas = self.movimentacoes.filter(tipo_movimento='SAIDA').aggregate(total=Sum('quantidade'))['total'] or 0
        return entradas - saidas

    class Meta: 
        db_table = 'TB_PRODUTO'
        verbose_name = 'Produto'
        ordering = ['nome']
    def __str__(self): return self.nome

class MovimentacaoEstoque(models.Model):
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
    ]
    
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name='movimentacoes')
    tipo_movimento = models.CharField(max_length=10, choices=TIPO_CHOICES)
    quantidade = models.IntegerField()
    data_movimento = models.DateTimeField(auto_now_add=True)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.SET_NULL, null=True, blank=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)
    numero_serial = models.CharField(max_length=100, null=True, blank=True)
    arquivo = models.FileField(upload_to='docs_estoque/', null=True, blank=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta: 
        db_table = 'TB_MOVIMENTACAO_ESTOQUE'
        verbose_name = 'Movimentação de Estoque'

    def clean(self):
        if self.produto and self.tipo_movimento == 'SAIDA' and not self.pk:
            if self.produto.estoque_atual < self.quantidade:
                raise ValidationError(f"Estoque insuficiente. Saldo atual: {self.produto.estoque_atual}")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

# =====================================================
# 7. MÓDULO DE SERVIÇOS (ORDEM DE SERVIÇO / PROJETOS)
# =====================================================

class OrdemServico(TimeStampedModel):
    class Status(models.TextChoices):
        ORCAMENTO = 'ORCAMENTO', 'Orçamento'
        APROVADO = 'APROVADO', 'Aprovado'
        EM_EXECUCAO = 'EM_EXECUCAO', 'Em Execução'
        AGUARDANDO_PECA = 'AGUARDANDO_PECA', 'Aguardando Peça'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        CANCELADO = 'CANCELADO', 'Cancelado'

    class Tipo(models.TextChoices):
        LABORATORIO = 'LABORATORIO', 'Laboratório (Interno)'
        EXTERNO = 'EXTERNO', 'Projeto Externo / Visita'
        REMOTO = 'REMOTO', 'Acesso Remoto Especializado'

    # Identificação
    titulo = models.CharField(max_length=150, help_text="Ex: Formatação PC, Instalação Câmeras")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='servicos')
    tecnico_responsavel = models.ForeignKey(Equipe, on_delete=models.PROTECT, related_name='servicos_liderados', null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.LABORATORIO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ORCAMENTO)
    
    # Detalhamento
    descricao_problema = models.TextField(verbose_name="Descrição do Pedido/Problema")
    relatorio_tecnico = models.TextField(blank=True, verbose_name="Laudo Técnico / Solução")
    
    # Datas
    data_entrada = models.DateTimeField(default=timezone.now)
    data_previsao = models.DateField(null=True, blank=True)
    data_conclusao = models.DateTimeField(null=True, blank=True)

    # Custos Operacionais (Saídas)
    custo_deslocamento = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Uber, Combustível, Pedágio")
    custo_terceiros = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Mão de obra contratada fora")

    # Faturamento (Entradas)
    valor_mao_de_obra = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ativo = models.ForeignKey(
        'Ativo',
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='historico_os',
        help_text="Equipamento vinculado a esta OS")
    
    class Meta:
        db_table = 'TB_ORDEM_SERVICO'
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
        ordering = ['-created_at']

    def __str__(self):
        return f"OS #{self.pk} - {self.titulo}"

    @property
    def total_pecas(self):
        return self.itens.aggregate(total=Sum(models.F('quantidade') * models.F('preco_venda')))['total'] or 0

    @property
    def valor_total_geral(self):
        pecas = self.total_pecas
        mo = self.valor_mao_de_obra
        desc = self.desconto
        return (pecas + mo) - desc

class ItemServico(models.Model):
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField(default=1)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2, help_text="Preço cobrado no momento da OS")

    class Meta:
        db_table = 'TB_ITEM_SERVICO'
        verbose_name = 'Peça Utilizada'

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} na OS #{self.os.pk}"

    @property
    def subtotal(self):
        return self.quantidade * self.preco_venda

class AnexoServico(models.Model):
    class TipoArquivo(models.TextChoices):
        NOTA_FISCAL = 'NF', 'Nota Fiscal'
        ORCAMENTO = 'ORCAMENTO', 'Orçamento PDF'
        LAUDO = 'LAUDO', 'Laudo Técnico'
        FOTO = 'FOTO', 'Foto / Evidência'
        OUTRO = 'OUTRO', 'Outro'

    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name='anexos')
    arquivo = models.FileField(upload_to='servicos_docs/%Y/%m/')
    tipo = models.CharField(max_length=20, choices=TipoArquivo.choices, default=TipoArquivo.OUTRO)
    descricao = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TB_ANEXO_SERVICO'