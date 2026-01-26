from rest_framework import viewsets, status
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from .models import Fornecedor, Produto, MovimentacaoEstoque
from .serializers import FornecedorSerializer, ProdutoSerializer, MovimentacaoEstoqueSerializer
from .services import processar_movimentacao_estoque

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all().order_by('nome')
    serializer_class = ProdutoSerializer

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().order_by('-data_movimento')
    serializer_class = MovimentacaoEstoqueSerializer

    def create(self, request, *args, **kwargs):
        try:
            # Prepara dados do request
            produto_id = request.data.get('produto')
            produto = Produto.objects.get(pk=produto_id)
            
            # Pega Cliente/Fornecedor do request
            # Nota: O request envia IDs, mas o service espera Objetos ou IDs
            # Se o service esperasse objetos, teríamos que buscar aqui.
            # No código acima, o service recebe IDs se passar direto? 
            # Ajuste: Vamos passar o objeto para garantir
            
            cliente = None
            if request.data.get('cliente'):
                # Import dinâmico pois Cliente está em outro app
                from django.apps import apps
                Cliente = apps.get_model('clientes', 'Cliente')
                cliente = Cliente.objects.get(pk=request.data.get('cliente'))
                
            fornecedor = None
            if request.data.get('fornecedor'):
                fornecedor = Fornecedor.objects.get(pk=request.data.get('fornecedor'))

            arquivos = {
                'arquivo_1': request.FILES.get('arquivo_1'),
                'arquivo_2': request.FILES.get('arquivo_2')
            }
            
            dados_financeiros = {
                'total_parcelas': request.data.get('total_parcelas', 1)
            }

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
                dados_financeiros=dados_financeiros
            )
            
            return Response(
                MovimentacaoEstoqueSerializer(movimentacao).data, 
                status=status.HTTP_201_CREATED
            )

        except Produto.DoesNotExist:
             return Response({"erro": "Produto não encontrado"}, status=404)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)