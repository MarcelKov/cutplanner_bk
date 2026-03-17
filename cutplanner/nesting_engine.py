import random
import math

class CustomPacker:
    def __init__(self, rotation_allowed=True, priority='waste'):
        self.rotation_allowed = rotation_allowed
        self.priority = priority
        self.bins = [] 
        self.rects = [] 
        self.result = []

    def add_bin(self, width, height, bid):
        self.bins.append({'w': width, 'h': height, 'bid': bid})

    def add_rect(self, width, height, rid):
        self.rects.append({'w': width, 'h': height, 'rid': rid})

    def __iter__(self):
        return iter(self.result)

    def pack(self):
        if not self.rects or not self.bins:
            return []

        # Serazeni desek, pro stock chceme malé desky.
        small_bins_first = self.priority != 'stock'
        self.bins.sort(key=lambda b: b['w'] * b['h'], reverse=small_bins_first)

        # vychozi solution
        curr_order = sorted(self.rects, key=lambda x: x['w'] * x['h'], reverse=True)
        curr_rots = [False] * len(curr_order)
        
        curr_res = self._execute_packing(curr_order, curr_rots)
        curr_score = self._calculate_fitness(curr_res)
        
        best_order = list(curr_order)
        best_rots = list(curr_rots)
        best_score = curr_score

        # SA
        # vychozi teplota 
        temp = 1000.0
        cooling = 0.92

        # iterace
        for _ in range(50): 
            for _ in range(25):
                # Neighborhood Search
                new_order = list(curr_order)
                new_rots = list(curr_rots)
                
                if random.random() < 0.6: # 60% sance na prohozeni
                    i, j = random.sample(range(len(new_order)), 2)
                    #prohozeni 2 dilku a jejich pozic v tabulce rotaci
                    new_order[i], new_order[j] = new_order[j], new_order[i]
                    new_rots[i], new_rots[j] = new_rots[j], new_rots[i]
                elif self.rotation_allowed: # 40% na zmenu rotace
                    i = random.randrange(len(new_rots))
                    new_rots[i] = not new_rots[i]

                # Objective Function Evaluation
                new_res = self._execute_packing(new_order, new_rots)
                new_score = self._calculate_fitness(new_res)

                # Acceptance Probability
                if new_score < curr_score or random.random() < math.exp(max(-700, (curr_score - new_score) / (temp + 1e-9))):
                    curr_order, curr_rots, curr_score = new_order, new_rots, new_score
                    if curr_score < best_score:
                        best_order, best_rots, best_score = new_order, new_rots, new_score
            #Cooling Schedule
            temp *= cooling

        # solution
        self.result = self._execute_packing(best_order, best_rots)
        return self.result


    def _execute_packing(self, panel_order, rotation_plan):
        # gilotinovy pacekr Best Area Fit + MAXAS
        optimized_results = []
        panels_to_place = []
        
        for i in range(len(panel_order)):
            panel_data = panel_order[i].copy()
            panel_data['is_rotated'] = rotation_plan[i]
            panels_to_place.append(panel_data)

        # prochazime desky
        for sheet_data in self.bins:
            if not panels_to_place:
                break
                
            # pocatecni F1 -> cela deska
            free_spaces = [{
                'x': 0, 'y': 0, 
                'w': sheet_data['w'], 
                'h': sheet_data['h']
            }]
            
            # objekt desky pro vystup
            current_sheet_result = type('Bin', (list,), {
                'bid': sheet_data['bid'], 
                'w': sheet_data['w'], 
                'h': sheet_data['h']
            })()
            
            panel_idx = 0
            while panel_idx < len(panels_to_place):
                panel = panels_to_place[panel_idx]
                
                # rozmery panelu po rotaci
                should_rotate = panel['is_rotated'] and self.rotation_allowed
                target_width = panel['w'] if not should_rotate else panel['h']
                target_height = panel['h'] if not should_rotate else panel['w']
                
                # BAF (Best Area Fit): nejvhodnejsi obdelnik na vlozeni -> nejmene odpadu po vlozeni
                best_space_idx = -1
                smallest_waste_diff = float('inf')
                
                for space_idx, space in enumerate(free_spaces):
                    if target_width <= space['w'] and target_height <= space['h']:

                        waste_after_placement = (space['w'] * space['h']) - (target_width * target_height)
                        
                        if waste_after_placement < smallest_waste_diff:
                            smallest_waste_diff = waste_after_placement
                            best_space_idx = space_idx
                
                # nasli jsme misto
                if best_space_idx != -1:
                    chosen_space = free_spaces[best_space_idx]
                    
                    # pridame panel do vysledku desky
                    current_sheet_result.append(type('Rect', (), {
                        'x': chosen_space['x'], 
                        'y': chosen_space['y'],
                        'width': target_width, 
                        'height': target_height, 
                        'rid': panel['rid']
                    }))
                    
                    # Rozdeleni prostoru
                    self._split_remaining_space(free_spaces, best_space_idx, target_width, target_height)
                    
                    panels_to_place.pop(panel_idx) 
                else:
                    # zkusime dalsi panel
                    panel_idx += 1 
            
            # Pokud deska obsahuje alespoň jeden panel, přidáme ji do výsledků
            if current_sheet_result:
                optimized_results.append(current_sheet_result)
                
        return optimized_results

    def _split_remaining_space(self, free_spaces, space_index, panel_w, panel_h):
        # MAXAS

        # odstranime aktualni prostor
        space = free_spaces.pop(space_index)
        
        # Vertical Split
        # 1 odrezek vpravo (cela vyska) a 1 na panelem
        area_v_top = panel_w * (space['h'] - panel_h)
        area_v_right = (space['w'] - panel_w) * space['h']
        min_area_vertical = min(area_v_top, area_v_right)
        
        # Horizontal Split
        # 1 odrezek nahore (cela sirka) a 1 vpravo ve vysce panelu
        area_h_top = space['w'] * (space['h'] - panel_h)
        area_h_right = (space['w'] - panel_w) * panel_h
        min_area_horizontal = min(area_h_top, area_h_right)
        
        # vyber splitu, kde ten nejmensi odrezek je vetsi nez v tom druhem
        if min_area_vertical >= min_area_horizontal:
            # odrezek vpravo (cela vyska)
            if space['w'] - panel_w > 0:
                free_spaces.append({
                    'x': space['x'] + panel_w, 'y': space['y'], 
                    'w': space['w'] - panel_w, 'h': space['h']
                })
            # odrezek nad panelem
            if space['h'] - panel_h > 0:
                free_spaces.append({
                    'x': space['x'], 'y': space['y'] + panel_h, 
                    'w': panel_w, 'h': space['h'] - panel_h
                })
        else:
            # odrezek nahore (cela sirka)
            if space['h'] - panel_h > 0:
                free_spaces.append({
                    'x': space['x'], 'y': space['y'] + panel_h, 
                    'w': space['w'], 'h': space['h'] - panel_h
                })
            # odrezek vpravo ve vysce panelu
            if space['w'] - panel_w > 0:
                free_spaces.append({
                    'x': space['x'] + panel_w, 'y': space['y'], 
                    'w': space['w'] - panel_w, 'h': panel_h
                })

    def _calculate_fitness(self, packed_sheets):
        if not packed_sheets:
            return float('inf')

        total_sheets_area = 0    
        total_parts_compactness = 0 
        total_alignment_penalty = 0 

        for sheet in packed_sheets:
            # WASTE: pridame plochy desky 
            total_sheets_area += (sheet.w * sheet.h)

            # ALIGNMENT: unikatni linee rezu 
            unique_vertical_cuts = {rect.x + rect.width for rect in sheet}
            unique_horizontal_cuts = {rect.y + rect.height for rect in sheet}
            total_alignment_penalty += (len(unique_vertical_cuts) + len(unique_horizontal_cuts))

            # COMPACTNESS: souradnice vsech dilu -> blize se 0 lepsi
            for rect in sheet:
                total_parts_compactness += (rect.x + rect.y)


        area_m2 = total_sheets_area / 1_000_000

        if self.priority == 'cuts':
            # Priorita Minimal Cuts: prevazne ALIGNMENT
            return (total_alignment_penalty * 0.5) + (area_m2 * 10)

        # Priorita Minimaze Waste:
        # prevazne plocha
        return (area_m2 * 1000) + (total_parts_compactness * 0.1) + (total_alignment_penalty * 0.1)