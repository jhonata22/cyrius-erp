from django.urls import path
from core import consumers

websocket_urlpatterns = [
    path('ws/notificacoes/<int:user_id>/', consumers.NotificacaoConsumer.as_asgi()),
]
