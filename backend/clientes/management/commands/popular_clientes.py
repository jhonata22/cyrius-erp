import random
from django.core.management.base import BaseCommand
from clientes.models import Cliente, ContatoCliente

class Command(BaseCommand):
    help = 'Popula o banco de dados com empresas e contatos (Financeiro deve ser gerado pelo Frontend)'

    def handle(self, *args, **options):
        empresas = [
            "Casa do Óleo", "Cartório de imóveis 1° oficio", "Cartório de imóveis 2° oficio",
            "Cartório Civil", "Comix", "COOPSERV", "Delux", "DJ Embalagens",
            "E2 Engenharia", "Embalinho", "FZ Holding", "J PRADO", "INH",
            "Saude Center", "Prates Bonfim", "Parafusauto (Diego)",
            "Parafusauto(Edinize)", "Vilmar Seguros", "ZTECH Centro Automotivo"
        ]

        self.stdout.write(self.style.WARNING(f'--- INICIANDO CADASTRO DE CLIENTES ---'))

        clientes_criados = 0

        for nome in empresas:
            # Gera CNPJ Aleatório
            raiz = random.randint(10000000, 99999999)
            digito = random.randint(10, 99)
            cnpj_ficticio = f"{raiz}0001{digito}"
            
            # Gera valor de contrato (300 a 2500)
            # Esse valor ficará salvo na ficha do cliente para uso futuro
            valor_contrato = float(random.randint(300, 2500))

            # 1. Cria ou Pega o Cliente
            try:
                cliente, created = Cliente.objects.get_or_create(
                    razao_social=nome,
                    defaults={
                        'cnpj': cnpj_ficticio,
                        'endereco': 'Endereço Comercial Padrão, 100 - Centro',
                        'tipo_cliente': 'CONTRATO', 
                        'valor_contrato_mensal': valor_contrato,
                        'dia_vencimento': 10,
                        'ativo': True
                    }
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erro ao criar cliente {nome}: {e}"))
                continue

            if created:
                self.stdout.write(f"✅ Cliente criado: {nome} (Contrato: R$ {valor_contrato:.2f})")
                clientes_criados += 1
                
                # 2. Cria o Contato
                email_ficticio = f"financeiro@{nome.lower().replace(' ', '').replace('°', '').replace('(', '').replace(')', '')}.com.br"
                ContatoCliente.objects.create(
                    cliente=cliente,
                    nome="Responsável Financeiro",
                    cargo="Financeiro",
                    email=email_ficticio,
                    telefone=f"779{random.randint(80000000, 99999999)}",
                    is_principal=True
                )
            else:
                self.stdout.write(f"ℹ️ Cliente já existia: {nome}")

        self.stdout.write(self.style.SUCCESS('-' * 30))
        self.stdout.write(self.style.SUCCESS(f"🚀 CONCLUÍDO!"))
        self.stdout.write(self.style.SUCCESS(f"Clientes Processados: {clientes_criados}"))
        self.stdout.write(self.style.WARNING(f"OBS: O Financeiro está VAZIO. Vá no Frontend e clique em 'Gerar Faturas'."))