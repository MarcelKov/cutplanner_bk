from django.shortcuts import render
from django.views.generic import TemplateView,CreateView
from django.contrib.auth.forms import UserCreationForm
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import Panel, StockSheet, Material, EdgeBanding

class SignUpView(CreateView):
    form_class = UserCreationForm
    success_url = reverse_lazy('login')
    template_name = 'registration/signup.html'

class CuttingAppView(TemplateView):
    template_name = "cutplanner/app_home.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['grain_choices'] = Panel.GRAIN_CHOICES
        return context
