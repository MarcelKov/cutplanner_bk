function getEdgeBandingCount(panel) {
    const sides = ['edge_top', 'edge_bottom', 'edge_left', 'edge_right'];
    return sides.reduce((count, side) => panel[side] ? count + 1 : count, 0);
}

function parseSafeNumber(val) {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
}

function handleSelectChange(item, field, event) {
    const value = event.target.value;

    if (value === 'ADD_NEW') {
        window.location.href = "/inventory/materials/";
        return;
    }
    
    if (value === 'ADD_NEW_EB') {
        window.location.href = "/inventory/edges/";
        return;
    }

   item[field] = value ? parseInt(value, 10) : null;
}

function getGroupedParts(parts) {
    if (!parts || !Array.isArray(parts)) return [];
    
    const grouped = {};
    parts.forEach(function(p) {
        const key = `${p.label}-${p.w}-${p.h}`;
        if (!grouped[key]) {
            grouped[key] = {
                label: p.label,
                w: p.w,
                h: p.h,
                count: 0
            };
        }
        grouped[key].count++;
    });
    return Object.values(grouped);
}

export {getEdgeBandingCount,parseSafeNumber,handleSelectChange, getGroupedParts};