from django.apps import AppConfig

class ChamadosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chamados'

    def ready(self):
        import chamados.signals