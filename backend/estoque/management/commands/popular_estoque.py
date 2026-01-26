import random
from django.core.management.base import BaseCommand
from estoque.models import Produto

class Command(BaseCommand):
    help = 'Popula o catálogo de estoque com produtos de TI, Redes e CFTV'

    def handle(self, *args, **options):
        # Lista de Tuplas: (Nome do Produto, Preço Mínimo, Preço Máximo)
        catalogo = [
            # --- ARMAZENAMENTO & HARDWARE ---
            ("SSD 240GB Kingston A400 SATA", 110.00, 150.00),
            ("SSD 480GB WD Green SATA", 220.00, 280.00),
            ("SSD 1TB Crucial NVMe M.2", 450.00, 600.00),
            ("HD 1TB Seagate Barracuda", 280.00, 350.00),
            ("Memória RAM DDR4 8GB 2666MHz Kingston", 130.00, 180.00),
            ("Memória RAM DDR4 16GB 3200MHz XPG", 250.00, 350.00),
            ("Fonte ATX 500W 80 Plus Bronze", 280.00, 350.00),
            ("Gabinete Gamer RGB Vidro Temperado", 200.00, 400.00),
            
            # --- REDES ---
            ("Roteador Wireless Gigabit Archer C6 TP-Link", 280.00, 350.00),
            ("Roteador Mesh Deco M5 (Pack 2)", 600.00, 800.00),
            ("Switch 8 Portas Gigabit TP-Link", 120.00, 160.00),
            ("Switch 24 Portas Rackável Intelbras", 600.00, 850.00),
            ("Cabo de Rede CAT6 Azul (Metro)", 2.50, 4.00),
            ("Conector RJ45 CAT6 (Pacote 100un)", 60.00, 90.00),
            ("Patch Cord CAT6 1.5m Vermelho", 15.00, 25.00),
            ("Access Point Unifi U6 Lite", 800.00, 1100.00),
            
            # --- CFTV & SEGURANÇA ---
            ("Câmera Bullet Full HD 1080p Intelbras", 180.00, 240.00),
            ("Câmera Dome Full HD 1080p Intelbras", 170.00, 230.00),
            ("Câmera IP Wi-Fi IM5 Intelbras", 350.00, 450.00),
            ("DVR 4 Canais MHDX 1104 Intelbras", 400.00, 550.00),
            ("DVR 8 Canais MHDX 3108 Intelbras", 700.00, 900.00),
            ("Fonte Colmeia 12V 10A", 80.00, 120.00),
            ("Conector BNC com Mola (Pacote 10un)", 25.00, 40.00),
            ("Balun de Vídeo Passivo HD (Par)", 35.00, 60.00),
            ("Cabo Coaxial Bipolar 4mm (Rolo 100m)", 120.00, 180.00),
            
            # --- PEÇAS DE NOTEBOOK ---
            ("Tela 15.6 LED Slim 30 Pinos", 450.00, 600.00),
            ("Tela 14.0 LED Slim 30 Pinos", 400.00, 550.00),
            ("Teclado Notebook Dell Inspiron 15 3000", 80.00, 140.00),
            ("Teclado Notebook Samsung Essentials E30", 80.00, 130.00),
            ("Bateria Notebook Acer Aspire 5", 250.00, 350.00),
            ("Carregador Notebook Universal 90W", 90.00, 150.00),
            ("Carregador Dell Original 65W", 180.00, 250.00),
            ("DC Jack Acer Nitro 5", 40.00, 80.00),
            
            # --- PERIFÉRICOS ---
            ("Mouse Óptico USB Logitech M90", 30.00, 50.00),
            ("Teclado e Mouse Sem Fio MK220 Logitech", 120.00, 160.00),
            ("Filtro de Linha 5 Tomadas", 35.00, 60.00),
            ("Nobreak 600VA Intelbras", 450.00, 600.00),
        ]

        self.stdout.write(self.style.WARNING(f'--- INICIANDO POPULAÇÃO DE ESTOQUE ---'))

        criados = 0
        existentes = 0

        for nome, preco_min, preco_max in catalogo:
            # Gera preço aleatório dentro da faixa
            preco_venda = round(random.uniform(preco_min, preco_max), 2)
            
            # Gera um estoque inicial aleatório (entre 0 e 20 unidades)
            # Para parecer real, alguns itens terão 0 de estoque
            estoque_inicial = random.choices([0, random.randint(1, 5), random.randint(6, 20)], weights=[1, 4, 5])[0]
            
            # Estoque mínimo aleatório
            estoque_min = random.randint(2, 5)

            try:
                obj, created = Produto.objects.get_or_create(
                    nome=nome,
                    defaults={
                        'preco_venda_sugerido': preco_venda,
                        'estoque_atual': estoque_inicial,
                        'estoque_minimo': estoque_min
                    }
                )

                if created:
                    self.stdout.write(f"✅ Criado: {nome} | Qtd: {estoque_inicial} | R$ {preco_venda}")
                    criados += 1
                else:
                    self.stdout.write(f"ℹ️ Já existe: {nome}")
                    existentes += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erro ao criar {nome}: {e}"))

        self.stdout.write(self.style.SUCCESS('-' * 30))
        self.stdout.write(self.style.SUCCESS(f"🚀 PROCESSO CONCLUÍDO!"))
        self.stdout.write(self.style.SUCCESS(f"Novos Produtos: {criados}"))
        self.stdout.write(self.style.SUCCESS(f"Produtos Já Existentes: {existentes}"))