from django.core.management.base import BaseCommand
from django.db.models import Count
from clientes.models import Cliente, DocumentacaoTecnica

class Command(BaseCommand):
    help = "Verifica se algum ID de DocumentacaoTecnica está sendo usado por mais de um Cliente."

    def handle(self, *args, **options):
        self.stdout.write(
            "Verificando se existem Clientes compartilhando a mesma DocumentacaoTecnica..."
        )

        # Agrupa os Clientes pelo ID da documentacao_tecnica e conta quantos clientes tem em cada grupo.
        # Filtra para manter apenas os grupos com mais de um cliente.
        shared_docs = (
            Cliente.objects.exclude(documentacao_tecnica__isnull=True)
            .values("documentacao_tecnica")
            .annotate(num_clientes=Count("id"))
            .filter(num_clientes__gt=1)
        )

        count = shared_docs.count()

        if count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"Encontrados {count} casos de DocumentacaoTecnica compartilhada."
                )
            )
            for item in shared_docs:
                doc_id = item["documentacao_tecnica"]
                num_clientes = item["num_clientes"]
                self.stdout.write(
                    f"  - DocumentacaoTecnica ID {doc_id} é referenciada por {num_clientes} clientes."
                )
                clientes_afetados = Cliente.objects.filter(
                    documentacao_tecnica_id=doc_id
                ).values_list("id", "nome", "razao_social")
                for cliente in clientes_afetados:
                    self.stdout.write(f"    - Cliente ID: {cliente[0]} ({cliente[1] or cliente[2]})")
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "Nenhuma DocumentacaoTecnica compartilhada encontrada."
                )
            )
