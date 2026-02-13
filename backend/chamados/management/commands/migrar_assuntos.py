from django.core.management.base import BaseCommand
from chamados.models import Chamado, AssuntoChamado
from django.db import transaction

class Command(BaseCommand):
    help = 'Migra os títulos de chamados existentes para a nova tabela de AssuntoChamado'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando a migração de títulos para assuntos...'))

        chamados_sem_assunto = Chamado.objects.filter(assunto__isnull=True)
        updated_count = 0

        for chamado in chamados_sem_assunto:
            if not chamado.titulo or not chamado.titulo.strip():
                self.stdout.write(self.style.WARNING(f'Chamado ID {chamado.id} ignorado (título vazio).'))
                continue

            titulo_formatado = chamado.titulo.strip().capitalize()

            try:
                assunto_obj, created = AssuntoChamado.objects.get_or_create(
                    titulo=titulo_formatado
                )
                
                if created:
                    self.stdout.write(f"  -> Novo assunto criado: '{titulo_formatado}'")

                chamado.assunto = assunto_obj
                chamado.save()
                
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'Chamado ID {chamado.id} atualizado. Assunto: "{assunto_obj.titulo}" (ID: {assunto_obj.id})'))

            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Erro ao processar Chamado ID {chamado.id}: {e}'))

        self.stdout.write('') # Add a newline for spacing
        self.stdout.write(self.style.SUCCESS(f'Migração concluída! {updated_count} chamados foram atualizados.'))
