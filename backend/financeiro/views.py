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

def add_months(sourcedate, months):
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year,month)[1])
    return date(year, month, day)

class LancamentoFinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.all().select_related('cliente')
    serializer_class = LancamentoFinanceiroSerializer

    def create(self, request, *args, **kwargs):
        dados = request.data.copy()
        if dados.get('cliente') == "": dados['cliente'] = None

        try:
            total_parcelas = int(dados.get('total_parcelas', 1))
        except:
            total_parcelas = 1
        
        if total_parcelas > 60:
            return Response({'erro': 'Máximo de 60 parcelas.'}, status=400)

        if total_parcelas > 1:
            try:
                valor_total = float(dados.get('valor'))
                valor_parcela = valor_total / total_parcelas
                data_inicial = date.fromisoformat(dados.get('data_vencimento'))
                grupo_id = uuid.uuid4()
                
                for i in range(total_parcelas):
                    nova_data = add_months(data_inicial, i)
                    dados_parcela = dados.copy()
                    dados_parcela['descricao'] = f"{dados.get('descricao')} ({i+1}/{total_parcelas})"
                    dados_parcela['valor'] = valor_parcela
                    dados_parcela['data_vencimento'] = nova_data
                    dados_parcela['parcela_atual'] = i+1
                    dados_parcela['total_parcelas'] = total_parcelas
                    dados_parcela['grupo_parcelamento'] = grupo_id
                    
                    serializer = self.get_serializer(data=dados_parcela)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                
                return Response({'mensagem': f'{total_parcelas} parcelas geradas.'}, status=201)
            except Exception as e:
                return Response({'erro': str(e)}, status=400)
        
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
    