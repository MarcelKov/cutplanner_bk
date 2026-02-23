from django.shortcuts import render
from django.views.generic import TemplateView,CreateView, ListView
from django.contrib.auth.forms import UserCreationForm
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import Project

class SignUpView(CreateView):
    form_class = UserCreationForm
    success_url = reverse_lazy('login')
    template_name = 'registration/signup.html'

class CuttingAppView(TemplateView):
    template_name = "cutplanner/app_home.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['grain_choices'] = Project.GRAIN_CHOICES
        context['optimization_choices'] = Project.OPTIMIZATION_PRIORITY_CHOICES
        return context


class CuttingResultsView(TemplateView):
    template_name = 'cutplanner/results.html'

class ProjectListView(LoginRequiredMixin, ListView):
    model = Project
    template_name = 'cutplanner/partials/projects_table.html'
    context_object_name = 'projects'

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by('-updated_at')
    


@login_required
@require_http_methods(["DELETE"])
def delete_project(request, pk):
    project = get_object_or_404(Project, pk=pk, user=request.user)
    project.delete()
    return HttpResponse("")