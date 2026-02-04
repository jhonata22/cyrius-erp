from rest_framework import viewsets, status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
import traceback
import sys

from .models import Fornecedor, Produto, MovimentacaoEstoque
from .serializers import FornecedorSerializer, ProdutoSerializer, MovimentacaoEstoqueSerializer
from .services import processar_movimentacao_estoque

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs
    
    def perform_create(self, serializer):
        # Salva com a empresa selecionada
        empresa_id = self.request.data.get('empresa') or self.request.query_params.get('empresa')
        serializer.save(empresa_id=empresa_id)

class ProdutoViewSet(viewsets.ModelViewSet):
    # Produtos são globais (catálogo unificado)
    queryset = Produto.objects.all().order_by('nome')
    serializer_class = ProdutoSerializer

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().order_by('-data_movimento')
    serializer_class = MovimentacaoEstoqueSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtra movimentações pela empresa selecionada
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs

    def create(self, request, *args, **kwargs):
        print("\n\n=== INICIANDO CREATE MOVIMENTAÇÃO (MULTI-EMPRESA) ===")
        try:
            # ... (Lógica de busca de produto, cliente, fornecedor IGUAL) ...
            produto_id = request.data.get('produto')
            if not produto_id: raise ValidationError("Produto obrigatório.")
            produto = Produto.objects.get(pk=produto_id)
            
            cliente_id = request.data.get('cliente')
            cliente = None
            if cliente_id:
                from django.apps import apps
                cliente = apps.get_model('clientes', 'Cliente').objects.get(pk=cliente_id)

            fornecedor_id = request.data.get('fornecedor')
            fornecedor = None
            if fornecedor_id:
                fornecedor = Fornecedor.objects.get(pk=fornecedor_id)

            # --- PEGAR EMPRESA ---
            empresa_id = request.data.get('empresa') or request.query_params.get('empresa')
            
            # --- ARQUIVOS ---
            arquivos = {
                'arquivo_1': request.FILES.get('arquivo_1'),
                'arquivo_2': request.FILES.get('arquivo_2')
            }
            dados_financeiros = {'total_parcelas': request.data.get('total_parcelas', 1)}

            # --- CHAMAR SERVICE ---
            movimentacao = processar_movimentacao_estoque(
                produto=produto,
                quantidade=request.data.get('quantidade'),
                tipo_movimento=request.data.get('tipo_movimento'),
                usuario=request.user,
                cliente=cliente,
                fornecedor=fornecedor,
                preco_unitario=request.data.get('preco_unitario'),
                arquivos=arquivos,
                gerar_financeiro=True,
                dados_financeiros=dados_financeiros,
                
                # Passamos a empresa para o service
                empresa_id=empresa_id 
            )
            
            return Response(MovimentacaoEstoqueSerializer(movimentacao).data, status=status.HTTP_201_CREATED)

        except Produto.DoesNotExist:
             return Response({"erro": "Produto não encontrado"}, status=404)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)
        except Exception as e:
            traceback.print_exc()
            return Response({"erro": f"Erro interno: {str(e)}"}, status=500)