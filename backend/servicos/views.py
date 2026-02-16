from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.utils import timezone
import traceback
import os
from django.conf import settings

from utils.pdf_service import gerar_pdf_from_html

from utils.permissions import IsFuncionario
from .models import OrdemServico, ItemServico, AnexoServico, Notificacao, ComentarioOrdemServico
from .serializers import OrdemServicoSerializer, ItemServicoSerializer, AnexoServicoSerializer, NotificacaoSerializer, ComentarioOrdemServicoSerializer

# Importa a lógica de negócio
from .services import finalizar_ordem_servico, adicionar_peca_os, atualizar_ordem_servico

class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsFuncionario]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        # Otimiza queries e inclui técnicos no prefetch
        qs = OrdemServico.objects.all().select_related(
            'cliente', 'tecnico_responsavel', 'empresa'
        ).prefetch_related('itens', 'anexos', 'tecnicos', 'ativos').order_by('-created_at')

        # 1. Filtro de Segurança (Quem vê o quê)
        # Comentado para permitir que todos os técnicos vejam todas as OSs da empresa
        # if hasattr(user, 'equipe') and user.equipe.cargo not in ['GESTOR', 'SOCIO']:
        #      from django.db.models import Q
        #      # Técnico vê OS onde é responsável OU onde está na equipe de apoio
        #      qs = qs.filter(Q(tecnico_responsavel=user.equipe) | Q(tecnicos=user.equipe)).distinct()

        # 2. Filtro MULTI-EMPRESA (Navegação no Front)
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)

        # 3. Filtros Padrão
        ativo_id = self.request.query_params.get('ativo')
        cliente_id = self.request.query_params.get('cliente')
        
        if ativo_id:
            qs = qs.filter(ativos__id=ativo_id)
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        return qs

    def perform_create(self, serializer):
        save_kwargs = {}
        # Auto-atribui responsável se não vier
        if 'tecnico_responsavel' not in serializer.validated_data:
            if hasattr(self.request.user, 'equipe'):
                save_kwargs['tecnico_responsavel'] = self.request.user.equipe

        # Grava a empresa selecionada no front
        empresa_id = self.request.data.get('empresa') or self.request.query_params.get('empresa')
        if empresa_id:
            save_kwargs['empresa_id'] = empresa_id

        serializer.save(**save_kwargs)

    # === UPDATE CUSTOMIZADO ===
    def update(self, request, *args, **kwargs):
        try:
            # Usa o service para garantir atualização de técnicos (ManyToMany)
            os = atualizar_ordem_servico(kwargs['pk'], request.data)
            serializer = self.get_serializer(os)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"erro": self._format_validation_error(e)}, status=400)
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='adicionar-item')
    def adicionar_item(self, request, pk=None):
        try:
            item = adicionar_peca_os(
                os_id=pk,
                produto_id=request.data.get('produto'),
                quantidade=int(request.data.get('quantidade', 1)),
                preco_venda=request.data.get('preco_venda')
            )
            return Response(ItemServicoSerializer(item).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"erro": self._format_validation_error(e)}, status=400)
        except Exception as e:
            return Response({"erro": str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='finalizar')
    def finalizar(self, request, pk=None):
        os = self.get_object()
        try:
            # Service gera financeiro e baixa estoque
            os_atualizada = finalizar_ordem_servico(os, request.user)
            return Response(OrdemServicoSerializer(os_atualizada).data)
        except ValidationError as e:
            return Response({"erro": self._format_validation_error(e)}, status=400)
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": f"Erro interno no servidor: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'], url_path='anexar')
    def anexar_arquivo(self, request, pk=None):
        os = self.get_object()
        arquivo = request.FILES.get('arquivo')
        if not arquivo: 
            return Response({"erro": "Nenhum arquivo detectado na requisição"}, status=400)
        
        anexo = AnexoServico.objects.create(
            os=os, arquivo=arquivo,
            tipo=request.data.get('tipo', 'OUTRO'),
            descricao=request.data.get('descricao', '')
        )
        return Response(AnexoServicoSerializer(anexo).data, status=201)

    @action(detail=True, methods=['get', 'post'])
    def comentarios(self, request, pk=None):
        ordem_servico = self.get_object()
        if request.method == 'GET':
            comentarios = ordem_servico.comentarios.all()
            serializer = ComentarioOrdemServicoSerializer(comentarios, many=True, context={'request': request})
            return Response(serializer.data)
        
        if request.method == 'POST':
            autor = getattr(request.user, 'equipe', None)
            if not autor:
                return Response({"erro": "Usuário não tem um perfil de equipe associado."}, status=status.HTTP_403_FORBIDDEN)

            serializer = ComentarioOrdemServicoSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(ordem_servico=ordem_servico, autor=autor)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='gerar_orcamento')
    def gerar_orcamento(self, request, pk=None):
        os_obj = self.get_object()
        
        itens_list = list(os_obj.itens.all()) if hasattr(os_obj, 'itens') else []
        num_itens = len(itens_list)
        # Calculate how many empty rows are needed to reach a minimum of 5
        empty_rows = range(5 - num_itens) if num_itens < 5 else []

        context = {
            'os': os_obj,
            'cliente': os_obj.cliente,
            'itens': itens_list,
            'empty_rows': empty_rows,
            'mao_de_obra': os_obj.valor_mao_de_obra,
            'desconto': os_obj.desconto,
            'valor_final': os_obj.valor_total_geral,
            'data_hoje': timezone.now(),
            'observacoes': os_obj.descricao_problema or "Observações do serviço...",
            'logo_path': f"file://{os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')}"
        }
        
        try:
            pdf_file = gerar_pdf_from_html('utils/pdfs/orcamento.html', context)
            
            file_name = f"Orcamento_OS_{os_obj.id}_{timezone.now().strftime('%Y%m%d')}.pdf"
            os_obj.arquivo_orcamento.save(file_name, pdf_file, save=True)
            
            return Response({"mensagem": "Orçamento gerado com sucesso", "url": request.build_absolute_uri(os_obj.arquivo_orcamento.url)})
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": f"Erro ao gerar PDF: {str(e)}"}, status=500)

    def _format_validation_error(self, e):
        if hasattr(e, 'message_dict'):
            return e.message_dict
        return e.messages[0] if e.messages else str(e)


class ItemServicoViewSet(viewsets.ModelViewSet):
    queryset = ItemServico.objects.all()
    serializer_class = ItemServicoSerializer
    permission_classes = [IsFuncionario]

    def perform_destroy(self, instance):
        if instance.os.status in ['CONCLUIDO', 'FINALIZADO']:
            raise ValidationError("Operação bloqueada: Ordem de Serviço já finalizada.")
        instance.delete()

class AnexoServicoViewSet(viewsets.ModelViewSet):
    queryset = AnexoServico.objects.all()
    serializer_class = AnexoServicoSerializer
    permission_classes = [IsFuncionario]

    def perform_destroy(self, instance):
        # Bloquear exclusão se a OS principal estiver concluída/finalizada
        if instance.os.status in [OrdemServico.Status.CONCLUIDO, OrdemServico.Status.FINALIZADO]:
            raise ValidationError("Operação bloqueada: A Ordem de Serviço já foi concluída.")
        instance.delete()

class NotificacaoViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacaoSerializer
    permission_classes = [IsFuncionario]

    def get_queryset(self):
        return Notificacao.objects.filter(destinatario=self.request.user)

    @action(detail=True, methods=['patch'])
    def marcar_como_lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save()
        return Response({'status': 'ok'})
        
    @action(detail=False, methods=['patch'])
    def marcar_todas_lidas(self, request):
        self.get_queryset().update(lida=True)
        return Response({'status': 'ok'})