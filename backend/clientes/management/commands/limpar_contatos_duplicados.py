from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db import transaction
from clientes.models import ContatoCliente

class Command(BaseCommand):
    help = 'Unifica contatos duplicados (mesmo cliente, nome, cargo e telefone) e reatribui seus chamados.'

    def handle(self, *args, **options):
        self.stdout.write("Iniciando varredura de contatos duplicados...")

        # 1. Agrupa pelas características exatas, incluindo o cliente_id para não misturar homônimos de empresas diferentes
        duplicatas_agrupadas = (
            ContatoCliente.objects.values('cliente_id', 'nome', 'cargo', 'telefone')
            .annotate(total=Count('id'))
            .filter(total__gt=1)
        )

        if not duplicatas_agrupadas:
            self.stdout.write(self.style.SUCCESS("Nenhum contato duplicado encontrado! O banco está limpo."))
            return

        total_resolvidos = 0
        total_excluidos = 0

        # 2. Transação atômica para garantir a segurança dos dados
        with transaction.atomic():
            for grupo in duplicatas_agrupadas:
                # Busca os registros exatos do grupo atual, ordenando pelo ID (o primeiro a ser cadastrado)
                contatos = ContatoCliente.objects.filter(
                    cliente_id=grupo['cliente_id'],
                    nome=grupo['nome'],
                    cargo=grupo['cargo'],
                    telefone=grupo['telefone']
                ).order_by('id')

                # O "Original" será o mais antigo
                contato_original = contatos.first()
                
                # Os duplicados são o restante
                contatos_duplicados = contatos.exclude(id=contato_original.id)

                self.stdout.write(f"\nAnalisando: '{grupo['nome']}' (Cliente ID: {grupo['cliente_id']}) - {contatos.count()} registros encontrados.")

                for duplicado in contatos_duplicados:
                    # Puxa os chamados usando o related_name que você definiu no modelo Chamado
                    chamados_vinculados = duplicado.chamados_solicitados.all()
                    qtd_chamados = chamados_vinculados.count()
                    
                    if qtd_chamados > 0:
                        # Atualiza o campo 'solicitante' dos chamados para apontar para o contato original
                        chamados_vinculados.update(solicitante=contato_original)
                        self.stdout.write(self.style.WARNING(f"  -> Transferindo {qtd_chamados} chamado(s) do ID {duplicado.id} para o ID {contato_original.id}"))

                    # Apaga o contato duplicado (agora órfão de chamados)
                    duplicado.delete()
                    self.stdout.write(self.style.ERROR(f"  -> Contato duplicado ID {duplicado.id} excluído."))
                    
                    total_excluidos += 1
                
                total_resolvidos += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nVarredura concluída com sucesso! {total_resolvidos} grupos de duplicatas resolvidos. {total_excluidos} contatos apagados."
        ))