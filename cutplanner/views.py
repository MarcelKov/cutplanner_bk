from django.shortcuts import render
from django.views.generic import TemplateView,CreateView, ListView
from django.contrib.auth.forms import UserCreationForm
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import Project, Material,EdgeBanding,Furniture,StockSheet,Panel


class HomeView(TemplateView):
    template_name = "home/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            context['user_projects_count'] = Project.objects.filter(user=self.request.user).count()
        return context

class SignUpView(CreateView):
    form_class = UserCreationForm
    success_url = reverse_lazy('login')
    template_name = 'registration/signup.html'

class ProjectBuilderView(LoginRequiredMixin, TemplateView):
    template_name = "home/project_builder.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['furniture'] = Furniture.objects.filter(user=self.request.user)
        context['stock_sheets'] = StockSheet.objects.filter(user=self.request.user, quantity__gt=0)
        return context

class CuttingAppView(TemplateView):
    template_name = "cutplanner/app_home.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user

        context['optimization_choices'] = Project.OPTIMIZATION_PRIORITY_CHOICES
        if user.is_authenticated:
            context['materials'] = Material.objects.filter(user=user)
            context['edges'] = EdgeBanding.objects.filter(user=user)
        else:
            context['materials'] = []
            context['edges'] = []
        return context

class CuttingResultsView(TemplateView):
    template_name = 'cutplanner/results.html'

class ManualPlannerView(TemplateView):
    template_name = 'cutplanner/manual_planner.html'

class ProjectListView(LoginRequiredMixin, ListView):
    model = Project
    template_name = 'project_partials/projects_table.html'
    context_object_name = 'projects'

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by('-updated_at')
    
    
class BaseInventoryView(LoginRequiredMixin, TemplateView):
    template_name = "inventory/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        referrer = self.request.META.get('HTTP_REFERER', '')
        if 'planner' in referrer or 'cutting' in referrer:
            context['back_url'] = reverse_lazy('cutting_app')
            context['back_label'] = 'Back to Planner'
        else:
            context['back_url'] = reverse_lazy('home')
            context['back_label'] = 'Back to Dashboard'

        context['grain_choices'] = Material.GRAIN_CHOICES
        return context

class MaterialInventoryView(BaseInventoryView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['materials'] = Material.objects.filter(user=self.request.user)
        context['active_tab'] = 'materials'
        return context

class EdgeInventoryView(BaseInventoryView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['edges'] = EdgeBanding.objects.filter(user=self.request.user)
        context['active_tab'] = 'edges'
        return context

class FurnitureInventoryView(BaseInventoryView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['furniture'] = Furniture.objects.filter(user=self.request.user)
        context['active_tab'] = 'furniture'
        return context

class StockInventoryView(BaseInventoryView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['stock_sheets'] = StockSheet.objects.filter(user=self.request.user)
        context['materials'] = Material.objects.filter(user=self.request.user)
        context['active_tab'] = 'stock'
        return context   


@login_required
@require_http_methods(["POST"])
def add_material(request):
    name = request.POST.get('name', '').strip()
    thickness_raw = request.POST.get('thickness', '0')
    price_raw = request.POST.get('price', '')
    grain = request.POST.get('grain', Material.GRAIN_NONE)

    if not name:
        return HttpResponse("Name is required", status=400)

    try:
        thickness = abs(float(thickness_raw))
        if thickness == 0: thickness = 0.1
        
        price = None
        if price_raw:
            price = abs(float(price_raw))
    except ValueError:
        return HttpResponse("Invalid numbers", status=400)

    material = Material.objects.create(
        user=request.user,
        name=name,
        thickness=thickness,
        grain=grain,
        price_per_m2=price
    )
    return render(request, "inventory/partials/material/material_row.html", {
        'material': material
    })


@login_required
def edit_material(request, pk):
    material = get_object_or_404(Material, pk=pk, user=request.user)
    
    if request.method == "POST":
        material.name = request.POST.get('name', '').strip()
        material.thickness = abs(float(request.POST.get('thickness', 0.1)))
        price_raw = request.POST.get('price', '')
        material.price_per_m2 = abs(float(price_raw)) if price_raw else None
        material.grain = request.POST.get('grain', Material.GRAIN_NONE)
        material.save()
        
        return render(request, "inventory/partials/material/material_row.html", {'material': material})

    return render(request, "inventory/partials/material/material_edit_row.html", {
        'material': material,
        'grain_choices': Material.GRAIN_CHOICES
    })

@login_required
def get_material_row(request, pk):
    material = get_object_or_404(Material, pk=pk, user=request.user)
    return render(request, "inventory/partials/material/material_row.html", {'material': material})

@login_required
@require_http_methods(["DELETE"])
def delete_material(request, pk):
    material = get_object_or_404(Material, pk=pk, user=request.user)
    material.delete()
    return HttpResponse("")

@login_required
@require_http_methods(["DELETE"])
def delete_project(request, pk):
    project = get_object_or_404(Project, pk=pk, user=request.user)
    project.delete()
    return HttpResponse("")

@login_required
@require_http_methods(["POST"])
def add_edge(request):
    name = request.POST.get('name', '').strip()
    thickness = abs(float(request.POST.get('thickness', 0)))
    price_raw = request.POST.get('price', '')
    price = abs(float(price_raw)) if price_raw else None

    edge = EdgeBanding.objects.create(
        user=request.user,
        name=name,
        thickness=thickness,
        price_per_m=price
    )

    return render(request, "inventory/partials/eb/edge_row.html", {'edge': edge})


@login_required
def edit_edge(request, pk):
    edge = get_object_or_404(EdgeBanding, pk=pk, user=request.user)
    
    if request.method == "POST":
        edge.name = request.POST.get('name', '').strip()
        edge.thickness = abs(float(request.POST.get('thickness', 0)))
        price_raw = request.POST.get('price', '')
        edge.price_per_m = abs(float(price_raw)) if price_raw else None
        edge.save()
        return render(request, "inventory/partials/eb/edge_row.html", {'edge': edge})

    return render(request, "inventory/partials/eb/edge_edit_row.html", {'edge': edge})

@login_required
@require_http_methods(["DELETE", "POST"])
def delete_edge(request, pk):
    edge = get_object_or_404(EdgeBanding, pk=pk, user=request.user)
    edge.delete()
    return HttpResponse("")

@login_required
def get_edge_row(request, pk):
    edge = get_object_or_404(EdgeBanding, pk=pk, user=request.user)
    return render(request, "inventory/partials/eb/edge_row.html", {'edge': edge})


@login_required
@require_http_methods(["POST"])
def add_stock_sheet(request):
    label = request.POST.get('label', '').strip()
    material_id = request.POST.get('material')
    length_raw = request.POST.get('length', '0')
    width_raw = request.POST.get('width', '0')
    quantity_raw = request.POST.get('quantity', '1')

    try:
        length = abs(float(length_raw))
        width = abs(float(width_raw))
        quantity = abs(int(quantity_raw))
        
        material = None
        if material_id:
            material = get_object_or_404(Material, id=material_id, user=request.user)
            
    except (ValueError, TypeError):
        return HttpResponse("Invalid numbers", status=400)

    sheet = StockSheet.objects.create(
        user=request.user,
        label=label,
        length=length,
        width=width,
        quantity=quantity,
        material=material
    )
    
    return render(request, "inventory/partials/stock/stock_row.html", {
        'sheet': sheet
    })

@login_required
@require_http_methods(["DELETE"])
def delete_stock_sheet(request, pk):
    sheet = get_object_or_404(StockSheet, pk=pk, user=request.user)
    sheet.delete()
    return HttpResponse("")


@login_required
def edit_stock_sheet(request, pk):
    sheet = get_object_or_404(StockSheet, pk=pk, user=request.user)
    
    if request.method == "POST":
        material_id = request.POST.get('material')
        material = get_object_or_404(Material, id=material_id, user=request.user) if material_id else None
        
        sheet.label = request.POST.get('label', '').strip()
        sheet.length = abs(float(request.POST.get('length', 0)))
        sheet.width = abs(float(request.POST.get('width', 0)))
        sheet.quantity = abs(int(request.POST.get('quantity', 1)))
        sheet.material = material
        sheet.save()
        
        return render(request, "inventory/partials/stock/stock_row.html", {'sheet': sheet})

    context = {
        'sheet': sheet,
        'materials': Material.objects.filter(user=request.user)
    }
    return render(request, "inventory/partials/stock/stock_edit_row.html", context)

@login_required
def get_stock_row(request, pk):
    sheet = get_object_or_404(StockSheet, pk=pk, user=request.user)
    return render(request, "inventory/partials/stock/stock_row.html", {'sheet': sheet})


@login_required
@require_http_methods(["POST"])
def add_furniture(request):
    name = request.POST.get('name', '').strip()
    if not name:
        return HttpResponse("Name is required", status=400)
    
    furn = Furniture.objects.create(user=request.user, name=name)
    return render(request, "inventory/partials/furniture/furniture_list_item.html", {'furn': furn})

@login_required
def get_furniture_detail(request, pk):
    furniture = get_object_or_404(Furniture, pk=pk, user=request.user)
    context = {
        'furniture': furniture,
        'materials': Material.objects.filter(user=request.user),
        'edges': EdgeBanding.objects.filter(user=request.user),
    }
    return render(request, "inventory/partials/furniture/furniture_detail.html", context)

@login_required
@require_http_methods(["DELETE"])
def delete_furniture(request, pk):
    furniture = get_object_or_404(Furniture, pk=pk, user=request.user)
    furniture.delete()
    return HttpResponse("") 

@login_required
@require_http_methods(["POST"])
def add_panel(request, furn_id):
    furniture = get_object_or_404(Furniture, id=furn_id, user=request.user)
    
    def get_edge(field_name):
        e_id = request.POST.get(field_name)
        return EdgeBanding.objects.filter(id=e_id, user=request.user).first() if e_id else None

    mat_id = request.POST.get('material')
    material = Material.objects.filter(id=mat_id, user=request.user).first() if mat_id else None

    panel = Panel.objects.create(
        cabinet=furniture,
        label=request.POST.get('label', ''),
        length=request.POST.get('length', 0),
        width=request.POST.get('width', 0),
        quantity=request.POST.get('quantity', 1),
        material=material,
        edge_top=get_edge('edge_top'),
        edge_bottom=get_edge('edge_bottom'),
        edge_left=get_edge('edge_left'),
        edge_right=get_edge('edge_right'),
    )
    return render(request, "inventory/partials/furniture/panel_row.html", {'panel': panel})

@login_required
@require_http_methods(["DELETE"])
def delete_panel(request, pk):
    panel = get_object_or_404(Panel, pk=pk, cabinet__user=request.user)
    panel.delete()
    return HttpResponse("")

@login_required
def edit_furniture_name(request, pk):
    furniture = get_object_or_404(Furniture, pk=pk, user=request.user)
    
    if request.method == "POST":
        new_name = request.POST.get('name', '').strip()
        if new_name:
            furniture.name = new_name
            furniture.save()
            response = render(request, "inventory/partials/furniture/furniture_header.html", {'furniture': furniture})
            response['HX-Trigger'] = 'furnitureNameChanged'
            return response

    return render(request, "inventory/partials/furniture/furniture_header_edit.html", {'furniture': furniture})

@login_required
def get_furniture_header(request, pk):
    furniture = get_object_or_404(Furniture, pk=pk, user=request.user)
    return render(request, "inventory/partials/furniture/furniture_header.html", {'furniture': furniture})

@login_required
def get_furniture_list(request):
    furniture = Furniture.objects.filter(user=request.user)
    return render(request, "inventory/partials/furniture/furniture_list_loop.html", {
        'furniture': furniture
    })

@login_required
def get_panel_edge_detail(request, pk):
    panel = get_object_or_404(Panel, pk=pk, cabinet__user=request.user)
    edges = {
        'Top': panel.edge_top,
        'Bottom': panel.edge_bottom,
        'Left': panel.edge_left,
        'Right': panel.edge_right,
    }
    return render(request, "inventory/partials/furniture/panel_edge_detail.html", {'edges': edges})

@login_required
def edit_panel(request, pk):
    panel = get_object_or_404(Panel, pk=pk, cabinet__user=request.user)
    
    if request.method == "POST":
        panel.label = request.POST.get('label', '').strip()
        panel.length = abs(float(request.POST.get('length', 0)))
        panel.width = abs(float(request.POST.get('width', 0)))
        panel.quantity = abs(int(request.POST.get('quantity', 1)))
        
        mat_id = request.POST.get('material')
        panel.material = Material.objects.filter(id=mat_id, user=request.user).first() if mat_id else None
        
        def get_edge(pos):
            eid = request.POST.get(f'edge_{pos}')
            return EdgeBanding.objects.filter(id=eid, user=request.user).first() if eid else None
            
        panel.edge_top = get_edge('top')
        panel.edge_bottom = get_edge('bottom')
        panel.edge_left = get_edge('left')
        panel.edge_right = get_edge('right')
        
        panel.save()
        return render(request, "inventory/partials/furniture/panel_row.html", {'panel': panel})

    context = {
        'panel': panel,
        'materials': Material.objects.filter(user=request.user),
        'edges': EdgeBanding.objects.filter(user=request.user),
    }
    return render(request, "inventory/partials/furniture/panel_edit_row.html", context)

@login_required
def get_panel_row(request, pk):
    panel = get_object_or_404(Panel, pk=pk, cabinet__user=request.user)
    return render(request, "inventory/partials/furniture/panel_row.html", {'panel': panel})