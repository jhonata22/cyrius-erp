from django.db import transaction
from django.utils import timezone
from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from decimal import Decimal

@transaction.atomic
def atualizar_chamado(chamado_id, dados_atualizacao, usuario_responsavel, arquivos=None):
    Chamado = apps.get_model('chamados', 'Chamado')
    ChamadoTecnico = apps.get_model('chamados', 'ChamadoTecnico') # <--- Necessário para tabela intermediária
    LancamentoFinanceiro = apps.get_model('financeiro', 'LancamentoFinanceiro')
    Equipe = apps.get_model('equipe', 'Equipe')
    
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

    # 2. ATUALIZAR CAMPOS GERAIS (TEXTO)
    campos_texto = ['titulo', 'descricao_detalhada', 'prioridade', 'resolucao']
    for campo in campos_texto:
        if campo in dados_atualizacao:
            setattr(chamado, campo, dados_atualizacao[campo])
    
    # 3. ATUALIZAR TÉCNICOS (CORREÇÃO CRÍTICA)
    # Como usamos 'through', não podemos usar chamado.tecnicos.set() direto
    if 'tecnicos' in dados_atualizacao:
        novos_ids = dados_atualizacao['tecnicos'] # Espera lista de IDs: [1, 5]
        
        # Limpa os técnicos atuais
        ChamadoTecnico.objects.filter(chamado=chamado).delete()
        
        # Insere os novos
        for tec_id in novos_ids:
            try:
                tecnico = Equipe.objects.get(pk=tec_id)
                ChamadoTecnico.objects.create(chamado=chamado, tecnico=tecnico)
            except Equipe.DoesNotExist:
                continue # Ignora se o ID for inválido

    # 3.1 ATUALIZAR TÉCNICO RESPONSÁVEL (FK)
    if 'tecnico' in dados_atualizacao:
        tecnico_id = dados_atualizacao.get('tecnico')
        if tecnico_id:
            try:
                tecnico_responsavel = Equipe.objects.get(pk=tecnico_id)
                chamado.tecnico = tecnico_responsavel
            except Equipe.DoesNotExist:
                chamado.tecnico = None
        else:
            chamado.tecnico = None

    # 4. ATUALIZAR CUSTOS
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
                empresa=chamado.empresa, # <--- Vinculando à empresa do Core
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
                try:
                    nome_arquivo = chamado.arquivo_conclusao.name.split('/')[-1]
                    lancamento_entrada.comprovante.save(
                        f"comp_{nome_arquivo}",
                        ContentFile(chamado.arquivo_conclusao.read()),
                        save=True
                    )
                except Exception:
                    pass # Se falhar ao copiar arquivo, não trava a finalização
            
            chamado.financeiro_gerado = True

        # B. REGRA DE CUSTOS (DESPESA - REEMBOLSO TRANSPORTE)
        if chamado.custo_transporte > 0:
            descricao_transporte = f"Reembolso Transporte - OS #{chamado.protocolo}"
            
            LancamentoFinanceiro.objects.update_or_create(
                descricao=descricao_transporte,
                defaults={
                    'empresa': chamado.empresa, # <--- Vinculando à empresa do Core
                    'valor': chamado.custo_transporte,
                    'tipo_lancamento': 'SAIDA',
                    'status': 'PENDENTE',
                    'data_vencimento': timezone.now().date(),
                    'categoria': 'TRANSPORTE',
                    'cliente': chamado.cliente,
                    'tecnico': chamado.tecnico 
                }
            )

    elif novo_status:
        chamado.status = novo_status

    chamado.save()
    return chamado