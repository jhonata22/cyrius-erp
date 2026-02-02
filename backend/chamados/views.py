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
import traceback # IMPORTANTE PARA O DEBUG

from .models import Chamado
from .serializers import ChamadoSerializer
from .services import atualizar_chamado 
from financeiro.models import LancamentoFinanceiro

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ChamadoViewSet(viewsets.ModelViewSet):
    queryset = Chamado.objects.all().order_by('-created_at')
    serializer_class = ChamadoSerializer
    pagination_class = StandardResultsSetPagination
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    # --- DEBUG: Sobrescrevemos o LIST para pegar erros ocultos ---
    def list(self, request, *args, **kwargs):
        print("\n\n=== INICIANDO DEBUG LISTAGEM CHAMADOS ===")
        try:
            # 1. Testar Queryset
            queryset = self.filter_queryset(self.get_queryset())
            total = queryset.count()
            print(f"DEBUG: Queryset encontrou {total} chamados.")

            # 2. Testar Paginação
            page = self.paginate_queryset(queryset)
            if page is not None:
                print(f"DEBUG: Paginando {len(page)} itens.")
                serializer = self.get_serializer(page, many=True)
                # Se der erro, vai pular pro except abaixo
                data = serializer.data 
                print("DEBUG: Serialização da página concluída com sucesso.")
                return self.get_paginated_response(data)

            # Sem paginação
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        except Exception as e:
            print("\n\n============================================")
            print("!!! ERRO CRÍTICO AO LISTAR CHAMADOS !!!")
            print(f"Erro: {str(e)}")
            print("Traceback completo:")
            traceback.print_exc()
            print("============================================\n\n")
            return Response(
                {"erro_debug": str(e), "detalhe": "Olhe o terminal do backend para ver o erro completo."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        print(f"DEBUG: get_queryset chamado. Params: {self.request.query_params}")
        queryset = Chamado.objects.all().order_by('-created_at')
        
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        status_filtro = self.request.query_params.get('status')
        cliente_id = self.request.query_params.get('cliente')

        if data_inicio and data_fim:
            # Filtro simples por string de data (YYYY-MM-DD) funciona bem com __date
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
        print("\n=== DEBUG ESTATISTICAS ===")
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

        # Correção Timezone
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        
        try:
            dt_ini_naive = datetime(ano, mes, 1, 0, 0, 0)
            dt_fim_naive = datetime(ano, mes, ultimo_dia, 23, 59, 59)
            data_inicio = timezone.make_aware(dt_ini_naive)
            data_fim = timezone.make_aware(dt_fim_naive)
            
            print(f"DEBUG: Filtrando estatísticas de {data_inicio} até {data_fim}")

            qs_mes = Chamado.objects.filter(data_abertura__range=(data_inicio, data_fim))

            stats = qs_mes.aggregate(
                total=Count('id'),
                abertos=Count('id', filter=Q(status='ABERTO')),
                andamento=Count('id', filter=Q(status='EM_ANDAMENTO')),
                finalizados=Count('id', filter=Q(status='FINALIZADO'))
            )
            
            # Debug para ver se está travando aqui
            print(f"DEBUG stats calculadas: {stats}")

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
            print(f"ERRO ESTATISTICAS: {e}")
            traceback.print_exc()
            return Response({"erro": str(e)}, status=500)

    def update(self, request, *args, **kwargs):
        # ... (seu código de update existente mantido igual) ...
        try:
            chamado = atualizar_chamado(
                chamado_id=kwargs['pk'],
                dados_atualizacao=request.data,
                arquivos=request.FILES, 
                usuario_responsavel=request.user
            )

            if chamado.status == 'FINALIZADO' and chamado.custo_transporte and chamado.custo_transporte > 0:
                descricao_lanc = f"Visita Técnica #{chamado.id} - {chamado.tecnico.nome if chamado.tecnico else 'Técnico'}"
                LancamentoFinanceiro.objects.update_or_create(
                    descricao__startswith=f"Visita Técnica #{chamado.id}", 
                    defaults={
                        'descricao': descricao_lanc,
                        'valor': chamado.custo_transporte,
                        'tipo_lancamento': 'SAIDA',
                        'categoria': 'SERVICO',
                        'data_vencimento': chamado.data_fechamento.date() if chamado.data_fechamento else timezone.now().date(),
                        'status': 'PAGO',
                        'forma_pagamento': 'DINHEIRO',
                        'cliente': chamado.cliente,
                        'tecnico': chamado.tecnico
                    }
                )
            elif chamado.status != 'FINALIZADO' or chamado.custo_transporte == 0:
                LancamentoFinanceiro.objects.filter(descricao__startswith=f"Visita Técnica #{chamado.id}").delete()

            serializer = self.get_serializer(chamado)
            return Response(serializer.data)

        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({"erro": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"ERRO UPDATE: {e}")
            traceback.print_exc()
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)