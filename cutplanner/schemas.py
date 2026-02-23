from ninja import Schema
from typing import List, Optional

class MaterialSchema(Schema):
    id: Optional[str] = None 
    name: str

class EdgeBandingSchema(Schema):
    id: Optional[str] = None
    name: str

class TrimSchema(Schema):
    top: float = 0
    bottom: float = 0
    left: float = 0
    right: float = 0

class SettingsSchema(Schema):
    showLabels: bool = False
    showEdgeBanding: bool = False
    showMaterials: bool = False
    showGrainDirection: bool = False
    showTrimSettings: bool = False
    
    bladeThickness: float = 0.0
    optimizationPriority: str = "waste"
    useOnlyOneSheet: bool = False
    trim: TrimSchema = TrimSchema()

class StockSheetSchema(Schema):
    label: str = ""
    length: float = 0
    width: float = 0
    quantity: int = 1
    material: Optional[str] = None
    grain_direction: str = "none"

class PanelSchema(Schema):
    label: str = ""
    length: float = 0
    width: float = 0
    quantity: int = 1
    material: Optional[str] = None
    grain_direction: str = "none"
    edge_top: str = ""
    edge_bottom: str = ""
    edge_left: str = ""
    edge_right: str = ""

class ProjectDataSchema(Schema):
    panels: List[PanelSchema]
    stockSheets: List[StockSheetSchema]
    settings: SettingsSchema
    materials: List[MaterialSchema] = []
    edgeBandings: List[EdgeBandingSchema] = []

class SaveProjectPayload(Schema):
    id: Optional[int] = None
    name: str
    data: ProjectDataSchema