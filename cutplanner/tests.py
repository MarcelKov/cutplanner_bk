from django.test import TestCase
from .schemas import ProjectDataSchema
from .services import NestingEngine 

class NestingEngineLogicTest(TestCase):
    def test_nesting_no_overlap_and_trim(self):
        """Tests collision and trim application"""
        data_dict = {
            "panels": [{"label": "P1", "length": 1000, "width": 1000, "quantity": 2, "material": 1}],
            "stockSheets": [{"label": "S1", "length": 2500, "width": 1500, "quantity": 1, "material": 1}],
            "settings": {
                "bladeThickness": 4.0, 
                "trim": {"top": 50, "bottom": 0, "left": 50, "right": 0}}
        }
        
        context = {
            "materials": {1: {"thickness": 18, "grain": "none", "price": 100}},
            "edgebands": {}
        }

        data = ProjectDataSchema(**data_dict)
        engine = NestingEngine(data, context)
        results = engine.execute()

        for sheet in results["sheets"]:
            parts = sheet["parts"]
            for i, p1 in enumerate(parts):
                self.assertGreaterEqual(p1["x"], 50, f"Dílec {p1['uid']} zasahuje do levého ořezu")
                self.assertGreaterEqual(p1["y"], 50, f"Dílec {p1['uid']} zasahuje do horního ořezu")

                for j, p2 in enumerate(parts):
                    if i == j: continue
                    
                    overlap = not (
                        p1["x"] + p1["w"] <= p2["x"] or
                        p2["x"] + p2["w"] <= p1["x"] or
                        p1["y"] + p1["h"] <= p2["y"] or
                        p2["y"] + p2["h"] <= p1["y"]
                    )
                    self.assertFalse(overlap, f"Collision between {p1['uid']} a {p2['uid']}")


    def test_edge_rotation_logic(self):
        """Tests that edges are correctly assigned to rotated panel."""
        data_dict = {
            "panels": [{"label": "P1", "length": 1000, "width": 200, "quantity": 1, "material": 1, "edge_top": 10, "edge_bottom": 11, "edge_left": 20, "edge_right": 21}],
            "stockSheets": [{"label": "S1", "length": 1500, "width": 500, "quantity": 1, "material": 1}],
            "settings": {
                "bladeThickness": 0, 
                "optimizationPriority": "waste"}
        }
        
        context = {
            "materials": {
                1: {"name": "M", "price": 100, "thickness": 18, "grain": "none"}
            },
            "edgebands": {
                10: {"thickness": 0, "price": 0, "name": "T"}, 
                11: {"thickness": 0, "price": 0, "name": "B"}, 
                20: {"thickness": 0, "price": 0, "name": "L"}, 
                21: {"thickness": 0, "price": 0, "name": "R"}
            }
        }
        
        engine = NestingEngine(ProjectDataSchema(**data_dict), context)
        results = engine.execute()
        
        self.assertGreater(len(results["sheets"]), 0)
        part = results["sheets"][0]["parts"][0]
        
        self.assertTrue(part["rotated"], "Panel should have rotated")

        self.assertEqual(part["edges"]["right"], 10)
        self.assertEqual(part["edges"]["top"], 20)
        self.assertEqual(part["edges"]["left"], 11)
        self.assertEqual(part["edges"]["bottom"], 21)

    def test_stats_consistency(self):
        """Test stats"""
        data_dict = {
            "panels": [{"label": "P1", "length": 500, "width": 500, "quantity": 4, "material": 1}],
            "stockSheets": [{"label": "S1", "length": 1000, "width": 1000, "quantity": 1, "material": 1}],
            "settings": {"bladeThickness": 0}
        }
        context = {"materials": {1: {"thickness": 18, "grain": "none", "price": 100}}, "edgebands": {}}
        
        engine = NestingEngine(ProjectDataSchema(**data_dict), context)
        results = engine.execute()
        
        stats = results["stats"]
        self.assertEqual(float(stats["utilization"]), 100.0)
        self.assertEqual(float(stats["totalPartsArea"]), 1.0) # 1 m2

    def test_trim_and_kerf_accuracy(self):
        """Test coordinates with kerf and trim"""
        data_dict = {
            "panels": [{"label": "P1", "length": 500, "width": 500, "quantity": 2, "material": 1}],
            "stockSheets": [{"label": "S1", "length": 600, "width": 1200, "quantity": 1, "material": 1}],
            "settings": {
                "bladeThickness": 4.0, 
                "trim": {"top": 10, "bottom": 0, "left": 20, "right": 0}
            }
        }
        context = {"materials": {1: {"thickness": 18, "grain": "none", "price": 100}}, "edgebands": {}}
        engine = NestingEngine(ProjectDataSchema(**data_dict), context)
        results = engine.execute()

        parts = results["sheets"][0]["parts"]
        parts.sort(key=lambda p: p["x"])

        p1 = parts[0]
        p2 = parts[1]

        self.assertEqual(p1["x"], 20) 
        self.assertEqual(p1["y"], 10)

        self.assertEqual(p2["x"], 524.0)
        self.assertEqual(p2["y"], 10)

    def test_grain_direction_constraint(self):
        """Tests that panel with grain direction is not rotated"""
        data_dict = {
            "panels": [{"label": "Long", "length": 800, "width": 400, "quantity": 1, "material": 1}],
            "stockSheets": [{"label": "S1", "length": 1000, "width": 300, "quantity": 1, "material": 1}],
            "settings": {"bladeThickness": 0}
        }
    
        context = {"materials": {1: {"grain": "horizontal", "thickness": 18, "price": 100}}, "edgebands": {}}
    
        engine = NestingEngine(ProjectDataSchema(**data_dict), context)
        results = engine.execute()

        placed_parts_count = sum(len(s["parts"]) for s in results["sheets"])
        self.assertEqual(placed_parts_count, 0)

    def test_oversized_part_handling(self):
        """Test big panel skipping"""
        data_dict = {
            "panels": [{"label": "Giant", "length": 5000, "width": 5000, "quantity": 1, "material": 1}],
            "stockSheets": [{"label": "S1", "length": 2000, "width": 2000, "quantity": 1, "material": 1}],
            "settings": {"bladeThickness": 0}
        }
        context = {"materials": {1: {"grain": "none", "thickness": 18, "price": 100}}, "edgebands": {}}
        engine = NestingEngine(ProjectDataSchema(**data_dict), context)
        results = engine.execute()
        placed_parts_count = sum(len(s["parts"]) for s in results["sheets"])
        self.assertEqual(placed_parts_count, 0)
        self.assertEqual(results["stats"]["utilization"], 0.0)

    def test_material_separation(self):
        """Test material consistency"""
        data_dict = {
            "panels": [
                {"label": "P_Mat1", "length": 500, "width": 500, "quantity": 1, "material": 1},
                {"label": "P_Mat2", "length": 500, "width": 500, "quantity": 1, "material": 2}
            ],
            "stockSheets": [
                {"label": "S_Mat1", "length": 2000, "width": 2000, "quantity": 1, "material": 1}
            ],
            "settings": {"bladeThickness": 0}
        }
        
        context = {
            "materials": {
                1: {"name": "Materiál 1", "thickness": 18, "grain": "none", "price": 100},
                2: {"name": "Materiál 2", "thickness": 10, "grain": "none", "price": 200}
            },
            "edgebands": {}
        }
        
        engine = NestingEngine(ProjectDataSchema(**data_dict), context)
        results = engine.execute()
        
        self.assertEqual(len(results["sheets"]), 1)
        placed_parts = results["sheets"][0]["parts"]
        self.assertEqual(len(placed_parts), 1)
        self.assertEqual(placed_parts[0]["label"], "P_Mat1")