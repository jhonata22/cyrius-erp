from rest_framework import permissions

class BaseCargoPermission(permissions.BasePermission):
    """
    Classe base para evitar repetição de código.
    Recupera o cargo do usuário logado com segurança.
    """
    def get_cargo(self, request):
        if not request.user.is_authenticated:
            return None
        
        # Superusuário (Admin do Django) sempre tem acesso irrestrito
        if request.user.is_superuser:
            return 'SUPERUSER'

        try:
            # Garante que lemos o cargo sempre em Maiúsculo
            return request.user.equipe.cargo.upper()
        except AttributeError:
            # Se o usuário não tem vínculo com a tabela Equipe
            return None

# =============================================================
# 1. NÍVEL MÁXIMO (FINANCEIRO)
# =============================================================
class IsSocio(BaseCargoPermission):
    """
    Permite acesso APENAS para SÓCIOS.
    """
    def has_permission(self, request, view):
        cargo = self.get_cargo(request)
        if cargo == 'SUPERUSER':
            return True
            
        return cargo == 'SOCIO'

# =============================================================
# 2. NÍVEL GERENCIAL (EQUIPE E PERFIS)
# =============================================================
class IsGestor(BaseCargoPermission):
    """
    Permite acesso para GESTORES e SÓCIOS.
    """
    def has_permission(self, request, view):
        cargo = self.get_cargo(request)
        if cargo == 'SUPERUSER':
            return True
            
        return cargo in ['GESTOR', 'SOCIO']

# =============================================================
# 3. NÍVEL OPERACIONAL (CHAMADOS, CLIENTES, DOCS)
# =============================================================
class IsFuncionario(BaseCargoPermission):
    """
    Permite acesso para QUALQUER membro da equipe.
    Bloqueia apenas usuários que não tenham perfil na tabela Equipe.
    """
    def has_permission(self, request, view):
        cargo = self.get_cargo(request)
        return cargo is not None

# =============================================================
# 4. PERMISSÃO ESPECIAL: DONO DO PERFIL OU GESTOR
# =============================================================
class IsOwnerOrGestor(BaseCargoPermission):
    """
    Permissão de Objeto: 
    - O próprio usuário pode ver/editar seu perfil.
    - O Gestor/Sócio pode ver/editar o perfil de todos.
    """
    def has_object_permission(self, request, view, obj):
        cargo = self.get_cargo(request)
        
        # 1. Se for Superuser, Gestor ou Sócio, libera tudo
        if cargo in ['SUPERUSER', 'GESTOR', 'SOCIO']:
            return True
            
        # 2. Se for Técnico ou Estagiário, só pode mexer no SEU PRÓPRIO registro
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        return obj == request.user