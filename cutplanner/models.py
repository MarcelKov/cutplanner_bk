from django.db import models
from django.conf import settings

class Project(models.Model):
    OPTIMIZATION_PRIORITY_CHOICES = [
        ('waste', 'Minimize Waste'),
        ('cuts', 'Minimize Cuts'),
        ('stock', 'Prefer Smallest Stock Sheets First'),
    ]
    
    GRAIN_CHOICES = [
        ('none', 'No Grain'),
        ('horizontal', 'Horizontal'),
        ('vertical', 'Vertical'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200, default="New Project")
    
    data = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
