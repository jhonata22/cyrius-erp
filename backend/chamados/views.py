# chamados/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action # <--- IMPORT NOVO
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q # <--- IMPORT NOVO para agregados
from django.utils import timezone
from datetime import datetime
import calendar

from .models import Chamado
from .serializers import ChamadoSerializer
from .services import atualizar_chamado 

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ChamadoViewSet(viewsets.ModelViewSet):
    queryset = Chamado.objects.all().order_by('-created_at')
    serializer_class = ChamadoSerializer
    pagination_class = StandardResultsSetPagination
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        """ Filtragem padrão para a listagem (Chamados.jsx) """
        queryset = Chamado.objects.all().order_by('-created_at')
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        status_filtro = self.request.query_params.get('status')

        if data_inicio and data_fim:
            queryset = queryset.filter(data_abertura__date__range=[data_inicio, data_fim])
        elif data_inicio:
            queryset = queryset.filter(data_abertura__date__gte=data_inicio)
        elif data_fim:
            queryset = queryset.filter(data_abertura__date__lte=data_fim)

        if status_filtro:
            queryset = queryset.filter(status=status_filtro)
            
        return queryset

    # =========================================================
    # ROTA NOVA: GET /api/chamados/estatisticas/?mes=YYYY-MM
    # =========================================================
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        mes_ref = request.query_params.get('mes') # Ex: "2026-01"
        
        # Define o ano e mês (usa o atual como fallback)
        try:
            if mes_ref:
                dt = datetime.strptime(mes_ref, '%Y-%m')
                ano, mes = dt.year, dt.month
            else:
                hoje = timezone.now()
                ano, mes = hoje.year, hoje.month
        except ValueError:
            hoje = timezone.now()
            ano, mes = hoje.year, hoje.month

        # Calcula o primeiro e último dia do mês para o filtro
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        data_inicio = datetime(ano, mes, 1, 0, 0, 0)
        data_fim = datetime(ano, mes, ultimo_dia, 23, 59, 59)

        # Filtra o base queryset pelo período
        qs_mes = Chamado.objects.filter(data_abertura__range=(data_inicio, data_fim))

        # Realiza os cálculos direto no banco (Performance máxima)
        stats = qs_mes.aggregate(
            total=Count('id'),
            abertos=Count('id', filter=Q(status='ABERTO')),
            andamento=Count('id', filter=Q(status='EM_ANDAMENTO')),
            finalizados=Count('id', filter=Q(status='FINALIZADO'))
        )

        # Busca os nomes únicos das empresas atendidas no período
        empresas = qs_mes.values_list('cliente__razao_social', flat=True).order_by().distinct()

        return Response({
            "total": stats['total'],
            "abertos": stats['abertos'],
            "emAndamento": stats['andamento'],
            "finalizados": stats['finalizados'],
            "empresas": list(empresas),
            "grafico": [
                { "name": "Abertos", "quantidade": stats['abertos'] },
                { "name": "Em Curso", "quantidade": stats['andamento'] },
                { "name": "Resolvidos", "quantidade": stats['finalizados'] }
            ]
        })

    def update(self, request, *args, **kwargs):
        try:
            chamado = atualizar_chamado(
                chamado_id=kwargs['pk'],
                dados_atualizacao=request.data,
                arquivos=request.FILES, 
                usuario_responsavel=request.user
            )
            serializer = self.get_serializer(chamado)
            return Response(serializer.data)
        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({"erro": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)