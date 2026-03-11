from django.core.management.base import BaseCommand
from equipe.models import Equipe

class Command(BaseCommand):
    help = 'Padroniza os cargos da equipe para corrigir problemas de permissão no frontend'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
'''
--- ANALISANDO CARGOS DA EQUIPE ---
'''
        ))
        
        usuarios = Equipe.objects.all()
        for u in usuarios:
            cargo_atual = u.cargo or ""
            self.stdout.write(f"ID: {u.id} | Nome: {u.nome[:15]:<15} | Cargo salvo: '{cargo_atual}'")
            
            cargo_limpo = cargo_atual.strip().upper()
            
            # Sinônimos ou com espaços extras que devem virar 'GESTOR'
            if cargo_limpo in ['GERENTE', 'ADMIN', 'GESTAO', 'ADMINISTRADOR', 'GESTOR']:
                if cargo_atual != 'GESTOR':
                    u.cargo = 'GESTOR'
                    u.save()
                    self.stdout.write(self.style.SUCCESS(f"  -> CORRIGIDO: '{cargo_atual}' alterado para 'GESTOR'."))

        self.stdout.write(self.style.WARNING(
'''--- FINALIZADO ---
'''
        ))
