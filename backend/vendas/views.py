from rest_framework import viewsets, status
from rest_framework.decorators import action
from django.utils import timezone
from rest_framework.response import Response
from .models import Venda, ItemVenda
from .serializers import VendaSerializer, VendaListSerializer, VendaDetailSerializer, ItemVendaSerializer
from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse
from django.conf import settings
import os
from django.utils.text import slugify

from .services import criar_orcamento_venda, aprovar_venda

class VendaViewSet(viewsets.ModelViewSet):
    queryset = Venda.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return VendaListSerializer
        if self.action == 'retrieve':
            return VendaDetailSerializer
        return VendaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        orcamento = criar_orcamento_venda(serializer.validated_data)
        response_serializer = self.get_serializer(orcamento)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        venda = self.get_object()
        venda_aprovada = aprovar_venda(venda)
        serializer = self.get_serializer(venda_aprovada)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        venda = self.get_object()
        logo_path = f"file://{os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')}"

        context = {
            'venda': venda,
            'data_hoje': timezone.now(),
            'logo_path': logo_path,
            'valor_final': venda.valor_total - venda.desconto - venda.valor_entrada,
            'empty_rows': range(max(0, 5 - venda.itens.count())),
        }

        html_string = render_to_string('utils/pdfs/orcamento_venda.html', context)
        html = HTML(string=html_string)
        pdf = html.write_pdf()

        # --- Lógica do nome do arquivo ---
        cliente_nome_slug = slugify(venda.cliente.razao_social)
        data_atual_slug = timezone.now().strftime('%d-%m-%Y')
        filename = f"orcamento_{cliente_nome_slug}_{data_atual_slug}.pdf"

        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename={filename}'
        
        return response

    @action(detail=True, methods=['post'])
    def upload_comprovante(self, request, pk=None):
        venda = self.get_object()
        file = request.data.get('comprovante')
        if not file:
            return Response({'error': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        venda.comprovante_pagamento = file
        venda.save()
        
        return Response({'status': 'Comprovante enviado com sucesso.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        venda = self.get_object()
        if venda.status != 'ORCAMENTO':
            return Response({'error': 'Itens só podem ser adicionados a orçamentos.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ItemVendaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(venda=venda)
            # Recalcula o total da venda
            venda.valor_total = sum(item.valor_total_item for item in venda.itens.all())
            venda.save()
            return Response(VendaDetailSerializer(venda).data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def remove_item(self, request, pk=None):
        venda = self.get_object()
        if venda.status != 'ORCAMENTO':
            return Response({'error': 'Itens só podem ser removidos de orçamentos.'}, status=status.HTTP_400_BAD_REQUEST)
        
        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'error': 'item_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = ItemVenda.objects.get(id=item_id, venda=venda)
            item.delete()
            # Recalcula o total da venda
            venda.valor_total = sum(item.valor_total_item for item in venda.itens.all())
            venda.save()
            return Response(VendaDetailSerializer(venda).data, status=status.HTTP_200_OK)
        except ItemVenda.DoesNotExist:
            return Response({'error': 'Item não encontrado nesta venda.'}, status=status.HTTP_404_NOT_FOUND)
