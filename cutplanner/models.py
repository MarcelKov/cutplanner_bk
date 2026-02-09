from django.db import models
from django.conf import settings


class EdgeBanding(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='edge_bandings')
    name = models.CharField(max_length=100) 
    def __str__(self):
        return self.name

class Material(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='materials')
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

class CuttingStockBase(models.Model):
    GRAIN_CHOICES = [
        ('none', 'No Grain'),
        ('horizontal', 'Horizontal'),
        ('vertical', 'Vertical'),
    ]
    label = models.CharField(max_length=100, blank=True, null=True)
    length = models.DecimalField(max_digits=10, decimal_places=2)
    width = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    material = models.ForeignKey(Material, on_delete=models.SET_NULL, null=True, blank=True, related_name="%(class)s_items")
    grain_direction = models.CharField(max_length=20, choices=GRAIN_CHOICES, default='none')

    class Meta:
        abstract = True

class Panel(CuttingStockBase):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='panels')
    edge_top = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='top_edge_banded_panels')
    edge_bottom = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='bottom_edge_banded_panels')
    edge_left = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='left_edge_banded_panels')
    edge_right = models.ForeignKey(EdgeBanding, on_delete=models.SET_NULL, null=True, blank=True, related_name='right_edge_banded_panels')

class StockSheet(CuttingStockBase):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stock_sheets')