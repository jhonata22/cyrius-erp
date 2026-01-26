from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError # Erro disparado pelo models/services
import traceback

from utils.permissions import IsFuncionario
from .models import OrdemServico, ItemServico, AnexoServico, Notificacao
from .serializers import OrdemServicoSerializer, ItemServicoSerializer, AnexoServicoSerializer, NotificacaoSerializer
from .services import finalizar_ordem_servico, adicionar_peca_os

class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer
    permission_classes = [IsFuncionario]

    def get_queryset(self):
        user = self.request.user
        qs = OrdemServico.objects.all().select_related(
            'cliente', 'tecnico_responsavel', 'ativo'
        ).prefetch_related('itens', 'anexos').order_by('-created_at')

        # Filtro: Técnicos comuns vêem apenas suas ordens
        if hasattr(user, 'equipe') and user.equipe.cargo not in ['GESTOR', 'SOCIO']:
             qs = qs.filter(tecnico_responsavel=user.equipe)

        # Filtros de URL (Query Params)
        ativo_id = self.request.query_params.get('ativo')
        cliente_id = self.request.query_params.get('cliente')
        
        if ativo_id:
            qs = qs.filter(ativo_id=ativo_id)
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        return qs

    def perform_create(self, serializer):
        # Auto-atribui o técnico logado se não for enviado
        if 'tecnico_responsavel' not in serializer.validated_data:
            if hasattr(self.request.user, 'equipe'):
                serializer.save(tecnico_responsavel=self.request.user.equipe)
            else:
                serializer.save()
        else:
            serializer.save()

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
            # Captura erros de estoque ou validações de modelo
            return Response({"erro": self._format_validation_error(e)}, status=400)
        except Exception as e:
            return Response({"erro": str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='finalizar')
    def finalizar(self, request, pk=None):
        os = self.get_object()
        try:
            os_atualizada = finalizar_ordem_servico(os, request.user)
            return Response(OrdemServicoSerializer(os_atualizada).data)
        
        except ValidationError as e:
            # Captura erro de saldo 0.0 ou casas decimais no financeiro
            return Response({"erro": self._format_validation_error(e)}, status=400)
        
        except Exception as e:
            traceback.print_exc() # Log no terminal para debug
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

    def _format_validation_error(self, e):
        """
        Helper para transformar ValidationError do Django em algo que o React entenda.
        """
        if hasattr(e, 'message_dict'):
            return e.message_dict  # Retorna dicionário: {'campo': ['erro']}
        return e.messages[0] if e.messages else str(e) # Retorna string amigável


# --- CRUDs Adicionais ---

class ItemServicoViewSet(viewsets.ModelViewSet):
    queryset = ItemServico.objects.all()
    serializer_class = ItemServicoSerializer
    permission_classes = [IsFuncionario]

    def perform_destroy(self, instance):
        if instance.os.status in ['CONCLUIDO', 'FINALIZADO']:
            raise ValidationError("Operação bloqueada: Ordem de Serviço já finalizada.")
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