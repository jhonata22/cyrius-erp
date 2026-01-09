from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import transaction # Importante para segurança ao salvar
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Chamado, ChamadoTecnico, LancamentoFinanceiro, Ativo, Fornecedor, Produto, MovimentacaoEstoque
)
from .serializers import (
    ClienteSerializer, ContatoClienteSerializer, ProvedorInternetSerializer,
    ContaEmailSerializer, DocumentacaoTecnicaSerializer,
    EquipeSerializer, ChamadoSerializer, ChamadoTecnicoSerializer,
    LancamentoFinanceiroSerializer, AtivoSerializer, FornecedorSerializer, ProdutoSerializer,
    MovimentacaoEstoqueSerializer
)
from .permissions import IsGestor 

# --- 1. CLIENTE & DOCUMENTAÇÃO ---

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

class ContatoClienteViewSet(viewsets.ModelViewSet):
    queryset = ContatoCliente.objects.all()
    serializer_class = ContatoClienteSerializer
    permission_classes = [IsAuthenticated]

class ProvedorInternetViewSet(viewsets.ModelViewSet):
    queryset = ProvedorInternet.objects.all()
    serializer_class = ProvedorInternetSerializer
    permission_classes = [IsAuthenticated]

class ContaEmailViewSet(viewsets.ModelViewSet):
    queryset = ContaEmail.objects.all()
    serializer_class = ContaEmailSerializer
    permission_classes = [IsAuthenticated]

class DocumentacaoTecnicaViewSet(viewsets.ModelViewSet):
    queryset = DocumentacaoTecnica.objects.all()
    serializer_class = DocumentacaoTecnicaSerializer
    permission_classes = [IsAuthenticated]

# --- 2. INVENTÁRIO (ATIVOS) ---

class AtivoViewSet(viewsets.ModelViewSet):
    queryset = Ativo.objects.all()
    serializer_class = AtivoSerializer
    permission_classes = [IsAuthenticated]

# --- 3. EQUIPE ---

class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.all()
    serializer_class = EquipeSerializer
    permission_classes = [IsAuthenticated]

# --- 4. CHAMADOS (LÓGICA COMPLEXA MANTIDA) ---

class ChamadoViewSet(viewsets.ModelViewSet):
    serializer_class = ChamadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # 1. Admin (Superuser) vê tudo
        if user.is_superuser:
            return Chamado.objects.all().order_by('-created_at')
            
        try:
            # 2. Gestor ou Sócio vê tudo
            if hasattr(user, 'equipe') and user.equipe.cargo in ['GESTOR', 'SOCIO']:
                return Chamado.objects.all().order_by('-created_at')
            
            # 3. Técnico vê APENAS os chamados onde ele está vinculado
            return Chamado.objects.filter(chamadotecnico__tecnico=user.equipe).order_by('-created_at')
            
        except AttributeError:
            return Chamado.objects.none()

    def perform_create(self, serializer):
        with transaction.atomic():
            # 1. Salva os dados básicos do chamado
            chamado = serializer.save()

            # 2. Pega o ID do técnico que veio do Frontend
            tecnicos_data = self.request.data.get('tecnicos')
            
            if tecnicos_data:
                # Garante que seja uma lista (mesmo se vier só um número)
                if not isinstance(tecnicos_data, list):
                    tecnicos_ids = [tecnicos_data]
                else:
                    tecnicos_ids = tecnicos_data

                # 3. Cria o vínculo na tabela ChamadoTecnico
                for tecnico_id in tecnicos_ids:
                    if tecnico_id:
                        try:
                            tecnico = Equipe.objects.get(id=tecnico_id)
                            ChamadoTecnico.objects.create(
                                chamado=chamado,
                                tecnico=tecnico,
                                horas_trabalhadas=0
                            )
                        except Equipe.DoesNotExist:
                            print(f"Erro: Técnico {tecnico_id} não encontrado.")

# --- 5. FINANCEIRO ---

class FinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.all().order_by('-data_vencimento')
    serializer_class = LancamentoFinanceiroSerializer
    permission_classes = [IsGestor]
# =====================================================
# 6. INVENTÁRIO
# =====================================================

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all().order_by('nome')
    serializer_class = ProdutoSerializer
    permission_classes = [IsAuthenticated]

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().order_by('-data_movimento')
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().order_by('-data_movimento')
    serializer_class = MovimentacaoEstoqueSerializer

    def perform_create(self, serializer):
        # Pega os IDs enviados
        cliente_id = self.request.data.get('cliente')
        fornecedor_id = self.request.data.get('fornecedor')

        # Limpeza para evitar que string vazia quebre o banco
        extra_kwargs = {'usuario': self.request.user}
        
        # Se o cliente vier como string vazia ou "null", setamos como None
        if not cliente_id or cliente_id == "null" or cliente_id == "":
            extra_kwargs['cliente'] = None
            
        if not fornecedor_id or fornecedor_id == "null" or fornecedor_id == "":
            extra_kwargs['fornecedor'] = None

        serializer.save(**extra_kwargs)