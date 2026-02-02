from rest_framework import viewsets, status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
import traceback # Para ver o erro real no terminal
import sys # Para garantir que o print saia no log

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
        print("\n\n=== INICIANDO CREATE MOVIMENTAÇÃO ===")
        print(f"DADOS RECEBIDOS: {request.data}")
        
        try:
            # 1. Validar e Buscar Produto
            produto_id = request.data.get('produto')
            if not produto_id:
                raise ValidationError("O campo 'produto' é obrigatório.")
            
            print(f"Buscando produto ID: {produto_id}")
            produto = Produto.objects.get(pk=produto_id)
            print(f"Produto encontrado: {produto.nome} | Estoque Atual: {produto.estoque_atual}")
            
            # 2. Buscar Cliente (Se houver)
            cliente = None
            cliente_id = request.data.get('cliente')
            if cliente_id:
                print(f"Buscando cliente ID: {cliente_id}")
                from django.apps import apps
                try:
                    Cliente = apps.get_model('clientes', 'Cliente')
                    cliente = Cliente.objects.get(pk=cliente_id)
                    print(f"Cliente encontrado: {cliente.razao_social}")
                except Exception as e:
                    print(f"Erro ao buscar cliente: {e}")
                    # Não vamos travar se não achar cliente, apenas logar (ou lance erro se preferir)

            # 3. Buscar Fornecedor (Se houver)
            fornecedor = None
            fornecedor_id = request.data.get('fornecedor')
            if fornecedor_id:
                print(f"Buscando fornecedor ID: {fornecedor_id}")
                fornecedor = Fornecedor.objects.get(pk=fornecedor_id)
                print(f"Fornecedor encontrado: {fornecedor.razao_social}")

            # 4. Arquivos
            arquivos = {
                'arquivo_1': request.FILES.get('arquivo_1'),
                'arquivo_2': request.FILES.get('arquivo_2')
            }
            
            dados_financeiros = {
                'total_parcelas': request.data.get('total_parcelas', 1)
            }

            # 5. Processar no Service
            print("Chamando service processar_movimentacao_estoque...")
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
            print("Service finalizado com sucesso.")
            
            return Response(
                MovimentacaoEstoqueSerializer(movimentacao).data, 
                status=status.HTTP_201_CREATED
            )

        except Produto.DoesNotExist:
             print("ERRO: Produto não encontrado no banco.")
             return Response({"erro": "Produto não encontrado"}, status=404)
        except ValidationError as e:
            print(f"ERRO DE VALIDAÇÃO: {e.message}")
            return Response({"erro": e.message}, status=400)
        except Exception as e:
            # AQUI VAMOS PEGAR O ERRO REAL QUE CAUSA O 500
            print("\n\n========================================")
            print("ERRO CRÍTICO NO CREATE MOVIMENTAÇÃO:")
            print(str(e))
            traceback.print_exc() # Imprime a pilha completa do erro
            print("========================================\n\n")
            return Response({"erro": f"Erro interno: {str(e)}"}, status=500)