from ninja import NinjaAPI
from ninja.security import django_auth
from .models import Project
from .schemas import SaveProjectPayload, ProjectDataSchema
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