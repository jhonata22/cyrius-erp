from django.db import transaction
from django.utils import timezone
from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from decimal import Decimal

@transaction.atomic
def atualizar_chamado(chamado_id, dados_atualizacao, usuario_responsavel, arquivos=None):
    Chamado = apps.get_model('chamados', 'Chamado')
    LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
    
    try:
        chamado = Chamado.objects.select_related('cliente').get(pk=chamado_id)
    except Chamado.DoesNotExist:
        raise ValidationError("Chamado não encontrado.")

    if chamado.status == 'FINALIZADO':
        raise ValidationError("Chamados finalizados não podem ser alterados.")

    def safe_decimal(valor):
        if valor in [None, '', 'null', 'undefined']: return Decimal('0.00')
        try:
            return Decimal(str(valor).replace(',', '.'))
        except: return Decimal('0.00')

    # 1. SALVAR ARQUIVOS
    if arquivos:
        for campo in ['arquivo_conclusao', 'arquivo_1', 'arquivo_2', 'foto_antes', 'foto_depois']:
            if campo in arquivos:
                setattr(chamado, campo, arquivos[campo])

    # 2. ATUALIZAR CAMPOS GERAIS
    campos_texto = ['titulo', 'descricao_detalhada', 'prioridade', 'resolucao']
    for campo in campos_texto:
        if campo in dados_atualizacao:
            setattr(chamado, campo, dados_atualizacao[campo])
    
    chamado.custo_ida = safe_decimal(dados_atualizacao.get('custo_ida', chamado.custo_ida))
    chamado.custo_volta = safe_decimal(dados_atualizacao.get('custo_volta', chamado.custo_volta))
    chamado.valor_servico = safe_decimal(dados_atualizacao.get('valor_servico', chamado.valor_servico))

    novo_status = dados_atualizacao.get('status')

    # --- PROCESSO DE FINALIZAÇÃO ---
    if novo_status == 'FINALIZADO':
        if not chamado.resolucao and not dados_atualizacao.get('resolucao'):
             raise ValidationError("A resolução técnica é obrigatória para finalizar.")

        chamado.status = 'FINALIZADO'
        chamado.data_fechamento = timezone.now()
        chamado.custo_transporte = chamado.custo_ida + chamado.custo_volta

        # A. REGRA FINANCEIRO (RECEITA - AVULSO)
        eh_avulso = getattr(chamado.cliente, 'tipo_cliente', 'AVULSO') == 'AVULSO'
        
        if eh_avulso and chamado.valor_servico > 0 and not chamado.financeiro_gerado:
            lancamento_entrada = LancamentoFinanceiro.objects.create(
                empresa=chamado.empresa, # <--- VINCULA À EMPRESA DO CHAMADO
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

            # Clonar comprovante/laudo para o financeiro
            if chamado.arquivo_conclusao:
                nome_arquivo = chamado.arquivo_conclusao.name.split('/')[-1]
                lancamento_entrada.comprovante.save(
                    f"comp_{nome_arquivo}",
                    ContentFile(chamado.arquivo_conclusao.read()),
                    save=True
                )
            
            chamado.financeiro_gerado = True

        # B. REGRA DE CUSTOS (DESPESA - REEMBOLSO TRANSPORTE)
        if chamado.custo_transporte > 0:
            descricao_transporte = f"Reembolso Transporte - OS #{chamado.protocolo}"
            
            LancamentoFinanceiro.objects.update_or_create(
                descricao=descricao_transporte,
                defaults={
                    'empresa': chamado.empresa, # <--- VINCULA À EMPRESA
                    'valor': chamado.custo_transporte,
                    'tipo_lancamento': 'SAIDA',
                    'status': 'PENDENTE',
                    'data_vencimento': timezone.now().date(),
                    'categoria': 'TRANSPORTE',
                    'cliente': chamado.cliente,
                    'tecnico': chamado.tecnico 
                }
            )

    # Se não for finalizado, apenas salva o status novo (se houver)
    elif novo_status:
        chamado.status = novo_status

    chamado.save()
    return chamado