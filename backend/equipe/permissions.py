from rest_framework import permissions

class BaseCargoPermission(permissions.BasePermission):
    def get_cargo(self, request):
        if not request.user.is_authenticated:
            return None
        if request.user.is_superuser:
            return 'SUPERUSER'
        try:
            return request.user.equipe.cargo.upper()
        except AttributeError:
            return None

class IsSocio(BaseCargoPermission):
    def has_permission(self, request, view):
        cargo = self.get_cargo(request)
        if cargo == 'SUPERUSER': return True
        return cargo == 'SOCIO'

class IsGestor(BaseCargoPermission):
    def has_permission(self, request, view):
        cargo = self.get_cargo(request)
        if cargo == 'SUPERUSER': return True
        return cargo in ['GESTOR', 'SOCIO']

class IsFuncionario(BaseCargoPermission):
    def has_permission(self, request, view):
        return self.get_cargo(request) is not None

class IsOwnerOrGestor(BaseCargoPermission):
    def has_object_permission(self, request, view, obj):
        cargo = self.get_cargo(request)
        if cargo in ['SUPERUSER', 'GESTOR', 'SOCIO']:
            return True
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        return obj == request.user