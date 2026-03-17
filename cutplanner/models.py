from django.db import models
from django.conf import settings

class Project(models.Model):
    OPTIMIZATION_PRIORITY_CHOICES = [
        ('waste', 'Minimize Waste'),
        ('cuts', 'Minimize Cuts'),
        ('stock', 'Prefer Smallest Stock Sheets First'),
        ('lib', 'Use packing library'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200, default="New Project")
    data = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)



class Material(models.Model):
    GRAIN_NONE = 'none'
    GRAIN_HORIZONTAL = 'horizontal'
    GRAIN_VERTICAL = 'vertical'

    GRAIN_CHOICES = [
        (GRAIN_NONE, 'None'),
        (GRAIN_HORIZONTAL, 'Horizontal'),
        (GRAIN_VERTICAL, 'Vertical'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    thickness = models.DecimalField(max_digits=5, decimal_places=1)
    grain = models.CharField(max_length=20,choices=GRAIN_CHOICES, default='none')
    price_per_m2 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)


class EdgeBanding(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    thickness = models.DecimalField(max_digits=5, decimal_places=1) 
    price_per_m = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

class StockSheet(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    label = models.CharField(max_length=100, blank=True, default='')
    length = models.DecimalField(max_digits=10, decimal_places=1)
    width = models.DecimalField(max_digits=10, decimal_places=1)
    quantity = models.PositiveIntegerField(default=1)
    material = models.ForeignKey(Material, on_delete=models.SET_NULL, null=True, blank=True)


class Furniture(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

class Panel(models.Model):
    cabinet = models.ForeignKey(Furniture, related_name='parts', on_delete=models.CASCADE)
    label = models.CharField(max_length=100, blank=True, default='') 
    length = models.DecimalField(max_digits=10, decimal_places=1)
    width = models.DecimalField(max_digits=10, decimal_places=1)
    quantity = models.PositiveIntegerField(default=1)
    material = models.ForeignKey(Material, on_delete=models.SET_NULL, null=True, blank=True)

    edge_top = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='top_edges')
    edge_bottom = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='bottom_edges')
    edge_left = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='left_edges')
    edge_right = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='right_edges')