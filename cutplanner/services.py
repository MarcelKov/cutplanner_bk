from rectpack import newPacker

def calculate_nesting(data_schema):
    panels = data_schema.panels
    stock_sheets = data_schema.stockSheets

    packer = newPacker(rotation=True)

    for s_idx, s in enumerate(stock_sheets):
        for i in range(int(s.quantity)):
            packer.add_bin(float(s.length), float(s.width), bid=f"s{s_idx}-i{i}")

    for p_idx, p in enumerate(panels):
        for i in range(int(p.quantity)):
            packer.add_rect(float(p.length), float(p.width), rid=f"p{p_idx}-i{i}")

    packer.pack()

    used_sheets = []
    for bin in packer:
        parts = []
        for rect in bin:
            p_index = int(rect.rid.split('-')[0][1:])
            original_label = panels[p_index].label or f"Part {p_index + 1}"

            parts.append({
                "x": rect.x,
                "y": rect.y,
                "w": rect.width,
                "h": rect.height,
                "id": rect.rid,
                "label": original_label 
            })
        
        if parts:
            s_index = int(bin.bid.split('-')[0][1:])
            original_sheet_label = stock_sheets[s_index].label or f"Sheet {s_index + 1}"

            used_sheets.append({
                "label": original_sheet_label,
                "width": bin.width,
                "length": bin.height,
                "parts": parts
            })

    unfitted_parts = []
    for bin_idx, x, y, w, h, rid in packer.rect_list():
        if bin_idx is None: 
            p_index = int(rid.split('-')[0][1:])
            original_panel = panels[p_index]
                
            unfitted_parts.append({
                "id": rid,
                "label": original_panel.label or f"Part {p_index + 1}",
                "w": w,
                "h": h
                })

    return {
        "sheets": used_sheets,
        "unfitted": unfitted_parts
    }