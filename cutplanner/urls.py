from django.urls import path
from .views import CuttingAppView, SignUpView

urlpatterns = [
    path('', CuttingAppView.as_view(), name='cutting_app'),
    path('signup/', SignUpView.as_view(), name='signup'),
]