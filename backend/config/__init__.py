# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ('celery_app',)

import timezone_field

if not hasattr(timezone_field.TimeZoneField, 'CHOICES'):
    class _MockTz:
        def __init__(self, zone_name):
            self.zone = zone_name
            
    timezone_field.TimeZoneField.CHOICES = [
        (_MockTz('America/Sao_Paulo'), 'America/Sao_Paulo'),
        (_MockTz('UTC'), 'UTC')
    ]