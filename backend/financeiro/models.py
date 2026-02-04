from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

# Importação do modelo de Empresa (Core)
# Usamos string 'core.Empresa' para evitar circular import se precisar importar algo do financeiro no core
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

def mes_esta_fechado(data, empresa_id=None):
    # ATUALIZADO: Agora verificamos o fechamento DAQUELA empresa específica
    try:
        query = FechamentoFinanceiro.objects.filter(ano=data.year, mes=data.month)
        if empresa_id:
            query = query.filter(empresa_id=empresa_id)
        return query.exists()
    except:
        return False

# =====================================================
# MODELOS
# =====================================================

class LancamentoFinanceiro(TimeStampedModel):
    # ... (Mantenha StatusFinanceiro, Categoria, FORMA_PAGAMENTO_CHOICES igual ao seu) ...
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

    FORMA_PAGAMENTO_CHOICES = [
        ('BOLETO', 'Boleto'),
        ('CREDITO', 'Cartão de Crédito'),
        ('DEBITO', 'Cartão de Débito'),
        ('PIX', 'PIX'),
        ('DINHEIRO', 'Dinheiro'),
        ('TRANSFERENCIA', 'Transferência'),
    ]

    # === NOVO CAMPO: EMPRESA ===
    # on_delete=models.PROTECT para não deixar apagar uma empresa se tiver lançamentos
    empresa = models.ForeignKey('core.Empresa', on_delete=models.PROTECT, null=True, blank=True, related_name='lancamentos')

    # Relacionamentos existentes
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.PROTECT, null=True, blank=True)
    tecnico = models.ForeignKey('equipe.Equipe', on_delete=models.SET_NULL, null=True, blank=True)
    fornecedor = models.ForeignKey('estoque.Fornecedor', on_delete=models.SET_NULL, null=True, blank=True, related_name='lancamentos')
    
    descricao = models.CharField(max_length=150)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=StatusFinanceiro.choices, default=StatusFinanceiro.PENDENTE)
    tipo_lancamento = models.CharField(max_length=20, choices=[('ENTRADA', 'Entrada'), ('SAIDA', 'Saída')])
    categoria = models.CharField(max_length=20, choices=Categoria.choices, default=Categoria.DESPESA)
    
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)
    observacao = models.TextField(blank=True, null=True)
    
    # Arquivos
    arquivo_1 = models.FileField(upload_to='financeiro/comprovantes/%Y/%m/', null=True, blank=True)
    arquivo_2 = models.FileField(upload_to='financeiro/comprovantes/%Y/%m/', null=True, blank=True)
    comprovante = models.FileField(upload_to='financeiro/comprovantes/%Y/%m/', null=True, blank=True)

    # Parcelamento
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO_CHOICES, default='DINHEIRO')
    parcela_atual = models.IntegerField(default=1)
    total_parcelas = models.IntegerField(default=1)
    grupo_parcelamento = models.UUIDField(null=True, blank=True)

    class Meta: 
        db_table = 'TB_LANCAMENTO_FINANCEIRO'
        verbose_name = 'Lançamento Financeiro'
        ordering = ['-data_vencimento']

    def clean(self):
        # Passamos a empresa para validar o fechamento correto
        if self.data_vencimento and mes_esta_fechado(self.data_vencimento, self.empresa_id):
            raise ValidationError(f"Mês {self.data_vencimento.month}/{self.data_vencimento.year} está fechado para esta empresa.")

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.status != self.StatusFinanceiro.PAGO:
            if self.data_vencimento < timezone.now().date():
                self.status = self.StatusFinanceiro.ATRASADO
            else:
                self.status = self.StatusFinanceiro.PENDENTE
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.descricao} - {self.get_tipo_lancamento_display()}"


class DespesaRecorrente(models.Model):
    # === NOVO CAMPO: EMPRESA ===
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, null=True, blank=True)

    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.CharField(max_length=20, choices=LancamentoFinanceiro.Categoria.choices, default='DESPESA')
    dia_vencimento = models.IntegerField(help_text="Dia do mês que vence (1-31)")
    
    ativo = models.BooleanField(default=True)
    ultima_geracao = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TB_DESPESA_RECORRENTE'

    def __str__(self):
        return f"Recorrente: {self.descricao} (Dia {self.dia_vencimento})"


class FechamentoFinanceiro(models.Model):
    # === NOVO CAMPO: EMPRESA ===
    # O fechamento agora é por CNPJ (pode fechar a empresa A e deixar a B aberta)
    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE, null=True, blank=True)

    ano = models.PositiveIntegerField()
    mes = models.PositiveSmallIntegerField()
    fechado_em = models.DateTimeField(auto_now_add=True)
    fechado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta: 
        db_table = 'TB_FECHAMENTO_FINANCEIRO'
        # Agora o unique together inclui a empresa
        unique_together = ('ano', 'mes', 'empresa')