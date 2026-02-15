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

# MODELOS E SERIALIZERS
from .models import Chamado, AssuntoChamado, ComentarioChamado
from .serializers import ChamadoSerializer, AssuntoChamadoSerializer, ChamadoRelacionadoSerializer, ComentarioChamadoSerializer
from .services import atualizar_chamado
from equipe.models import Equipe  # Importação corrigida
from servicos.models import OrdemServico

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class AssuntoChamadoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AssuntoChamado.objects.filter(ativo=True)
    serializer_class = AssuntoChamadoSerializer

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

        
    @action(detail=True, methods=['get'])
    def relacionados(self, request, pk=None):
        try:
            chamado_atual = self.get_object()
            if not chamado_atual.assunto:
                return Response([], status=status.HTTP_200_OK)

            chamados_relacionados = Chamado.objects.filter(
                assunto=chamado_atual.assunto,
                status='FINALIZADO',
            ).exclude(
                id=chamado_atual.id
            ).order_by('-data_fechamento')[:5]

            serializer = ChamadoRelacionadoSerializer(chamados_relacionados, many=True)
            return Response(serializer.data)

        except Chamado.DoesNotExist:
            return Response({"detalhe": "Chamado não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"erro_debug": str(e), "detalhe": "Erro ao buscar chamados relacionados."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        queryset = Chamado.objects.all().order_by('-created_at')
        
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)

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

        ativo_id = self.request.query_params.get('ativo')
        if ativo_id:
            queryset = queryset.filter(ativo_id=ativo_id)
            
        return queryset

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        mes_ref = request.query_params.get('mes') 
        empresa_id = request.query_params.get('empresa')
        
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
            # Definição do período
            dt_ini_naive = datetime(ano, mes, 1, 0, 0, 0)
            dt_fim_naive = datetime(ano, mes, ultimo_dia, 23, 59, 59)
            data_inicio = timezone.make_aware(dt_ini_naive)
            data_fim = timezone.make_aware(dt_fim_naive)
            
            # === UNIFIED STATS ===
            
            # Queryset base para CHAMADOS
            qs_chamados_mes = Chamado.objects.filter(data_abertura__range=(data_inicio, data_fim))
            if empresa_id:
                qs_chamados_mes = qs_chamados_mes.filter(empresa_id=empresa_id)

            # Queryset base para SERVIÇOS
            qs_os_mes = OrdemServico.objects.filter(data_entrada__range=(data_inicio, data_fim))
            if empresa_id:
                qs_os_mes = qs_os_mes.filter(empresa_id=empresa_id)
            
            # 1. Agregados para os Cards (CHAMADOS)
            stats_chamados = qs_chamados_mes.aggregate(
                total=Count('id', distinct=True),
                abertos=Count('id', filter=Q(status='ABERTO'), distinct=True),
                andamento=Count('id', filter=Q(status__in=['EM_ANDAMENTO', 'AGENDADO']), distinct=True),
                finalizados=Count('id', filter=Q(status='FINALIZADO'), distinct=True)
            )

            # Agregados para os Cards (SERVIÇOS)
            stats_os = qs_os_mes.aggregate(
                total=Count('id', distinct=True),
                abertos=Count('id', filter=Q(status='ORCAMENTO'), distinct=True),
                andamento=Count('id', filter=Q(status__in=['APROVADO', 'EM_EXECUCAO', 'AGUARDANDO_PECA']), distinct=True),
                finalizados=Count('id', filter=Q(status='FINALIZADO'), distinct=True)
            )
            
            # Unificar os stats
            total_unificado = stats_chamados['total'] + stats_os['total']
            abertos_unificado = stats_chamados['abertos'] + stats_os['abertos']
            andamento_unificado = stats_chamados['andamento'] + stats_os['andamento']
            finalizados_unificado = stats_chamados['finalizados'] + stats_os['finalizados']
            
            # 2. Listas Operacionais (mantendo apenas chamados por enquanto)
            ultimos_pendentes = qs_chamados_mes.filter(status='ABERTO').order_by('-created_at')[:5]
            em_andamento = qs_chamados_mes.filter(status__in=['EM_ANDAMENTO', 'AGENDADO']).order_by('data_agendamento')[:5]
            ultimos_resolvidos = qs_chamados_mes.filter(status='FINALIZADO').order_by('-data_fechamento')[:5]

            # 3. RANKING DE TÉCNICOS UNIFICADO
            from django.db.models import F

            chamado_finalizado_filter = Q(chamado__status='FINALIZADO', chamado__data_fechamento__range=(data_inicio, data_fim))
            os_concluido_filter = Q(servicos_participante__status='FINALIZADO', servicos_participante__data_finalizacao__range=(data_inicio, data_fim))

            if empresa_id:
                chamado_finalizado_filter &= Q(chamado__empresa_id=empresa_id)
                os_concluido_filter &= Q(servicos_participante__empresa_id=empresa_id)

            ranking_raw = Equipe.objects.annotate(
                chamados_count=Count('chamado', filter=chamado_finalizado_filter, distinct=True),
                servicos_count=Count('servicos_participante', filter=os_concluido_filter, distinct=True)
            ).annotate(
                total_geral=F('chamados_count') + F('servicos_count')
            ).filter(total_geral__gt=0).order_by('-total_geral')[:5]

            ranking_tecnicos = [{
                "nome": t.nome,
                "chamados_count": t.chamados_count,
                "servicos_count": t.servicos_count,
                "total_geral": t.total_geral
            } for t in ranking_raw]

            # 4. Lista de Clientes (unificando fontes)
            clientes_chamado = qs_chamados_mes.values_list('cliente__nome', 'cliente__razao_social')
            clientes_os = qs_os_mes.values_list('cliente__nome', 'cliente__razao_social')
            raw_empresas = set(clientes_chamado) | set(clientes_os)
            lista_empresas = sorted([n if n else r for n, r in raw_empresas if n or r])

            return Response({
                "total": total_unificado,
                "abertos": abertos_unificado,
                "emAndamento": andamento_unificado,
                "finalizados": finalizados_unificado,
                "empresas": lista_empresas,
                "ultimos_pendentes": ChamadoSerializer(ultimos_pendentes, many=True).data,
                "em_andamento": ChamadoSerializer(em_andamento, many=True).data,
                "ultimos_resolvidos": ChamadoSerializer(ultimos_resolvidos, many=True).data,
                "ranking_tecnicos": ranking_tecnicos,
                "grafico": [
                    { "name": "Abertos", "quantidade": abertos_unificado },
                    { "name": "Em Curso", "quantidade": andamento_unificado },
                    { "name": "Resolvidos", "quantidade": finalizados_unificado }
                ]
            })
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": str(e)}, status=500)

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
            print(f"ERRO UPDATE: {e}")
            traceback.print_exc()
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    @action(detail=True, methods=['get', 'post'])
    def comentarios(self, request, pk=None):
        chamado = self.get_object()
        if request.method == 'GET':
            comentarios = chamado.comentarios.all()
            serializer = ComentarioChamadoSerializer(comentarios, many=True, context={'request': request})
            return Response(serializer.data)
        
        if request.method == 'POST':
            autor = getattr(request.user, 'equipe', None)
            if not autor:
                return Response({"erro": "Usuário não tem um perfil de equipe associado."}, status=status.HTTP_403_FORBIDDEN)

            serializer = ComentarioChamadoSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(chamado=chamado, autor=autor)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)