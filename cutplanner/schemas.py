from ninja import Schema, Field
from typing import List, Optional


class TrimSchema(Schema):
    top: float = 0
    bottom: float = 0
    left: float = 0
    right: float = 0

class SettingsSchema(Schema):
    showLabels: bool = False
    showEdgeBanding: bool = False
    showMaterials: bool = False
    showTrimSettings: bool = False
    
    bladeThickness: float = 0.0
    optimizationPriority: str = "waste"
    trim: TrimSchema = TrimSchema()

class StockSheetSchema(Schema):
    label: str = ""
    length: float = 0
    width: float = 0
    quantity: int = 1
    material: Optional[int] = None
    
class PanelSchema(Schema):
    label: str = ""
    length: float = 0
    width: float = 0
    quantity: int = 1
    material: Optional[int] = None
    edge_top: Optional[int] = None
    edge_bottom: Optional[int] = None
    edge_left: Optional[int] = None
    edge_right: Optional[int] = None

class ProjectDataSchema(Schema):
    panels: List[PanelSchema]
    stockSheets: List[StockSheetSchema]
    settings: SettingsSchema

class SaveProjectPayload(Schema):
    id: Optional[int] = None
    name: str
    data: ProjectDataSchema

class ProjectBuildPayload(Schema):
    furniture_ids: List[int]
    stock_ids: List[int]

class ProjectBuildResponse(Schema):
    panels: List[PanelSchema]
    stockSheets: List[StockSheetSchema]

class PasteSchema(Schema):
    source_id: int
    target_id: int

class FurnitureCreateSchema(Schema):
    name: str = Field(..., min_length=1, max_length=255)
    
    h: Optional[int] = Field(None, gt=0)
    w: Optional[int] = Field(None, gt=0)
    d: Optional[int] = Field(None, gt=0)
    
    material_id: Optional[int] = None
    shelves: int = Field(0, ge=0)
    openFront: bool = True