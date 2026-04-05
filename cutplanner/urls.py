from django.urls import path
from .views import (
    HomeView, CuttingAppView, ProjectBuilderView ,CuttingResultsView, SignUpView, ProjectListView, delete_project,
    MaterialInventoryView, EdgeInventoryView, FurnitureInventoryView, StockInventoryView, ManualPlannerView,
    add_material, delete_material, edit_material, get_material_row,
    add_edge, edit_edge, delete_edge, get_edge_row,
    add_stock_sheet, delete_stock_sheet, edit_stock_sheet, get_stock_row,
     get_furniture_detail, delete_furniture, add_panel, delete_panel,
    get_furniture_header,get_furniture_list,edit_furniture_name,
    get_panel_edge_detail,edit_panel,get_panel_row
)

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('planner/', CuttingAppView.as_view(), name='cutting_app'),
    path('project-builder/', ProjectBuilderView.as_view(), name='project_builder'),
    path('results/', CuttingResultsView.as_view(), name='cutting_results'),
    path('signup/', SignUpView.as_view(), name='signup'),
    path('manual_planner/', ManualPlannerView.as_view(), name='manual_planner'),
    
    # Projects
    path('projects/list/', ProjectListView.as_view(), name='list_projects'),
    path('projects/delete/<int:pk>/', delete_project, name='delete_project'),
    
    # Inventory Tabs
    path('inventory/', MaterialInventoryView.as_view(), name='inventory'),
    path('inventory/materials/', MaterialInventoryView.as_view(), name='material_inventory'),
    path('inventory/edges/', EdgeInventoryView.as_view(), name='edge_inventory'),
    path('inventory/furniture/', FurnitureInventoryView.as_view(), name='furniture_inventory'),
    path('inventory/stock/', StockInventoryView.as_view(), name='stock_inventory'),
    
    # Material Actions
    path('inventory/material/add/', add_material, name='add_material'),
    path('inventory/material/delete/<int:pk>/', delete_material, name='delete_material'),
    path('inventory/material/edit/<int:pk>/', edit_material, name='edit_material'),
    path('inventory/material/row/<int:pk>/', get_material_row, name='get_material_row'),
    
    # Edge Actions
    path('inventory/edge/add/', add_edge, name='add_edge'),
    path('inventory/edge/edit/<int:pk>/', edit_edge, name='edit_edge'),
    path('inventory/edge/delete/<int:pk>/', delete_edge, name='delete_edge'),
    path('inventory/edge/row/<int:pk>/', get_edge_row, name='get_edge_row'),
    
    # Stock Actions
    path('inventory/stock/add/', add_stock_sheet, name='add_stock'),
    path('inventory/stock/delete/<int:pk>/', delete_stock_sheet, name='delete_stock'),
    path('inventory/stock/edit/<int:pk>/', edit_stock_sheet, name='edit_stock'),
    path('inventory/stock/row/<int:pk>/', get_stock_row, name='get_stock_row'),
    
    # Furniture & Panel Actions
    path('inventory/furniture/<int:pk>/', get_furniture_detail, name='get_furniture_detail'),
    path('inventory/furniture/delete/<int:pk>/', delete_furniture, name='delete_furniture'),
    path('inventory/furniture/<int:furn_id>/panel/add/', add_panel, name='add_panel'),
    path('inventory/furniture/panel/delete/<int:pk>/', delete_panel, name='delete_panel'),
    path('inventory/furniture/list-only/', get_furniture_list, name='get_furniture_list'),
    path('inventory/furniture/header/<int:pk>/', get_furniture_header, name='get_furniture_header'),
    path('inventory/furniture/edit-name/<int:pk>/', edit_furniture_name, name='edit_furniture_name'),
    path('inventory/panel/<int:pk>/edges/', get_panel_edge_detail, name='get_panel_edge_detail'),
    path('inventory/panel/edit/<int:pk>/', edit_panel, name='edit_panel'),
    path('inventory/panel/row/<int:pk>/', get_panel_row, name='get_panel_row'),
]