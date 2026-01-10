from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Aqui fazemos a mágica acontecer: importamos o arquivo signals
        # para que o Django saiba que ele existe assim que iniciar.
        import core.signals