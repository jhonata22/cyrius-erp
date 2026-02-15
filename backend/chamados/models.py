from django.db import models
from django.utils import timezone
from django.conf import settings

class AssuntoChamado(models.Model):
    titulo = models.CharField(max_length=100, unique=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['titulo']
        db_table = 'TB_ASSUNTO_CHAMADO'
        verbose_name = 'Assunto de Chamado'
        verbose_name_plural = 'Assuntos de Chamados'

    def __str__(self):
        return self.titulo

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

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

    class CanalComunicacao(models.TextChoices):
        WHATSAPP = 'WHATSAPP', 'WhatsApp'
        EMAIL = 'EMAIL', 'E-mail'
        TELEFONE = 'TELEFONE', 'Telefone'
        SISTEMA = 'SISTEMA', 'Sistema'
        OUTRO = 'OUTRO', 'Outro'

    # === MULTI-EMPRESAS (Ajustado para CORE) ===
    empresa = models.ForeignKey(
        'core.Empresa',  # <--- APONTANDO PARA O APP CORE
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='chamados',
        verbose_name="Filial/Empresa"
    )
    # ===========================================

    # RELACIONAMENTOS
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.PROTECT)

    assunto = models.ForeignKey(AssuntoChamado, on_delete=models.PROTECT, null=True, blank=True)

    ativo = models.ForeignKey(
        'infra.Ativo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='historico_servicos',
        help_text="Equipamento que recebeu o serviço"
    )
    
    tecnico = models.ForeignKey(
        'equipe.Equipe', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='chamados_responsavel',
        verbose_name="Técnico Responsável"
    )

    titulo = models.CharField(max_length=100)
    descricao_detalhada = models.TextField(max_length=500)
    origem = models.CharField(max_length=50, choices=CanalComunicacao.choices, default=CanalComunicacao.WHATSAPP)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EM_ANDAMENTO)
    prioridade = models.CharField(max_length=20, choices=Prioridade.choices, default=Prioridade.MEDIA)
    tipo_atendimento = models.CharField(max_length=20, choices=TipoAtendimento.choices, default=TipoAtendimento.REMOTO) 
    
    resolucao = models.TextField(null=True, blank=True, verbose_name="Resolução Técnica")
    
    valor_servico = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Valor do Serviço (Avulso)")
    financeiro_gerado = models.BooleanField(default=False, help_text="Indica se a cobrança automática foi gerada")
    
    # Arquivos
    arquivo_conclusao = models.FileField(upload_to='chamados/conclusao/%Y/%m/', null=True, blank=True)
    arquivo_1 = models.FileField(upload_to='chamados/docs/', null=True, blank=True)
    arquivo_2 = models.FileField(upload_to='chamados/docs/', null=True, blank=True)
    foto_antes = models.ImageField(upload_to='chamados/fotos/', null=True, blank=True)
    foto_depois = models.ImageField(upload_to='chamados/fotos/', null=True, blank=True)

    data_agendamento = models.DateTimeField(null=True, blank=True)
    
    # Custos
    custo_ida = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    custo_volta = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    custo_transporte = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    protocolo = models.CharField(max_length=30, unique=True, blank=True)
    
    data_abertura = models.DateTimeField(default=timezone.now)
    data_fechamento = models.DateTimeField(null=True, blank=True)
    
    tecnicos = models.ManyToManyField('equipe.Equipe', through='ChamadoTecnico')

    class Meta: 
        db_table = 'TB_CHAMADO'
        ordering = ['-created_at']

    def __str__(self):
        return self.protocolo or f"ID {self.pk}"

    def save(self, *args, **kwargs):
        if self.assunto:
            self.titulo = self.assunto.titulo
            
        ida = float(self.custo_ida or 0)
        volta = float(self.custo_volta or 0)
        self.custo_transporte = ida + volta

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

        if self.tecnico:
            ChamadoTecnico.objects.get_or_create(chamado=self, tecnico=self.tecnico)

class ChamadoTecnico(models.Model):
    chamado = models.ForeignKey(Chamado, on_delete=models.CASCADE)
    tecnico = models.ForeignKey('equipe.Equipe', on_delete=models.PROTECT)
    horas_trabalhadas = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'TB_CHAMADO_TECNICO'
        unique_together = ('chamado', 'tecnico')

class ApontamentoHoras(models.Model):
    chamado_tecnico = models.ForeignKey(ChamadoTecnico, on_delete=models.CASCADE, related_name='apontamentos')
    horas_gastas = models.DecimalField(max_digits=5, decimal_places=2)
    descricao_tecnica = models.CharField(max_length=255)
    data_apontamento = models.DateTimeField(default=timezone.now)
    
    class Meta: 
        db_table = 'TB_APONTAMENTO_HORAS'

class EquipamentoEntrada(models.Model):
    chamado = models.OneToOneField(Chamado, on_delete=models.CASCADE, related_name='equipamento_laboratorio')
    marca_modelo = models.CharField(max_length=100)
    numero_serie = models.CharField(max_length=50, null=True, blank=True)
    defeito_relatado = models.TextField(max_length=500)
    data_entrada = models.DateField(default=timezone.now)
    data_prevista_entrega = models.DateField()
    
    class Meta: 
        db_table = 'TB_EQUIPAMENTO_ENTRADA'

class ComentarioChamado(models.Model):
    chamado = models.ForeignKey(Chamado, related_name='comentarios', on_delete=models.CASCADE)
    autor = models.ForeignKey('equipe.Equipe', on_delete=models.SET_NULL, null=True)
    texto = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
