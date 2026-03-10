from ninja import NinjaAPI
from ninja.security import django_auth
from .models import Project, Panel, StockSheet
from .schemas import SaveProjectPayload, ProjectDataSchema, ProjectBuildPayload,ProjectBuildResponse
from django.shortcuts import get_object_or_404
from .services import calculate_nesting

api = NinjaAPI()

@api.post("/save-project", auth=django_auth)
def save_project(request, payload: SaveProjectPayload):
    project, created = Project.objects.update_or_create(
        id=payload.id,
        user=request.user,
        defaults={
            "name": payload.name,
            "data": payload.data.dict()
        }
    )
    
    return {
        "id": project.id, 
        "name": project.name, 
        "status": "success"
    }

@api.get("/project/{project_id}", auth=django_auth, response=SaveProjectPayload)
def get_project(request, project_id: int):
    project = get_object_or_404(Project, id=project_id, user=request.user)
    return project


@api.post("/optimize")
def optimize_anonymous(request, data: ProjectDataSchema):
    results = calculate_nesting(data)
    return results

@api.post("/create-from-templates", auth=django_auth,response=ProjectBuildResponse)
def create_from_templates(request, payload: ProjectBuildPayload):
    panel_qs = Panel.objects.filter(
        cabinet_id__in=payload.furniture_ids, 
        cabinet__user=request.user
    )

    all_panels = []
    for p in panel_qs:
        all_panels.append({
            "label": p.label,
            "length": float(p.length),
            "width": float(p.width),
            "quantity": p.quantity,
            "material": p.material_id, 
            "edge_top": p.edge_top_id,
            "edge_bottom": p.edge_bottom_id,
            "edge_left": p.edge_left_id,
            "edge_right": p.edge_right_id,
        })

    sheet_qs = StockSheet.objects.filter(
        id__in=payload.stock_ids, 
        user=request.user
    )
    
    all_sheets = []
    for s in sheet_qs:
        all_sheets.append({
            "label": s.label,
            "length": float(s.length),
            "width": float(s.width),
            "quantity": s.quantity,
            "material": s.material_id, 
        })

    return {
        "panels": all_panels,
        "stockSheets": all_sheets
    }