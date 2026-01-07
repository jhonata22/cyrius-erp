from rest_framework import permissions

class IsGestor(permissions.BasePermission):
    """
    Permissão customizada: Só deixa passar se for GESTOR ou SÓCIO.
    """
    def has_permission(self, request, view):
        # 1. Se não estiver logado, bloqueia
        if not request.user.is_authenticated:
            return False
            
        # 2. Superusuário (Admin do Django) sempre pode tudo
        if request.user.is_superuser:
            return True

        # 3. Verifica o cargo na tabela Equipe
        try:
            # O 'related_name' padrão do OneToOneField é o nome do model minúsculo
            # Então acessamos: request.user.equipe
            cargo = request.user.equipe.cargo
            return cargo in ['GESTOR', 'SOCIO']
        except AttributeError:
            # Se o usuário não tem perfil de equipe vinculado, bloqueia
            return False