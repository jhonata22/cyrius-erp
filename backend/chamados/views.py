from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
import os
import traceback
from django.conf import settings

# MODELOS E SERIALIZERS
from .models import Chamado, AssuntoChamado, ItemChamado, AnexoChamado
from .serializers import (
    ChamadoSerializer, AssuntoChamadoSerializer, ChamadoRelacionadoSerializer, 
    ComentarioChamadoSerializer, ItemChamadoSerializer, AnexoChamadoSerializer
)
from .services import atualizar_chamado
from estoque.models import Produto
from utils.pdf_service import gerar_pdf_from_html

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class AssuntoChamadoViewSet(viewsets.ModelViewSet):
    queryset = AssuntoChamado.objects.filter(ativo=True)
    serializer_class = AssuntoChamadoSerializer

class ChamadoViewSet(viewsets.ModelViewSet):
    queryset = Chamado.objects.all().order_by('-created_at')
    serializer_class = ChamadoSerializer
    pagination_class = StandardResultsSetPagination
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = Chamado.objects.all().select_related(
            'cliente', 'tecnico', 'empresa'
        ).prefetch_related(
            'assuntos', 'tecnicos', 'itens__produto', 'anexos_os'
        ).order_by('-created_at')
        return queryset

    # ==========================================
    # CORE CRUD OPERATIONS
    # ==========================================
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
            traceback.print_exc()
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ==========================================
    # CUSTOM ACTIONS (SUPER CHAMADO)
    # ==========================================
    @action(detail=True, methods=['post'], url_path='adicionar-item')
    def adicionar_item(self, request, pk=None):
        chamado = self.get_object()
        if chamado.status == 'FINALIZADO':
            return Response({"erro": "Não é possível adicionar itens a um chamado finalizado."}, status=status.HTTP_400_BAD_REQUEST)
        
        produto_id = request.data.get('produto')
        quantidade = int(request.data.get('quantidade', 1))
        
        try:
            produto = Produto.objects.get(pk=produto_id)
            if produto.estoque_atual < quantidade:
                return Response({"erro": f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque_atual}"}, status=status.HTTP_400_BAD_REQUEST)

            preco_venda = request.data.get('preco_venda', produto.preco_venda_sugerido)
            
            item = ItemChamado.objects.create(
                chamado=chamado,
                produto=produto,
                quantidade=quantidade,
                preco_venda=preco_venda
            )
            return Response(ItemChamadoSerializer(item).data, status=status.HTTP_201_CREATED)
        except Produto.DoesNotExist:
            return Response({"erro": "Produto não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='anexar')
    def anexar_arquivo(self, request, pk=None):
        chamado = self.get_object()
        arquivo = request.FILES.get('arquivo')
        if not arquivo:
            return Response({"erro": "Nenhum arquivo detectado."}, status=status.HTTP_400_BAD_REQUEST)
        
        anexo = AnexoChamado.objects.create(
            chamado=chamado,
            arquivo=arquivo,
            tipo=request.data.get('tipo', 'OUTRO'),
            descricao=request.data.get('descricao', '')
        )
        serializer = AnexoChamadoSerializer(anexo, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'get'], url_path='gerar-orcamento')
    def gerar_orcamento(self, request, pk=None):
        chamado = self.get_object()
        itens_list = list(chamado.itens.all())
        num_itens = len(itens_list)
        empty_rows = range(max(0, 5 - num_itens))

        context = {
            'os': chamado,
            'cliente': chamado.cliente,
            'itens': itens_list,
            'empty_rows': empty_rows,
            'mao_de_obra': chamado.valor_mao_de_obra,
            'desconto': chamado.desconto,
            'valor_final': chamado.valor_total_geral,
            'data_hoje': timezone.now(),
            'observacoes': chamado.descricao_detalhada or "",
            'logo_path': f"file://{os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')}"
        }
        
        try:
            file_name = f"Orcamento_{chamado.protocolo}_{timezone.now().strftime('%Y%m%d%H%M')}.pdf"
            pdf_file = gerar_pdf_from_html('utils/pdfs/orcamento.html', context, filename=file_name)
            
            anexo, created = AnexoChamado.objects.get_or_create(
                chamado=chamado,
                tipo='ORCAMENTO',
                defaults={'descricao': f'Orçamento gerado em {timezone.now().strftime("%d/%m/%Y %H:%M")}'}
            )
            
            # This explicitly saves the file to the anexo's path, overwriting if it exists.
            anexo.arquivo.save(file_name, pdf_file, save=True)

            serializer = AnexoChamadoSerializer(anexo, context={'request': request})
            return Response({"mensagem": "Orçamento gerado com sucesso", "anexo": serializer.data})
        
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": f"Erro ao gerar PDF: {str(e)}"}, status=500)

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        return Response({})

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
                return Response({"erro": "Usuário não tem um perfil associado."}, status=status.HTTP_403_FORBIDDEN)

            serializer = ComentarioChamadoSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(chamado=chamado, autor=autor)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def relacionados(self, request, pk=None):
        try:
            chamado_atual = self.get_object()
            assuntos = chamado_atual.assuntos.all()
            
            if not assuntos.exists():
                return Response([], status=status.HTTP_200_OK)

            resultado = []
            for assunto in assuntos:
                chamados = Chamado.objects.prefetch_related('resolucoes_assuntos').filter(
                    assuntos=assunto, status='FINALIZADO'
                ).exclude(id=chamado_atual.id).order_by('-data_fechamento')[:5]
                
                serializer = ChamadoRelacionadoSerializer(chamados, many=True, context={'assunto_id': assunto.id})
                resultado.append({
                    "assunto_id": assunto.id,
                    "assunto_titulo": assunto.titulo,
                    "historico": serializer.data
                })

            return Response(resultado, status=status.HTTP_200_OK)
        except Chamado.DoesNotExist:
            return Response({"detalhe": "Chamado não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            traceback.print_exc()
            return Response({"erro_debug": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ItemChamadoViewSet(viewsets.ModelViewSet):
    queryset = ItemChamado.objects.all()
    serializer_class = ItemChamadoSerializer

    def perform_destroy(self, instance):
        if instance.chamado.status == 'FINALIZADO':
            raise ValidationError("Não é possível remover itens de um chamado finalizado.")
        instance.delete()

class AnexoChamadoViewSet(viewsets.ModelViewSet):
    queryset = AnexoChamado.objects.all()
    serializer_class = AnexoChamadoSerializer

    def perform_destroy(self, instance):
        if instance.chamado.status == 'FINALIZADO':
            raise ValidationError("Não é possível remover anexos de um chamado finalizado.")
        instance.delete()