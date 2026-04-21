from django.contrib import admin
from .models import Project, Material, EdgeBanding, StockSheet, Furniture, Panel

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at', 'updated_at')
    list_filter = ('user', 'created_at')
    search_fields = ('name',)

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'thickness', 'grain', 'price_per_m2', 'user')
    list_filter = ('grain', 'user')
    search_fields = ('name',)

@admin.register(EdgeBanding)
class EdgeBandingAdmin(admin.ModelAdmin):
    list_display = ('name', 'thickness', 'price_per_m', 'user')
    search_fields = ('name',)

@admin.register(StockSheet)
class StockSheetAdmin(admin.ModelAdmin):
    list_display = ('label', 'material', 'length', 'width', 'quantity', 'user')
    list_filter = ('material', 'user')

class PanelInline(admin.TabularInline):
    """Umožní upravovat panely přímo v detailu nábytku (Furniture)"""
    model = Panel
    extra = 1

@admin.register(Furniture)
class FurnitureAdmin(admin.ModelAdmin):
    list_display = ('name', 'user')
    inlines = [PanelInline]
    search_fields = ('name',)

@admin.register(Panel)
class PanelAdmin(admin.ModelAdmin):
    list_display = ('label', 'cabinet', 'length', 'width', 'quantity', 'material')
    list_filter = ('material', 'cabinet__user')
    search_fields = ('label',)
# Register your models here.
