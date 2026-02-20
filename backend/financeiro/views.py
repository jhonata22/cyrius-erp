from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import date
import uuid
import calendar

from .models import LancamentoFinanceiro, DespesaRecorrente
from .serializers import LancamentoFinanceiroSerializer, DespesaRecorrenteSerializer
# Importamos a função de cálculo corrigida
from .services import gerar_faturas_mensalidade, calcular_estatisticas_financeiras
from equipe.permissions import IsGestor


def add_months(sourcedate, months):
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year,month)[1])
    return date(year, month, day)

class LancamentoFinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.all().select_related('cliente', 'empresa') # Otimizado
    serializer_class = LancamentoFinanceiroSerializer
    permission_classes = [IsGestor]

    def get_queryset(self):
        """ Filtra os lançamentos pela empresa selecionada no Frontend """
        qs = super().get_queryset()
        
        # Pega o ID da empresa da URL (query param)
        empresa_id = self.request.query_params.get('empresa')
        
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
            
        return qs

    def create(self, request, *args, **kwargs):
        # Garante que, ao criar, use a empresa enviada ou do contexto
        # ... (seu código de parcelamento existente) ...
        # Apenas certifique-se de que o 'empresa' está vindo no request.data
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        hoje = timezone.now()
        mes = request.query_params.get('mes', hoje.month)
        ano = request.query_params.get('ano', hoje.year)
        
        # [NOVO] Pega a empresa para filtrar estatísticas
        empresa_id = request.query_params.get('empresa') 

        dados = calcular_estatisticas_financeiras(mes, ano, empresa_id)
        return Response(dados)

    @action(detail=False, methods=['post'], url_path='gerar-mensalidades')
    def gerar_mensalidades_action(self, request):
        # [NOVO] Gera faturas para a empresa ativa
        empresa_id = request.data.get('empresa_id') or request.query_params.get('empresa')
        return Response(gerar_faturas_mensalidade(request.user, empresa_id))
    
    # ... (baixar_lote e processar_recorrencias mantidos, mas idealmente filtrar por empresa tb)
    @action(detail=False, methods=['post'], url_path='processar-recorrencias')
    def processar_recorrencias(self, request):
        hoje = date.today()
        # Filtra recorrencias ativas
        empresa_id = request.query_params.get('empresa')
        qs = DespesaRecorrente.objects.filter(ativo=True)
        
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)

        gerados = 0
        for rec in qs:
            if not rec.ultima_geracao or (rec.ultima_geracao.month != hoje.month):
                LancamentoFinanceiro.objects.create(
                    descricao=rec.descricao,
                    valor=rec.valor,
                    tipo_lancamento='SAIDA',
                    categoria=rec.categoria,
                    data_vencimento=date(hoje.year, hoje.month, rec.dia_vencimento),
                    status='PENDENTE',
                    empresa=rec.empresa # Herda a empresa da recorrência
                )
                rec.ultima_geracao = hoje
                rec.save()
                gerados += 1
        return Response({'mensagem': f'{gerados} recorrencias processadas.'})        
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """
        Endpoint que retorna os KPIs calculados no Backend.
        Agora usamos o service para garantir a lógica correta (Regime de Caixa).
        """
        hoje = timezone.now()
        mes = request.query_params.get('mes', hoje.month)
        ano = request.query_params.get('ano', hoje.year)
        
        # Chama a inteligência centralizada no services.py
        dados = calcular_estatisticas_financeiras(mes, ano)
        
        return Response(dados)

    @action(detail=False, methods=['post'], url_path='gerar-mensalidades')
    def gerar_mensalidades_action(self, request):
        return Response(gerar_faturas_mensalidade(request.user))
    
    @action(detail=False, methods=['post'], url_path='baixar-lote')
    def baixar_lote(self, request):
        ids = request.data.get('ids', [])
        LancamentoFinanceiro.objects.filter(id__in=ids).update(
            status='PAGO', 
            data_pagamento=timezone.now().date()
        )
        return Response({'mensagem': 'Lançamentos baixados com sucesso!'})

    @action(detail=False, methods=['post'], url_path='processar-recorrencias')
    def processar_recorrencias(self, request):
        hoje = date.today()
        recorrencias = DespesaRecorrente.objects.filter(ativo=True)
        gerados = 0
        for rec in recorrencias:
            if not rec.ultima_geracao or (rec.ultima_geracao.month != hoje.month):
                LancamentoFinanceiro.objects.create(
                    descricao=rec.descricao,
                    valor=rec.valor,
                    tipo_lancamento='SAIDA',
                    categoria=rec.categoria,
                    data_vencimento=date(hoje.year, hoje.month, rec.dia_vencimento),
                    status='PENDENTE'
                )
                rec.ultima_geracao = hoje
                rec.save()
                gerados += 1
        return Response({'mensagem': f'{gerados} recorrencias processadas.'})
    