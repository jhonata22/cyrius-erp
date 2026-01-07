from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import transaction # Importante para segurança ao salvar
from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Chamado, ChamadoTecnico, LancamentoFinanceiro, Ativo
)
from .serializers import (
    ClienteSerializer, ContatoClienteSerializer, ProvedorInternetSerializer,
    ContaEmailSerializer, DocumentacaoTecnicaSerializer,
    EquipeSerializer, ChamadoSerializer, ChamadoTecnicoSerializer,
    LancamentoFinanceiroSerializer, AtivoSerializer
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