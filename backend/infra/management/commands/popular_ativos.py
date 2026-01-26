import random
from django.core.management.base import BaseCommand
from clientes.models import Cliente
from infra.models import Ativo

class Command(BaseCommand):
    help = 'Gera ativos de TI aleatórios (PCs, Impressoras, Rede) para cada cliente'

    def handle(self, *args, **options):
        # Listas de dados fictícios para gerar variedade
        departamentos = ['FINANCEIRO', 'RH', 'COMERCIAL', 'DIRETORIA', 'RECEPCAO', 'LOGISTICA', 'TI', 'VENDAS']
        
        marcas_pc = ['Dell Optiplex 3080', 'Lenovo Vostro', 'HP ProDesk', 'Samsung Book', 'Acer Aspire 5', 'Montado (Custom)']
        processadores = ['Intel Core i3 10100', 'Intel Core i5 11400', 'Intel Core i7 12700', 'AMD Ryzen 3 3200G', 'AMD Ryzen 5 5600G']
        memorias = ['4GB DDR4', '8GB DDR4', '16GB DDR4', '8GB DDR3', '32GB DDR4']
        discos = ['SSD 240GB', 'SSD 480GB', 'HD 1TB', 'NVMe 500GB', 'SSD 120GB + HD 500GB']
        sistemas = ['Windows 10 Pro', 'Windows 10 Home', 'Windows 11 Pro', 'Windows 7 Pro (Legado)', 'Ubuntu 22.04']
        
        marcas_rede = ['TP-Link Archer C6', 'Mikrotik RB750Gr3', 'Ubiquiti Unifi AP', 'Switch Intelbras 24p', 'Modem ONU Huawei']
        marcas_imp = ['HP LaserJet Pro M404', 'Epson EcoTank L3150', 'Brother DCP-1602', 'Samsung ML-2165']

        # Busca todos os clientes
        clientes = Cliente.objects.all()
        total_clientes = clientes.count()

        if total_clientes == 0:
            self.stdout.write(self.style.ERROR('Nenhum cliente encontrado! Rode o comando "popular_clientes" antes.'))
            return

        self.stdout.write(self.style.WARNING(f'--- GERANDO ATIVOS PARA {total_clientes} CLIENTES ---'))
        
        ativos_criados = 0

        for cliente in clientes:
            # Garante pelo menos 10 ativos, podendo chegar a 15
            qtd_ativos = random.randint(10, 15)
            
            self.stdout.write(f"Processando: {cliente.razao_social} ({qtd_ativos} ativos)...")

            for i in range(qtd_ativos):
                # Sorteia o tipo de ativo com pesos (Mais PCs do que Impressoras)
                tipo_sorteado = random.choices(
                    ['COMPUTADOR', 'IMPRESSORA', 'REDE', 'SERVIDOR', 'MONITOR'],
                    weights=[70, 10, 10, 2, 8], # 70% de chance de ser PC
                    k=1
                )[0]

                # Dados base
                dados = {
                    'cliente': cliente,
                    'tipo': tipo_sorteado,
                    'nome': '',
                    'marca_modelo': '',
                    'processador': '',
                    'memoria_ram': '',
                    'armazenamento': '',
                    'sistema_operacional': '',
                    'anydesk_id': '',
                    'usuario_local': '',
                    'senha_local': '',
                    'ip_local': f"192.168.{random.randint(0,10)}.{random.randint(2, 250)}"
                }

                # --- Lógica Específica por Tipo ---
                if tipo_sorteado == 'COMPUTADOR':
                    dept = random.choice(departamentos)
                    num = random.randint(1, 99)
                    dados['nome'] = f"{dept}-PC{num:02d}"
                    dados['marca_modelo'] = random.choice(marcas_pc)
                    dados['processador'] = random.choice(processadores)
                    dados['memoria_ram'] = random.choice(memorias)
                    dados['armazenamento'] = random.choice(discos)
                    dados['sistema_operacional'] = random.choice(sistemas)
                    dados['anydesk_id'] = f"{random.randint(100,999)} {random.randint(100,999)} {random.randint(100,999)}"
                    dados['usuario_local'] = dept.lower()
                    dados['senha_local'] = 'Mudar@123'
                
                elif tipo_sorteado == 'SERVIDOR':
                    dados['nome'] = "SRV-FILESERVER"
                    dados['marca_modelo'] = "Dell PowerEdge T340"
                    dados['processador'] = "Xeon E-2224"
                    dados['memoria_ram'] = "32GB ECC"
                    dados['armazenamento'] = "2x 4TB RAID 1"
                    dados['sistema_operacional'] = "Windows Server 2019"
                    dados['anydesk_id'] = f"{random.randint(100,999)} {random.randint(100,999)} {random.randint(100,999)}"
                    dados['usuario_local'] = 'administrator'
                    dados['senha_local'] = 'Admin@Server2024'
                    dados['ip_local'] = "192.168.1.250" # IP Fixo de servidor

                elif tipo_sorteado == 'IMPRESSORA':
                    dados['nome'] = f"IMP-{random.choice(departamentos)}"
                    dados['marca_modelo'] = random.choice(marcas_imp)
                    dados['tipo'] = 'IMPRESSORA'
                    # Impressora não tem CPU/RAM
                
                elif tipo_sorteado == 'REDE':
                    dados['nome'] = f"WIFI-{random.choice(['Terreo', '1-Andar', 'Visitantes'])}"
                    dados['marca_modelo'] = random.choice(marcas_rede)
                    dados['usuario_local'] = 'admin'
                    dados['senha_local'] = 'admin'
                
                elif tipo_sorteado == 'MONITOR':
                    dados['nome'] = f"MONITOR-{random.randint(100,999)}"
                    dados['marca_modelo'] = random.choice(['Samsung 24"', 'LG Ultrawide 29"', 'Dell P2419H', 'AOC 19"'])

                # Cria o ativo
                Ativo.objects.create(**dados)
                ativos_criados += 1

        self.stdout.write(self.style.SUCCESS('-' * 30))
        self.stdout.write(self.style.SUCCESS(f"🚀 CONCLUÍDO!"))
        self.stdout.write(self.style.SUCCESS(f"Total de Ativos Gerados: {ativos_criados}"))