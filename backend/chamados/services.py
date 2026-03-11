import json
from django.db import transaction
from django.utils import timezone
from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from decimal import Decimal

@transaction.atomic
def atualizar_chamado(chamado_id, dados_atualizacao, usuario_responsavel, arquivos=None):
    Chamado = apps.get_model('chamados', 'Chamado')
    ChamadoTecnico = apps.get_model('chamados', 'ChamadoTecnico')
    LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
    Equipe = apps.get_model('equipe', 'Equipe')
    # Import para dedução de estoque
    MovimentacaoEstoque = apps.get_model('estoque', 'MovimentacaoEstoque')

    try:
        # Usar prefetch_related para otimizar o acesso aos itens e produtos
        chamado = Chamado.objects.select_related('cliente', 'empresa', 'tecnico').prefetch_related('itens__produto').get(pk=chamado_id)
    except Chamado.DoesNotExist:
        raise ValidationError("Chamado não encontrado.")

    if hasattr(dados_atualizacao, 'copy'):
        dados_atualizacao = dados_atualizacao.copy()

    resolucoes_data = dados_atualizacao.pop('resolucoes_assuntos', None)
    
    if isinstance(resolucoes_data, list) and len(resolucoes_data) > 0 and isinstance(resolucoes_data[0], str):
        resolucoes_data = resolucoes_data[0]
        
    if isinstance(resolucoes_data, str):
        try:
            resolucoes_data = json.loads(resolucoes_data)
        except Exception as e:
            print(f"Erro ao parsear resolucoes_assuntos: {e}")
            resolucoes_data = None

    if chamado.status == 'FINALIZADO':
        if 'assuntos' in dados_atualizacao:
            assuntos_ids = [int(aid) for aid in dados_atualizacao.get('assuntos', []) if str(aid).isdigit()]
            chamado.assuntos.set(assuntos_ids)

            novo_titulo = dados_atualizacao.get('titulo', '').strip()
            if novo_titulo:
                chamado.titulo = novo_titulo
                chamado.save(update_fields=['titulo'])
            return chamado
        else:
            raise ValidationError("Chamados finalizados só permitem alteração de assuntos (tags).")

    def safe_decimal(valor):
        if valor in [None, '', 'null', 'undefined']: return Decimal('0.00')
        try:
            return Decimal(str(valor).replace(',', '.'))
        except: return Decimal('0.00')

    if arquivos:
        for campo in ['arquivo_conclusao', 'arquivo_1', 'arquivo_2', 'foto_antes', 'foto_depois']:
            if campo in arquivos:
                setattr(chamado, campo, arquivos[campo])

    # ### 1. Update Field Processing - Adicionado 'relatorio_tecnico'
    campos_texto = ['titulo', 'descricao_detalhada', 'prioridade', 'resolucao', 'relatorio_tecnico']
    for campo in campos_texto:
        if campo in dados_atualizacao:
            setattr(chamado, campo, dados_atualizacao[campo])
    
    if 'tecnicos' in dados_atualizacao:
        novos_ids_str = dados_atualizacao.get('tecnicos', [])
        novos_ids = {int(tid) for tid in novos_ids_str if tid}
        atuais_ids = {tec.id for tec in chamado.tecnicos.all()}
        
        ids_para_adicionar = novos_ids - atuais_ids
        for tec_id in ids_para_adicionar:
            try:
                tecnico_obj = Equipe.objects.get(pk=tec_id)
                ChamadoTecnico.objects.create(chamado=chamado, tecnico=tecnico_obj)
            except Equipe.DoesNotExist:
                continue

        ids_para_remover = atuais_ids - novos_ids
        if ids_para_remover:
            ChamadoTecnico.objects.filter(chamado=chamado, tecnico_id__in=ids_para_remover).delete()

    if 'assuntos' in dados_atualizacao:
        assuntos_ids = [int(aid) for aid in dados_atualizacao.get('assuntos', []) if str(aid).isdigit()]
        chamado.assuntos.set(assuntos_ids)
        if novo_titulo := dados_atualizacao.get('titulo', '').strip():
            chamado.titulo = novo_titulo

    if 'tecnico' in dados_atualizacao:
        if tecnico_id := dados_atualizacao.get('tecnico'):
            try:
                chamado.tecnico = Equipe.objects.get(pk=tecnico_id)
            except Equipe.DoesNotExist:
                chamado.tecnico = None
        else:
            chamado.tecnico = None

    # ### 1. Update Field Processing - Novos campos financeiros
    chamado.custo_ida = safe_decimal(dados_atualizacao.get('custo_ida', chamado.custo_ida))
    chamado.custo_volta = safe_decimal(dados_atualizacao.get('custo_volta', chamado.custo_volta))
    chamado.valor_servico = safe_decimal(dados_atualizacao.get('valor_servico', chamado.valor_servico))
    chamado.valor_mao_de_obra = safe_decimal(dados_atualizacao.get('valor_mao_de_obra', chamado.valor_mao_de_obra))
    chamado.custo_terceiros = safe_decimal(dados_atualizacao.get('custo_terceiros', chamado.custo_terceiros))
    chamado.desconto = safe_decimal(dados_atualizacao.get('desconto', chamado.desconto))

    # SALVA OS DADOS BÁSICOS ANTES DE PROCESSAR AS REGRAS PESADAS
    chamado.save()
    
    novo_status = dados_atualizacao.get('status')

    if novo_status == 'FINALIZADO':
        if not chamado.resolucao and not dados_atualizacao.get('resolucao') and not resolucoes_data:
             raise ValidationError("A resolução técnica (geral ou por assunto) é obrigatória para finalizar.")

        chamado.status = 'FINALIZADO'
        chamado.data_fechamento = timezone.now() # <-- Movido para o início da finalização
        
        # ### 2. Implement Inventory Deduction
        for item in chamado.itens.select_related('produto').all():
            produto = item.produto
            if produto.estoque_atual < item.quantidade:
                raise ValidationError(f"Estoque insuficiente para '{produto.nome}'. Restam {produto.estoque_atual} unidades.")
            
            produto.estoque_atual -= item.quantidade
            produto.save(update_fields=['estoque_atual'])

            MovimentacaoEstoque.objects.create(
                empresa=chamado.empresa,
                produto=produto,
                quantidade=item.quantidade,
                tipo_movimentacao='SAIDA',
                responsavel=usuario_responsavel,
                observacao=f"Saída para Atendimento/OS #{chamado.protocolo}"
            )

        if resolucoes_data:
            ResolucaoAssunto = apps.get_model('chamados', 'ResolucaoAssunto')
            for res in resolucoes_data:
                if 'assunto_id' in res and 'texto_resolucao' in res:
                    ResolucaoAssunto.objects.update_or_create(
                        chamado=chamado,
                        assunto_id=res['assunto_id'],
                        defaults={'texto_resolucao': res['texto_resolucao']}
                    )
        
        # ### 3. Unified Financial Revenue
        valor_receita = (chamado.valor_servico + chamado.valor_mao_de_obra + chamado.total_pecas) - chamado.desconto
        if valor_receita > 0 and not chamado.financeiro_gerado:
            LancamentoFinanceiro.objects.create(
                empresa=chamado.empresa,
                cliente=chamado.cliente,
                tecnico=chamado.tecnico or (getattr(usuario_responsavel, 'equipe', None) if hasattr(usuario_responsavel, 'equipe') else None),
                descricao=f"Receita Atendimento/OS #{chamado.protocolo}",
                valor=valor_receita,
                tipo_lancamento='ENTRADA',
                categoria='SERVICO',
                status='PENDENTE',
                data_vencimento=timezone.now().date(),
                forma_pagamento='PIX'
            )
            chamado.financeiro_gerado = True

        # ### 4. Unified Financial Costs
        chamado.custo_transporte = chamado.custo_ida + chamado.custo_volta
        if chamado.custo_transporte > 0:
            LancamentoFinanceiro.objects.update_or_create(
                descricao=f"Reembolso Transporte - OS #{chamado.protocolo}",
                defaults={
                    'empresa': chamado.empresa,
                    'valor': chamado.custo_transporte,
                    'tipo_lancamento': 'SAIDA',
                    'status': 'PENDENTE',
                    'data_vencimento': timezone.now().date(),
                    'categoria': 'TRANSPORTE',
                    'cliente': chamado.cliente,
                    'tecnico': chamado.tecnico 
                }
            )
        
        if chamado.custo_terceiros > 0:
            LancamentoFinanceiro.objects.create(
                empresa=chamado.empresa,
                valor=chamado.custo_terceiros,
                tipo_lancamento='SAIDA',
                status='PENDENTE',
                data_vencimento=timezone.now().date(),
                categoria='CUSTO_TEC',
                cliente=chamado.cliente,
                tecnico=chamado.tecnico,
                descricao=f"Custo Terceiros - OS #{chamado.protocolo}"
            )

        # Save again to persist changes from the FINALIZADO block
        chamado.save()

    elif novo_status:
        chamado.status = novo_status
        chamado.save()
    return chamado
