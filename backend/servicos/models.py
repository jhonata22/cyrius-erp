from django.db import models
from django.db.models import Sum, F
from django.utils import timezone
from django.conf import settings 

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class OrdemServico(TimeStampedModel):
    class Status(models.TextChoices):
        ORCAMENTO = 'ORCAMENTO', 'Orçamento'
        APROVADO = 'APROVADO', 'Aprovado'
        EM_EXECUCAO = 'EM_EXECUCAO', 'Em Execução'
        AGUARDANDO_PECA = 'AGUARDANDO_PECA', 'Aguardando Peça'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        FINALIZADO = 'FINALIZADO', 'Finalizado' 
        CANCELADO = 'CANCELADO', 'Cancelado'

    class Tipo(models.TextChoices):
        LABORATORIO = 'LABORATORIO', 'Laboratório (Interno)'
        EXTERNO = 'EXTERNO', 'Projeto Externo / Visita'
        REMOTO = 'REMOTO', 'Acesso Remoto Especializado'

    # === VÍNCULO MULTI-EMPRESA ===
    empresa = models.ForeignKey('core.Empresa', on_delete=models.PROTECT, null=True, blank=True, related_name='servicos')

    titulo = models.CharField(max_length=150, help_text="Ex: Formatação PC, Instalação Câmeras")
    
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.PROTECT, related_name='servicos')
    tecnico_responsavel = models.ForeignKey('equipe.Equipe', on_delete=models.PROTECT, related_name='servicos_liderados', null=True, blank=True)
    ativos = models.ManyToManyField('infra.Ativo', related_name='historico_os', blank=True)

    # Lista de Técnicos (Executores)
    tecnicos = models.ManyToManyField('equipe.Equipe', related_name='servicos_participante', blank=True)

    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.LABORATORIO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ORCAMENTO)
    
    descricao_problema = models.TextField(verbose_name="Descrição do Pedido/Problema")
    relatorio_tecnico = models.TextField(blank=True, verbose_name="Laudo Técnico / Solução")
    
    data_entrada = models.DateTimeField(default=timezone.now)
    data_previsao = models.DateField(null=True, blank=True)
    data_conclusao = models.DateTimeField(null=True, blank=True)
    data_finalizacao = models.DateTimeField(null=True, blank=True)

    custo_deslocamento = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    custo_terceiros = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    valor_mao_de_obra = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
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
        return (float(pecas) + float(mo)) - float(desc)

class ItemServico(models.Model):
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey('estoque.Produto', on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField(default=1)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2, help_text="Preço cobrado no momento da OS")

    class Meta:
        db_table = 'TB_ITEM_SERVICO'
        verbose_name = 'Peça Utilizada'

    def __str__(self):
        return f"{self.quantidade}x Item na OS #{self.os.pk}"

    @property
    def valor_total(self):
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

class Notificacao(models.Model):
    TIPO_CHOICES = [
        ('VISITA', 'Visita Técnica'),
        ('CHURN', 'Risco de Cancelamento'),
        ('SISTEMA', 'Sistema')
    ]

    destinatario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificacoes')
    titulo = models.CharField(max_length=100)
    mensagem = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='SISTEMA')
    lida = models.BooleanField(default=False)
    data_criacao = models.DateTimeField(auto_now_add=True)
    link = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        ordering = ['-data_criacao']
        db_table = 'TB_NOTIFICACAO'

    def __str__(self):
        return f"{self.titulo} - {self.destinatario.username}"