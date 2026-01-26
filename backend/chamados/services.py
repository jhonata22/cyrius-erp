from django.db import transaction
from django.utils import timezone
from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from decimal import Decimal

@transaction.atomic
def atualizar_chamado(chamado_id, dados_atualizacao, usuario_responsavel, arquivos=None):
    """
    Versão Corrigida:
    1. Aceita 'arquivos' (request.FILES)
    2. Converte strings do FormData em Decimal/Float com segurança
    3. Clona o arquivo de conclusão para o financeiro
    """
    Chamado = apps.get_model('chamados', 'Chamado')
    LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
    ChamadoTecnico = apps.get_model('chamados', 'ChamadoTecnico')
    
    try:
        chamado = Chamado.objects.select_related('cliente').get(pk=chamado_id)
    except Chamado.DoesNotExist:
        raise ValidationError("Chamado não encontrado.")

    if chamado.status == 'FINALIZADO':
        raise ValidationError("Chamados finalizados não podem ser alterados.")

    # --- FUNÇÃO AUXILIAR PARA LIMPAR NÚMEROS (FormData envia tudo como string) ---
    def safe_decimal(valor):
        if valor in [None, '', 'null', 'undefined']: return Decimal('0.00')
        try:
            return Decimal(str(valor).replace(',', '.'))
        except: return Decimal('0.00')

    # 1. SALVAR O ARQUIVO (Se o técnico enviou)
    if arquivos and 'arquivo_conclusao' in arquivos:
        chamado.arquivo_conclusao = arquivos['arquivo_conclusao']

    # 2. ATUALIZAR CAMPOS GERAIS (Tratando tipos de dados)
    if 'titulo' in dados_atualizacao: chamado.titulo = dados_atualizacao['titulo']
    if 'descricao_detalhada' in dados_atualizacao: chamado.descricao_detalhada = dados_atualizacao['descricao_detalhada']
    if 'prioridade' in dados_atualizacao: chamado.prioridade = dados_atualizacao['prioridade']
    
    chamado.custo_ida = safe_decimal(dados_atualizacao.get('custo_ida', chamado.custo_ida))
    chamado.custo_volta = safe_decimal(dados_atualizacao.get('custo_volta', chamado.custo_volta))
    chamado.valor_servico = safe_decimal(dados_atualizacao.get('valor_servico', chamado.valor_servico))

    novo_status = dados_atualizacao.get('status')

    # --- PROCESSO DE FINALIZAÇÃO ---
    if novo_status == 'FINALIZADO':
        resolucao = dados_atualizacao.get('resolucao')
        if not resolucao:
            raise ValidationError("A resolução técnica é obrigatória para finalizar.")

        chamado.status = 'FINALIZADO'
        chamado.resolucao = resolucao
        chamado.data_fechamento = timezone.now()
        chamado.custo_transporte = chamado.custo_ida + chamado.custo_volta

        # REGRA FINANCEIRO (AVULSO)
        eh_avulso = getattr(chamado.cliente, 'tipo_cliente', 'AVULSO') == 'AVULSO'
        
        if eh_avulso and chamado.valor_servico > 0 and not chamado.financeiro_gerado:
            # Cria o Lançamento
            lancamento = LancamentoFinanceiro.objects.create(
                cliente=chamado.cliente,
                tecnico=getattr(usuario_responsavel, 'equipe', None) if hasattr(usuario_responsavel, 'equipe') else None,
                descricao=f"Atendimento Avulso - #{chamado.protocolo}",
                valor=chamado.valor_servico,
                tipo_lancamento='ENTRADA',
                categoria='SERVICO',
                status='PENDENTE',
                data_vencimento=timezone.now().date(),
                forma_pagamento='PIX'
            )

            # CLONAR ARQUIVO: Se o técnico anexou no chamado, copiamos para o financeiro
            if chamado.arquivo_conclusao:
                nome_arquivo = chamado.arquivo_conclusao.name.split('/')[-1]
                lancamento.comprovante.save(
                    f"comp_{nome_arquivo}",
                    ContentFile(chamado.arquivo_conclusao.read()),
                    save=True
                )
            
            chamado.financeiro_gerado = True

        # REGRA DE CUSTOS (DESLOCAMENTO)
        if chamado.custo_transporte > 0:
            LancamentoFinanceiro.objects.create(
                descricao=f"Custo de transporte - #{chamado.protocolo}",
                valor=chamado.custo_transporte,
                tipo_lancamento='SAIDA',
                status='PENDENTE',
                data_vencimento=timezone.now().date(),
                categoria='DESPESA',
                cliente=chamado.cliente
            )

    chamado.save()
    return chamado