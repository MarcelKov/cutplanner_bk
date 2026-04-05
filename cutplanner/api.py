from ninja import NinjaAPI
from ninja.security import django_auth
from .models import Project, Panel, StockSheet , EdgeBanding , Material, Furniture
from django.db import transaction
from .schemas import SaveProjectPayload, ProjectDataSchema, ProjectBuildPayload,ProjectBuildResponse, PasteSchema, FurnitureCreateSchema
from django.shortcuts import get_object_or_404
from .services import NestingEngine

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


@api.post("/optimize", auth=[django_auth, None])
def optimize_project(request, data: ProjectDataSchema):
    context = {
        "edgebands": {},
        "materials": {}
    }
    
    if request.user.is_authenticated:
        eb_ids = {p.edge_top for p in data.panels if p.edge_top} | \
                 {p.edge_bottom for p in data.panels if p.edge_bottom} | \
                 {p.edge_left for p in data.panels if p.edge_left} | \
                 {p.edge_right for p in data.panels if p.edge_right}
        
        mat_ids = {p.material for p in data.panels if p.material} | \
                  {s.material for s in data.stockSheets if s.material}

        context["edgebands"] = {
            eb.id: {
                "thickness": float(eb.thickness),
                "price": float(eb.price_per_m or 0),
                "name": eb.name
            }
            for eb in EdgeBanding.objects.filter(id__in=eb_ids, user=request.user)
        }

        context["materials"] = {
            m.id: {
                "thickness": float(m.thickness),
                "grain": m.grain,
                "price": float(m.price_per_m2 or 0),
                "name": m.name
            }
            for m in Material.objects.filter(id__in=mat_ids, user=request.user)
        }
    
    engine = NestingEngine(data, context)
    results = engine.execute()
    
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

@api.post("/furniture/paste", auth=django_auth)
def paste_furniture(request, data: PasteSchema):
    source_furn = get_object_or_404(Furniture, id=data.source_id, user=request.user)
    target_furn = get_object_or_404(Furniture, id=data.target_id, user=request.user)
    
    with transaction.atomic():
        for s_part in source_furn.parts.all():
            existing_part = target_furn.parts.filter(
                length=s_part.length,
                width=s_part.width,
                material=s_part.material,
                edge_top=s_part.edge_top,
                edge_bottom=s_part.edge_bottom,
                edge_left=s_part.edge_left,
                edge_right=s_part.edge_right,
                label=s_part.label
            ).first()
            
            if existing_part:
                existing_part.quantity += s_part.quantity
                existing_part.save()
            else:
                s_part.pk = None
                s_part.cabinet = target_furn
                s_part.save()
                
    return {"success": True, "target_id": target_furn.id}

@api.post("/furniture/create", auth=django_auth)
def create_furniture(request, data: FurnitureCreateSchema):
    with transaction.atomic():
        furn = Furniture.objects.create(name=data.name, user=request.user)
        
        if all([data.h, data.w, data.d]):
            material = None
            th = 0
            
            if data.material_id:
                material = Material.objects.filter(id=data.material_id, user=request.user).first()
                if material:
                    th = material.thickness

            def create_p(label, l, w, q):
                Panel.objects.create(
                    cabinet=furn, 
                    material=material,
                    label=label,
                    length=l, 
                    width=w, 
                    quantity=q
                )

            # Boky
            create_p("Bok", data.h, data.d, 2)
            
            # Půda/Dno
            inner_w = data.w - (2 * th)
            create_p("Dno/Půda", inner_w, data.d, 2)
            
            # Police
            if data.shelves and data.shelves > 0:
                create_p("Police", inner_w - 2, data.d - 20, data.shelves)
            
            # Záda
            create_p("Záda", data.h - 4, data.w - 4, 1)
            
            # Dveře
            if not data.openFront:
                create_p("Dveře", data.h - 4, data.w - 4, 1)

    return {"success": True, "id": furn.id}