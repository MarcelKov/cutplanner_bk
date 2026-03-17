from collections import defaultdict
from rectpack import newPacker, PackingMode
import rectpack.guillotine as guillotine
import math
from .nesting_engine import CustomPacker

class NestingPanel:
    def __init__(self, panel_schema, edgeband_map, kerf, index):
        self.index = index
        self.label = panel_schema.label
        self.material_id = panel_schema.material
        self.quantity = int(panel_schema.quantity)
        
        self.original_w = float(panel_schema.width)  
        self.original_l = float(panel_schema.length)  
        
        def get_eb_thickness(eb_id):
            if not eb_id:
                return 0
            eb_data = edgeband_map.get(eb_id)
            return float(eb_data["thickness"]) if eb_data else 0

        eb_w = get_eb_thickness(panel_schema.edge_left) + get_eb_thickness(panel_schema.edge_right)
        eb_l = get_eb_thickness(panel_schema.edge_top) + get_eb_thickness(panel_schema.edge_bottom)
        
        self.packing_w = self.original_w - eb_w + kerf 
        self.packing_l = self.original_l - eb_l + kerf 

    def get_rid(self, instance_index):
        return f"p-{self.index}-{instance_index}"
    
class NestingSheet:
    def __init__(self, sheet_schema, trim, index):
        self.index = index
        self.label = sheet_schema.label
        self.material_id = sheet_schema.material
        self.quantity = int(sheet_schema.quantity)
        
        self.original_w = float(sheet_schema.width)   
        self.original_l = float(sheet_schema.length)  
        
        self.usable_w = self.original_w - (trim.left + trim.right)
        self.usable_l = self.original_l - (trim.top + trim.bottom)

    def get_bid(self, instance_index):
        return f"s-{self.index}-{instance_index}"

class NestingEngine:
    def __init__(self, data, context):
        self.data = data
        self.settings = data.settings
        self.context = context
        self.kerf = data.settings.bladeThickness
        self.trim = data.settings.trim
        
        self.sheets = [NestingSheet(s, self.trim, i) for i, s in enumerate(data.stockSheets)]
        self.panels = [NestingPanel(p, context['edgebands'], self.kerf, i) for i, p in enumerate(data.panels)]

    def _group_by_material(self):
        groups = defaultdict(lambda: {"sheets": [], "panels": []})
        for s in self.sheets:
            groups[s.material_id]["sheets"].append(s)
        for p in self.panels:
            groups[p.material_id]["panels"].append(p)
        return groups

    def execute(self):
        all_results = {"sheets": []}
        groups = self._group_by_material()

        for mat_id, items in groups.items():
            if not items["panels"]:
                continue

            mat_info = self.context["materials"].get(mat_id, {"grain": "none"})
            allow_rotation = (mat_info["grain"] == "none")
            
            packer = self._run_packer(items, allow_rotation)
            
            sheets = self._extract(packer)
            all_results["sheets"].extend(sheets)
            
        all_cuts = self._generate_cuts(all_results["sheets"])
        all_results["stats"] = self._calculate_stats(all_results["sheets"], all_cuts)
        all_results["cuts"] = all_cuts
        return all_results

    def _run_packer(self, items, allow_rotation):

        if self.settings.optimizationPriority == 'lib':
            packer = newPacker(
                rotation=allow_rotation,
                pack_algo=guillotine.GuillotineBafSas,
                mode=PackingMode.Offline
            )
        else:
            packer = CustomPacker(rotation_allowed=allow_rotation, priority=self.settings.optimizationPriority)

        for sheet in items["sheets"]:
            for i in range(sheet.quantity):
                packer.add_bin(sheet.usable_w, sheet.usable_l, bid=sheet.get_bid(i))

        for panel in items["panels"]:
            for i in range(panel.quantity):
                packer.add_rect(panel.packing_w, panel.packing_l, rid=panel.get_rid(i))

        packer.pack()
        return packer

    def _extract(self, packer):
        used_sheets = []

        for bin in packer:
            parts = []
            s_index = int(bin.bid.split('-')[1])
            original_stock = self.data.stockSheets[s_index]

            for rect in bin:
                p_index = int(rect.rid.split('-')[1])
                original_panel = self.data.panels[p_index]
                panel_obj = self.panels[p_index]

                is_rotated = rect.width != panel_obj.packing_l
                
                e_top = original_panel.edge_top
                e_bottom = original_panel.edge_bottom
                e_left = original_panel.edge_left
                e_right = original_panel.edge_right

                if not is_rotated:
                    edges = {"top": e_top, "bottom": e_bottom, "left": e_left, "right": e_right}
                else:
                    edges = {"top": e_left,"bottom": e_right, "left": e_bottom,"right": e_top}

                parts.append({
                    "uid": rect.rid,
                    "groupId": p_index,
                    "x": rect.x + self.trim.left,
                    "y": rect.y + self.trim.top,
                    "w": rect.width - self.kerf,
                    "h": rect.height - self.kerf,
                    "label": original_panel.label or f"P{p_index + 1}",
                    "rotated": is_rotated,
                    "edges": edges 
                })

            if parts:
                used_sheets.append({
                    "uid": bin.bid,
                    "material_id": original_stock.material,
                    "label": original_stock.label or f"Sheet {s_index + 1}",
                    "width": float(original_stock.width),
                    "height": float(original_stock.length),
                    "parts": parts
                })

        return used_sheets
    
    def _generate_cuts(self, sheets):
        k = self.kerf
        all_cuts = []
        for sheet in sheets:
            sheet_id = sheet["uid"]
            parts = sheet["parts"]
            if not parts:
                continue

            w = sheet["width"]
            h = sheet["height"]
            t = self.trim 

            if t.top > 0:
                y_pos = t.top - (k / 2)
                all_cuts.append({"x1": 0, "y1": y_pos, "x2": w, "y2": y_pos, "sheet_uid": sheet_id})
            
            if t.bottom > 0:
                y_pos = (h - t.bottom) + (k / 2)
                all_cuts.append({"x1": 0, "y1": y_pos, "x2": w, "y2": y_pos, "sheet_uid": sheet_id})
            
            if t.left > 0:
                x_pos = t.left - (k / 2)
                all_cuts.append({"x1": x_pos, "y1": 0, "x2": x_pos, "y2": h, "sheet_uid": sheet_id})
            
            if t.right > 0:
                x_pos = (w - t.right) + (k / 2)
                all_cuts.append({"x1": x_pos, "y1": 0, "x2": x_pos, "y2": h, "sheet_uid": sheet_id}) 

            initial_rect = {
                'x': self.trim.left,
                'y': self.trim.top,
                'w': sheet["width"] - self.trim.left - self.trim.right,
                'h': sheet["height"] - self.trim.top - self.trim.bottom
            }

            sheet_cuts = []
            self._recursive_cut(initial_rect, parts, sheet_cuts)
            
            for cut in sheet_cuts:
                cut["sheet_uid"] = sheet_id
                all_cuts.append(cut)
                
        for i, cut in enumerate(all_cuts):
            cut["id"] = f"cut-{i}"

        return all_cuts

    def _recursive_cut(self, rect, parts, result_cuts):
        inside_parts = [
            p for p in parts 
            if p['x'] >= rect['x'] - 0.1 and 
               p['y'] >= rect['y'] - 0.1 and 
               p['x'] + p['w'] <= rect['x'] + rect['w'] + 0.1 and 
               p['y'] + p['h'] <= rect['y'] + rect['h'] + 0.1
        ]

        if not inside_parts:
            return

        k = self.kerf
        
        for p in inside_parts:
            for y_candidate in [p['y'] - k, p['y'] + p['h']]:
                if rect['y'] + 0.1 < y_candidate < (rect['y'] + rect['h'] - k - 0.1):
                    if not any(p_in['y'] < y_candidate + k - 0.1 and p_in['y'] + p_in['h'] > y_candidate + 0.1 for p_in in inside_parts):
                        
                        result_cuts.append({
                            "x1": rect['x'], "y1": y_candidate + (k / 2),
                            "x2": rect['x'] + rect['w'], "y2": y_candidate + (k / 2)
                        })

                        upper = {**rect, 'h': y_candidate - rect['y']}
                        lower = {
                            'x': rect['x'], 
                            'y': y_candidate + k, 
                            'w': rect['w'], 
                            'h': (rect['y'] + rect['h']) - (y_candidate + k)
                        }
                        
                        self._recursive_cut(upper, inside_parts, result_cuts)
                        self._recursive_cut(lower, inside_parts, result_cuts)
                        return

        for p in inside_parts:
            for x_candidate in [p['x'] - k, p['x'] + p['w']]:
                if rect['x'] + 0.1 < x_candidate < (rect['x'] + rect['w'] - k - 0.1):
                    if not any(p_in['x'] < x_candidate + k - 0.1 and p_in['x'] + p_in['w'] > x_candidate + 0.1 for p_in in inside_parts):
                        
                        result_cuts.append({
                            "x1": x_candidate + (k / 2), "y1": rect['y'],
                            "x2": x_candidate + (k / 2), "y2": rect['y'] + rect['h']
                        })

                        left = {**rect, 'w': x_candidate - rect['x']}
                        right = {
                            'x': x_candidate + k, 
                            'y': rect['y'], 
                            'w': (rect['x'] + rect['w']) - (x_candidate + k), 
                            'h': rect['h']
                        }
                        
                        self._recursive_cut(left, inside_parts, result_cuts)
                        self._recursive_cut(right, inside_parts, result_cuts)
                        return
    
    

    def _calculate_stats(self, used_sheets, all_cuts):
        total_used_area = 0 
        total_parts_area = 0 
        total_cut_length = 0
        
        material_usage = {} 
        edgeband_usage = {} 

        for s in used_sheets:
            sheet_area = s["width"] * s["height"]
            total_used_area += sheet_area
            
            mat_id = s.get("material_id")
            if mat_id:
                mat_data = self.context["materials"].get(mat_id, {})
                if mat_id not in material_usage:
                    material_usage[mat_id] = {
                        "label": mat_data.get("name", mat_id),
                        "area": 0,
                        "cost": 0
                    }
                
                area_m2 = sheet_area / 1_000_000
                material_usage[mat_id]["area"] += area_m2
                material_usage[mat_id]["cost"] += area_m2 * float(mat_data.get("price", 0))

            for p in s["parts"]:
                part_w = p["w"]
                part_h = p["h"]
                total_parts_area += part_w * part_h
                
                for side, eb_id in p.get("edges", {}).items():
                    if eb_id:
                        eb_data = self.context["edgebands"].get(eb_id, {})
                        
                        edge_len_mm = part_w if side in ["top", "bottom"] else part_h
                        edge_len_m = edge_len_mm / 1000
                        
                        if eb_id not in edgeband_usage:
                            edgeband_usage[eb_id] = {
                                "label": eb_data.get("name", eb_id),
                                "length": 0,
                                "cost": 0
                            }
                        
                        edgeband_usage[eb_id]["length"] += edge_len_m
                        edgeband_usage[eb_id]["cost"] += edge_len_m * float(eb_data.get("price", 0))

        for c in all_cuts:
            length = math.sqrt((c["x2"] - c["x1"])**2 + (c["y2"] - c["y1"])**2)
            total_cut_length += length / 1000

        utilization = (total_parts_area / total_used_area * 100) if total_used_area > 0 else 0
        total_mat_cost = sum(m["cost"] for m in material_usage.values())
        total_eb_cost = sum(e["cost"] for e in edgeband_usage.values())

        return {
            "utilization": round(utilization, 1),
            "bladeThickness": self.kerf,
            "totalPartsArea": round(total_parts_area / 1_000_000, 2), 
            "totalUsedArea": round(total_used_area / 1_000_000, 2), 
            "sheetCount": len(used_sheets),
            "totalCutLength": round(total_cut_length, 2),
            "cutCount": len(all_cuts),
            "materialUsage": material_usage,
            "edgebandUsage": edgeband_usage,
            "totalCost": round(total_mat_cost + total_eb_cost, 2)
        }
