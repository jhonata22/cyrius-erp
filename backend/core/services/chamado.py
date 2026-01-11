# backend/core/services/chamado.py
from django.db import transaction
from django.utils import timezone
from core.models import LancamentoFinanceiro, ChamadoTecnico

def finalizar_chamado(chamado):
    """
    Finaliza o chamado e calcula os custos operacionais dos técnicos.
    Substitui a lógica que estava no signals.py
    """
    with transaction.atomic():
        # 1. Atualiza o status e data de fechamento
        chamado.status = 'FINALIZADO'
        chamado.data_fechamento = timezone.now()
        chamado.save()

        # 2. Calcula custos dos técnicos (Lógica vinda do signal)
        descricao_base = f"Custo Operacional - Chamado #{chamado.protocolo}"
        
        # Busca técnicos vinculados a este chamado
        tecnicos_envolvidos = ChamadoTecnico.objects.filter(chamado=chamado)
        
        for tec_vinculo in tecnicos_envolvidos:
            tecnico = tec_vinculo.tecnico
            horas = tec_vinculo.horas_trabalhadas
            
            if horas > 0 and tecnico.custo_hora > 0:
                custo_total = horas * tecnico.custo_hora
                
                # Gera o lançamento de SAÍDA (Custo)
                LancamentoFinanceiro.objects.create(
                    descricao=f"{descricao_base} ({tecnico.nome})",
                    valor=custo_total,
                    tipo_lancamento='SAIDA',
                    categoria='CUSTO_TEC',
                    status='PAGO',
                    data_vencimento=timezone.now().date(),
                    data_pagamento=timezone.now().date(),
                    cliente=chamado.cliente,
                    tecnico=tecnico
                )
    return chamado