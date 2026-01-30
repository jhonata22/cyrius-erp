# chamados/views.py
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

from .models import Chamado
from .serializers import ChamadoSerializer
from .services import atualizar_chamado 

# === IMPORTANTE: Importar o model do Financeiro ===
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

    def get_queryset(self):
        """ Filtragem padrão para a listagem (Chamados.jsx) """
        queryset = Chamado.objects.all().order_by('-created_at')
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

    # =========================================================
    # ROTA NOVA: GET /api/chamados/estatisticas/?mes=YYYY-MM
    # =========================================================
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
        data_inicio = datetime(ano, mes, 1, 0, 0, 0)
        data_fim = datetime(ano, mes, ultimo_dia, 23, 59, 59)

        qs_mes = Chamado.objects.filter(data_abertura__range=(data_inicio, data_fim))

        stats = qs_mes.aggregate(
            total=Count('id'),
            abertos=Count('id', filter=Q(status='ABERTO')),
            andamento=Count('id', filter=Q(status='EM_ANDAMENTO')),
            finalizados=Count('id', filter=Q(status='FINALIZADO'))
        )

        # Mantenho sua lógica de pegar o nome do cliente aqui para as estatísticas de Chamado
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

    def update(self, request, *args, **kwargs):
        try:
            # 1. Atualiza o chamado
            chamado = atualizar_chamado(
                chamado_id=kwargs['pk'],
                dados_atualizacao=request.data,
                arquivos=request.FILES, 
                usuario_responsavel=request.user
            )

            # === [INÍCIO DA CORREÇÃO: GRAVAR NO FINANCEIRO] ===
            # Verifica se o chamado foi finalizado e tem custo de transporte
            if chamado.status == 'FINALIZADO' and chamado.custo_transporte and chamado.custo_transporte > 0:
                
                descricao_lanc = f"Visita Técnica #{chamado.id} - {chamado.tecnico.nome if chamado.tecnico else 'Técnico'}"
                
                # Usa update_or_create para garantir que não duplicará se você editar o chamado novamente.
                # Ele busca pela descrição (que contem o ID do chamado).
                LancamentoFinanceiro.objects.update_or_create(
                    descricao__startswith=f"Visita Técnica #{chamado.id}", 
                    defaults={
                        'descricao': descricao_lanc,
                        'valor': chamado.custo_transporte,
                        'tipo_lancamento': 'SAIDA',
                        'categoria': 'SERVICO', # Ajuste se sua categoria for outra (ex: TRANSPORTE)
                        'data_vencimento': chamado.data_fechamento.date() if chamado.data_fechamento else timezone.now().date(),
                        'status': 'PAGO', # Já lança como pago
                        'forma_pagamento': 'DINHEIRO',
                        'cliente': chamado.cliente,
                        'tecnico': chamado.tecnico
                    }
                )
            
            # (Opcional) Se você reabrir o chamado ou zerar o custo, removemos o lançamento do financeiro
            elif chamado.status != 'FINALIZADO' or chamado.custo_transporte == 0:
                LancamentoFinanceiro.objects.filter(descricao__startswith=f"Visita Técnica #{chamado.id}").delete()
            # === [FIM DA CORREÇÃO] ===

            serializer = self.get_serializer(chamado)
            return Response(serializer.data)

        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({"erro": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)