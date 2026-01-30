from django.db import models

# Fallback para TimeStampedModel
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

# =====================================================
# MODELO PRINCIPAL: CLIENTE
# =====================================================
class Cliente(TimeStampedModel):
    class TipoCliente(models.TextChoices):
        CONTRATO = 'CONTRATO', 'Contrato'
        AVULSO = 'AVULSO', 'Avulso'

    nome = models.CharField(max_length=100, null=True, blank=True, verbose_name="Nome Fantasia / Apelido")
    foto = models.ImageField(upload_to='clientes_fotos/', null=True, blank=True)
    razao_social = models.CharField(max_length=100)
    cpf = models.CharField(max_length=11, null=True, blank=True)
    cnpj = models.CharField(max_length=18, null=True, blank=True)
    endereco = models.CharField(max_length=150)

    
    # Financeiro do Cliente
    valor_contrato_mensal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    dia_vencimento = models.PositiveSmallIntegerField(default=10)
    tipo_cliente = models.CharField(max_length=20, choices=TipoCliente.choices, default=TipoCliente.AVULSO)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = 'TB_CLIENTE'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['nome', 'razao_social']

    def __str__(self):
        return self.nome or self.razao_social

# =====================================================
# SUB-MODELOS (SATÉLITES)
# =====================================================

class ContatoCliente(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contatos')
    nome = models.CharField(max_length=100)
    cargo = models.CharField(max_length=50, blank=True)
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
    
    class Meta: 
        db_table = 'TB_PROVEDOR_INTERNET'

class ContaEmail(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contas_email')
    email = models.EmailField()
    senha = models.CharField(max_length=100)
    nome_usuario = models.CharField(max_length=100, blank=True)
    provedor = models.CharField(max_length=50, default='Locaweb')
    
    class Meta: 
        db_table = 'TB_CONTA_EMAIL'

# Reconstruído com base nos serializers antigos
class DocumentacaoTecnica(models.Model):
    # Alterado para OneToOneField: Cada cliente tem apenas UM dossiê técnico
    cliente = models.OneToOneField(
        'Cliente', 
        on_delete=models.CASCADE, 
        related_name='documentacao_tecnica'
    )
    
    # CAMPOS EXATOS DO SEU REACT (useState 'textos')
    configuracao_mikrotik = models.TextField(blank=True, default="")
    topologia_rede = models.TextField(blank=True, default="")
    estrutura_servidores = models.TextField(blank=True, default="")
    rotina_backup = models.TextField(blank=True, default="")
    pontos_fracos_melhorias = models.TextField(blank=True, default="")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'TB_DOCUMENTACAO_TECNICA'
        verbose_name = 'Documentação Técnica'

class ContratoCliente(models.Model):
    cliente = models.ForeignKey(
        'Cliente', 
        on_delete=models.CASCADE, 
        related_name='contratos'
    )
    # Suporta o upload de PDF do seu modal
    arquivo = models.FileField(upload_to='contratos/%Y/%m/') 
    descricao = models.CharField(max_length=200) # O React envia 'descricao'
    data_upload = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TB_CONTRATO_CLIENTE'
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-data_upload']

