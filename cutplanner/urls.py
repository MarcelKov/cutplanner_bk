from django.urls import path
from .views import CuttingAppView, CuttingResultsView, SignUpView, ProjectListView, delete_project

urlpatterns = [
    path('', CuttingAppView.as_view(), name='cutting_app'),
    path('results/', CuttingResultsView.as_view(), name='cutting_results'),
    path('signup/', SignUpView.as_view(), name='signup'),
    path('projects/list/', ProjectListView.as_view(), name='list_projects'),
    path('projects/delete/<int:pk>/', delete_project, name='delete_project'),
]