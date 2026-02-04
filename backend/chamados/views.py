from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime
import calendar
import traceback

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

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"erro_debug": str(e), "detalhe": "Erro ao listar chamados."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        queryset = Chamado.objects.all().order_by('-created_at')
        
        # === FILTRO MULTI-EMPRESA ===
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        # ============================

        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        status_filtro = self.request.query_params.get('status')
        cliente_id = self.request.query_params.get('cliente')

        if data_inicio and data_fim:
            queryset = queryset.filter(data_abertura__date__range=[data_inicio, data_fim])
        elif data_inicio:
            queryset = queryset.filter(data_abertura__date__gte=data_inicio)
        elif data_fim:
            queryset = queryset.filter(data_abertura__date__lte=data_fim)

        if status_filtro:
            queryset = queryset.filter(status=status_filtro)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
            
        return queryset

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        mes_ref = request.query_params.get('mes') 
        
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

        ultimo_dia = calendar.monthrange(ano, mes)[1]
        
        try:
            dt_ini_naive = datetime(ano, mes, 1, 0, 0, 0)
            dt_fim_naive = datetime(ano, mes, ultimo_dia, 23, 59, 59)
            data_inicio = timezone.make_aware(dt_ini_naive)
            data_fim = timezone.make_aware(dt_fim_naive)
            
            qs_mes = Chamado.objects.filter(data_abertura__range=(data_inicio, data_fim))

            # === FILTRO ESTATISTICA MULTI-EMPRESA ===
            empresa_id = request.query_params.get('empresa')
            if empresa_id:
                qs_mes = qs_mes.filter(empresa_id=empresa_id)
            # ========================================

            stats = qs_mes.aggregate(
                total=Count('id'),
                abertos=Count('id', filter=Q(status='ABERTO')),
                andamento=Count('id', filter=Q(status='EM_ANDAMENTO')),
                finalizados=Count('id', filter=Q(status='FINALIZADO'))
            )
            
            raw_empresas = qs_mes.values_list('cliente__nome', 'cliente__razao_social').order_by().distinct()
            lista_empresas = []
            for nome, razao in raw_empresas:
                nome_exibicao = nome if nome else razao
                if nome_exibicao:
                    lista_empresas.append(nome_exibicao)
            
            empresas = sorted(list(set(lista_empresas)))

            return Response({
                "total": stats['total'],
                "abertos": stats['abertos'],
                "emAndamento": stats['andamento'],
                "finalizados": stats['finalizados'],
                "empresas": empresas,
                "grafico": [
                    { "name": "Abertos", "quantidade": stats['abertos'] },
                    { "name": "Em Curso", "quantidade": stats['andamento'] },
                    { "name": "Resolvidos", "quantidade": stats['finalizados'] }
                ]
            })
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": str(e)}, status=500)

    def update(self, request, *args, **kwargs):
        try:
            # A lógica financeira foi movida 100% para o service
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
            print(f"ERRO UPDATE: {e}")
            traceback.print_exc()
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)