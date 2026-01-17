from rest_framework import viewsets, status, parsers
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import date, timedelta
import uuid
import calendar

# --- IMPORTAÇÕES DAS PERMISSÕES ---
from .permissions import IsSocio, IsGestor, IsFuncionario

# --- IMPORTAÇÃO DOS SERVIÇOS (LÓGICA DE NEGÓCIO) ---
from core.services.estoque import processar_movimentacao_estoque
from core.services.chamado import finalizar_chamado
from core.services import financeiro as financeiro_service
from core.services import servico as servico_service # <--- NOVO SERVIÇO

# --- MODELS ---
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Chamado, ChamadoTecnico, LancamentoFinanceiro,
    Ativo, Fornecedor, Produto, MovimentacaoEstoque, FechamentoFinanceiro,
    OrdemServico, ItemServico, AnexoServico, ContratoCliente, LancamentoFinanceiro, DespesaRecorrente
)

# --- SERIALIZERS ---
from .serializers import (
    ClienteSerializer, ContatoClienteSerializer, ProvedorInternetSerializer,
    ContaEmailSerializer, DocumentacaoTecnicaSerializer,
    EquipeSerializer, ChamadoSerializer, ChamadoTecnicoSerializer,
    LancamentoFinanceiroSerializer, AtivoSerializer,
    FornecedorSerializer, ProdutoSerializer, MovimentacaoEstoqueSerializer,
    OrdemServicoSerializer, ItemServicoSerializer, AnexoServicoSerializer, ContratoClienteSerializer
)

def add_months(sourcedate, months):
    """Adiciona meses a uma data sem quebrar em anos bissextos"""
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year,month)[1])
    return date(year, month, day)

# --- MIXIN DE OTIMIZAÇÃO ---
class OptimizedQuerySetMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'cliente'):
            return qs.select_related('cliente')
        return qs

# =====================================================
# 1. CLIENTES & DOCS
# =====================================================

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsFuncionario]

class ContatoClienteViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ContatoCliente.objects.all()
    serializer_class = ContatoClienteSerializer
    permission_classes = [IsFuncionario]

class ProvedorInternetViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ProvedorInternet.objects.all()
    serializer_class = ProvedorInternetSerializer
    permission_classes = [IsFuncionario]

class ContaEmailViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ContaEmail.objects.all()
    serializer_class = ContaEmailSerializer
    permission_classes = [IsFuncionario]

class DocumentacaoTecnicaViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = DocumentacaoTecnica.objects.all()
    serializer_class = DocumentacaoTecnicaSerializer
    permission_classes = [IsFuncionario]

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = ContratoCliente.objects.all()
    serializer_class = ContratoClienteSerializer
    permission_classes = [IsSocio]
    
    # Isso é CRUCIAL para aceitar upload de arquivos (FormData)
    parser_classes = (parsers.MultiPartParser, parsers.FormParser);

# =====================================================
# 2. ATIVOS
# =====================================================

class AtivoViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = Ativo.objects.all()
    serializer_class = AtivoSerializer
    permission_classes = [IsFuncionario]

# =====================================================
# 3. EQUIPE & PERFIL
# =====================================================

class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.all()
    serializer_class = EquipeSerializer
    permission_classes = [IsGestor]

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user
        try:
            membro = user.equipe
        except AttributeError:
            return Response({"erro": "Usuário sem perfil de equipe."}, status=403)

        if request.method == 'GET':
            hoje = timezone.now()
            stats = Chamado.objects.filter(
                chamadotecnico__tecnico=membro,
                created_at__month=hoje.month
            ).aggregate(
                total=Count('id'),
                finalizados=Count('id', filter=Q(status='FINALIZADO'))
            )
            serializer = self.get_serializer(membro)
            return Response({**serializer.data, "stats": stats})

        elif request.method == 'PATCH':
            novo_pass = request.data.get('password')
            if novo_pass:
                user.set_password(novo_pass)
                user.save()
            
            serializer = self.get_serializer(membro, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

# =====================================================
# 4. CHAMADOS
# =====================================================

class ChamadoViewSet(viewsets.ModelViewSet):
    serializer_class = ChamadoSerializer
    permission_classes = [IsFuncionario] 

    def get_queryset(self):
        user = self.request.user
        # Começamos com todos os chamados
        qs = Chamado.objects.all().order_by('-created_at')

        # --- 1. LÓGICA DE PERMISSÃO (SEGURANÇA) ---
        # Se o usuário NÃO for GESTOR/SÓCIO, filtramos para ver apenas os seus
        is_gestor = hasattr(user, 'equipe') and user.equipe.cargo in ['GESTOR', 'SOCIO']
        
        if not is_gestor:
            qs = qs.filter(
                Q(chamadotecnico__tecnico=user.equipe) | Q(tecnicos=None)
            ).distinct()
        
        # (Se for Gestor, ele continua com o 'qs' contendo tudo, sem filtrar ainda)

        # --- 2. LÓGICA DE FILTROS DA URL (FUNCIONALIDADE) ---
        # Agora aplicamos os filtros que vêm do Frontend.
        # Isso deve acontecer para TODOS (Gestor também quer filtrar por ativo se estiver na tela do ativo)

        # Filtro: /api/chamados/?ativo=5
        ativo_id = self.request.query_params.get('ativo')
        if ativo_id:
            qs = qs.filter(ativo_id=ativo_id)

        # Filtro: /api/chamados/?cliente=10
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        return qs

    def perform_create(self, serializer):
        chamado = serializer.save()
        tecnicos = self.request.data.get('tecnicos', [])
        if tecnicos:
            for tid in tecnicos:
                ChamadoTecnico.objects.create(chamado=chamado, tecnico_id=tid)

    def perform_update(self, serializer):
        chamado = serializer.save()
        if chamado.status == 'FINALIZADO':
            # Certifique-se que essa função 'finalizar_chamado' está importada corretamente
            finalizar_chamado(chamado)
# =====================================================
# 5. FINANCEIRO
# =====================================================

class LancamentoFinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.all().select_related('cliente')
    serializer_class = LancamentoFinanceiroSerializer

# --- 1. OVERRIDE DO CREATE (COM TRAVA DE SEGURANÇA) ---
    def create(self, request, *args, **kwargs):
        dados = request.data.copy()
        
        # BLINDAGEM 1: Cliente vazio vira None
        if dados.get('cliente') == "":
            dados['cliente'] = None

        try:
            total_parcelas = int(dados.get('total_parcelas', 1))
        except (ValueError, TypeError):
            total_parcelas = 1
        
        # BLINDAGEM 2: Trava de Segurança Anti-Loop
        # Impede que o sistema tente criar 2026 parcelas se o usuário digitar o ano no campo errado
        if total_parcelas > 60:
            return Response(
                {'erro': f'Segurança: Não é permitido criar mais de 60 parcelas de uma vez. Você tentou criar {total_parcelas}.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Se for à vista (1x), segue o fluxo normal
        if total_parcelas <= 1:
            serializer = self.get_serializer(data=dados)
            try:
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # LÓGICA DE PARCELAMENTO
        try:
            print(f"DEBUG PARCELAS: Iniciando criação de {total_parcelas} parcelas...") # Veja isso no terminal
            
            valor_total = float(dados.get('valor'))
            valor_parcela = valor_total / total_parcelas
            data_inicial = date.fromisoformat(dados.get('data_vencimento'))
            grupo_id = uuid.uuid4()
            cliente_id = dados.get('cliente') if dados.get('cliente') else None
            
            # Validação prévia de data para não travar no meio
            if data_inicial.year > 2030: # Exemplo de trava de ano absurdo
                 return Response({'erro': 'Ano de vencimento muito distante.'}, status=status.HTTP_400_BAD_REQUEST)

            lancamentos_criados = []

            for i in range(total_parcelas):
                nova_data = add_months(data_inicial, i)
                
                print(f"Criando parcela {i+1} para {nova_data}...") # Debug
                
                novo_lancamento = LancamentoFinanceiro(
                    descricao=f"{dados.get('descricao')} ({i+1}/{total_parcelas})",
                    valor=valor_parcela,
                    tipo_lancamento=dados.get('tipo_lancamento'),
                    categoria=dados.get('categoria'),
                    forma_pagamento=dados.get('forma_pagamento', 'DINHEIRO'),
                    data_vencimento=nova_data,
                    status=dados.get('status', 'PENDENTE'),
                    cliente_id=cliente_id,
                    parcela_atual=i+1,
                    total_parcelas=total_parcelas,
                    grupo_parcelamento=grupo_id,
                    observacao=dados.get('observacao', '')
                )
                novo_lancamento.save()
                lancamentos_criados.append(novo_lancamento)

            return Response(
                {'mensagem': f'{total_parcelas} parcelas geradas com sucesso!'}, 
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"ERRO CRÍTICO NO BACKEND: {str(e)}")
            return Response({'erro': f"Erro ao processar: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        mes = request.query_params.get('mes')
        ano = request.query_params.get('ano')
        try:
            mes = int(mes) if mes else None
            ano = int(ano) if ano else None
        except ValueError:
            mes = None
            ano = None
        return Response(financeiro_service.calcular_estatisticas_financeiras(mes, ano))

    @action(detail=False, methods=['post'], url_path='gerar-mensalidades')
    def gerar_mensalidades(self, request):
        return Response(financeiro_service.gerar_faturas_mensalidade(request.user))
    
    @action(detail=False, methods=['post'], url_path='baixar-lote')
    def baixar_lote(self, request):
        ids = request.data.get('ids', [])
        updated = LancamentoFinanceiro.objects.filter(id__in=ids).update(
            status='PAGO', 
            data_pagamento=timezone.now().date()
        )
        return Response({'mensagem': f'{updated} lançamentos baixados com sucesso!'})

    @action(detail=False, methods=['post'], url_path='processar-recorrencias')
    def processar_recorrencias(self, request):
        hoje = date.today()
        recorrencias = DespesaRecorrente.objects.filter(ativo=True)
        gerados = 0
        for rec in recorrencias:
            if not rec.ultima_geracao or (rec.ultima_geracao.month != hoje.month or rec.ultima_geracao.year != hoje.year):
                try:
                    data_venc = date(hoje.year, hoje.month, rec.dia_vencimento)
                except ValueError:
                    ultimo_dia = calendar.monthrange(hoje.year, hoje.month)[1]
                    data_venc = date(hoje.year, hoje.month, ultimo_dia)
                
                LancamentoFinanceiro.objects.create(
                    descricao=f"{rec.descricao} (Ref. {hoje.month}/{hoje.year})",
                    valor=rec.valor,
                    tipo_lancamento='SAIDA',
                    categoria=rec.categoria,
                    data_vencimento=data_venc,
                    status='PENDENTE',
                    forma_pagamento='BOLETO',
                    observacao='Gerado automaticamente via Módulo de Recorrência'
                )
                rec.ultima_geracao = hoje
                rec.save()
                gerados += 1
        return Response({'mensagem': f'Processamento concluído. {gerados} novas despesas recorrentes geradas.'})

# 6. ESTOQUE
# =====================================================

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsFuncionario]

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all().order_by('nome')
    serializer_class = ProdutoSerializer
    permission_classes = [IsFuncionario]

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().order_by('-data_movimento')
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsFuncionario]

    # --- MÉTODO DE DEBUG (Remova depois de resolver) ---
    def create(self, request, *args, **kwargs):
        print("\n=== DEBUG INÍCIO REQUEST ===")
        print("DADOS RECEBIDOS:", request.data)
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            print("❌ ERRO DE VALIDAÇÃO DETECTADO:")
            print(serializer.errors) # <--- ISSO VAI MOSTRAR O MOTIVO NO TERMINAL
            print("============================\n")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        print("✅ VALIDAÇÃO OK! INDO PARA O PERFORM_CREATE...")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        dados = serializer.validated_data
        
        print(f"🔧 EXECUTANDO SERVIÇO... Fornecedor ID: {dados.get('fornecedor')}")

        movimentacao = processar_movimentacao_estoque(
            produto=dados['produto'],
            quantidade=dados['quantidade'],
            tipo_movimento=dados['tipo_movimento'],
            usuario=self.request.user,
            cliente=dados.get('cliente'),
            fornecedor=dados.get('fornecedor'),
            preco_unitario=dados.get('preco_unitario', 0)
        )
        serializer.instance = movimentacao# 7. MÓDULO DE SERVIÇOS (ORDEM DE SERVIÇO)
# =====================================================

class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer
    permission_classes = [IsFuncionario]

    def get_queryset(self):
        user = self.request.user
        # Dica: Adicionei 'ativo' no select_related para otimizar a performance
        qs = OrdemServico.objects.all().select_related('cliente', 'tecnico_responsavel', 'ativo').prefetch_related('itens', 'anexos')

        # --- 1. LÓGICA DE PERMISSÃO (SEGURANÇA) ---
        # Se NÃO for GESTOR nem SÓCIO, vê apenas as suas.
        # Se for GESTOR/SÓCIO, passa direto e vê tudo (mas ainda sujeito aos filtros abaixo!)
        if hasattr(user, 'equipe') and user.equipe.cargo not in ['GESTOR', 'SOCIO']:
             qs = qs.filter(tecnico_responsavel=user.equipe)

        # --- 2. LÓGICA DE FILTROS (FUNCIONALIDADE) ---
        # Filtro VITAL para o histórico do equipamento funcionar
        ativo_id = self.request.query_params.get('ativo')
        if ativo_id:
            qs = qs.filter(ativo_id=ativo_id)

        # Filtro opcional por cliente
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        return qs

    # --- CORREÇÃO DO ERRO 400: Lógica de Atribuição Automática ---
    def perform_create(self, serializer):
        # Verifica se o 'tecnico_responsavel' foi enviado no payload validado
        if 'tecnico_responsavel' in serializer.validated_data:
            serializer.save()
        else:
            # Se não veio técnico, atribui o usuário logado
            try:
                serializer.save(tecnico_responsavel=self.request.user.equipe)
            except AttributeError:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("O usuário logado não possui um perfil de Equipe vinculado.")

    # --- AÇÃO 1: ADICIONAR PEÇA/ITEM ---
    @action(detail=True, methods=['post'], url_path='adicionar-item')
    def adicionar_item(self, request, pk=None):
        """
        Rota: POST /api/servicos/{id}/adicionar-item/
        Body: { "produto": 1, "quantidade": 2, "preco_venda": 150.00 }
        """
        produto_id = request.data.get('produto')
        quantidade = int(request.data.get('quantidade', 1))
        preco_venda = request.data.get('preco_venda') # Opcional

        try:
            item = servico_service.adicionar_peca_os(pk, produto_id, quantidade, preco_venda)
            return Response(ItemServicoSerializer(item).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"erro": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"erro": "Erro interno ao processar item."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- AÇÃO 2: ANEXAR ARQUIVO ---
    @action(detail=True, methods=['post'], url_path='anexar')
    def anexar_arquivo(self, request, pk=None):
        """
        Rota: POST /api/servicos/{id}/anexar/
        Form-Data: arquivo (File), tipo (Text), descricao (Text)
        """
        os = self.get_object()
        arquivo = request.FILES.get('arquivo')
        tipo = request.data.get('tipo', 'OUTRO')
        descricao = request.data.get('descricao', '')

        if not arquivo:
            return Response({"erro": "Nenhum arquivo enviado."}, status=400)

        anexo = AnexoServico.objects.create(
            os=os,
            arquivo=arquivo,
            tipo=tipo,
            descricao=descricao
        )
        return Response(AnexoServicoSerializer(anexo).data, status=status.HTTP_201_CREATED)

    # --- AÇÃO 3: FINALIZAR OS ---
    @action(detail=True, methods=['post'], url_path='finalizar')
    def finalizar(self, request, pk=None):
        """
        Rota: POST /api/servicos/{id}/finalizar/
        """
        os = self.get_object()
        try:
            # Chama o serviço poderoso que baixa estoque e gera financeiro
            os_atualizada = servico_service.finalizar_ordem_servico(os, request.user)
            return Response(OrdemServicoSerializer(os_atualizada).data)
        except ValidationError as e:
            return Response({"erro": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Logar erro real no console do servidor
            print(f"Erro Crítico Finalizar OS: {e}")
            return Response({"erro": "Erro ao finalizar OS. Verifique o estoque e tente novamente."}, status=500)

# =====================================================
# 7.1 ITENS DE SERVIÇO (CRUD INDIVIDUAL)
# =====================================================

class ItemServicoViewSet(viewsets.ModelViewSet):
    """
    Permite editar (PATCH) e excluir (DELETE) itens de serviço individualmente.
    A rota para isso é /api/itens-servico/
    """
    queryset = ItemServico.objects.all()
    serializer_class = ItemServicoSerializer
    permission_classes = [IsFuncionario]

    def perform_update(self, serializer):
        # Opcional: Impedir edição se a OS estiver finalizada
        item = self.get_object()
        if item.os.status in ['CONCLUIDO', 'CANCELADO', 'FINALIZADO']:
            raise ValidationError("Não é possível editar itens de uma OS já finalizada.")
        serializer.save()

    def perform_destroy(self, instance):
        # Opcional: Impedir exclusão se a OS estiver finalizada
        if instance.os.status in ['CONCLUIDO', 'CANCELADO', 'FINALIZADO']:
             raise ValidationError("Não é possível remover itens de uma OS já finalizada.")
        instance.delete()