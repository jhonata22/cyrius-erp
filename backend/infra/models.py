from django.db import models

class Ativo(models.Model):
    class TipoAtivo(models.TextChoices):
        COMPUTADOR = 'COMPUTADOR', 'Computador/Notebook'
        SERVIDOR = 'SERVIDOR', 'Servidor'
        REDE = 'REDE', 'Rede (Switch/Router/Modem)'
        IMPRESSORA = 'IMPRESSORA', 'Impressora'
        MONITOR = 'MONITOR', 'Monitor'
        PERIFERICO = 'PERIFERICO', 'Periférico/Outro'

    # Relacionamento
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.CASCADE, related_name='ativos')
    
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TipoAtivo.choices)
    marca_modelo = models.CharField(max_length=100, blank=True)
    
    # === CAMPO QUE FALTAVA (Correção do Erro 1) ===
    numero_serial = models.CharField(max_length=100, blank=True, null=True, verbose_name="Número de Série / Service Tag")
    
    # === CAMPO QUE FALTAVA (Correção do Erro 2 - Busca) ===
    descricao = models.TextField(blank=True, null=True, verbose_name="Observações / Descrição")

    # Detalhes de Hardware
    processador = models.CharField(max_length=100, blank=True)
    memoria_ram = models.CharField(max_length=50, blank=True)
    armazenamento = models.CharField(max_length=100, blank=True)
    sistema_operacional = models.CharField(max_length=50, blank=True)
    
    # Acesso Remoto e Credenciais
    anydesk_id = models.CharField(max_length=50, blank=True)
    usuario_local = models.CharField(max_length=50, blank=True)
    senha_local = models.CharField(max_length=100, blank=True)
    ip_local = models.CharField(max_length=20, blank=True)

    class Meta: 
        db_table = 'TB_ATIVO'
        verbose_name = 'Ativo/Hardware'
        verbose_name_plural = 'Ativos'
        ordering = ['nome']

    def __str__(self): 
        return f"{self.nome} ({self.tipo})"