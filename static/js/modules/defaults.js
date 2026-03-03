function getEmptyPanel() {
    return {
        label: '', 
        length: 0, 
        width: 0, 
        quantity: 1,
        material: null, 
        edge_top: null, 
        edge_bottom: null, 
        edge_left: null, 
        edge_right: null
    };
}

function getEmptyStock() {
    return {
        label: '', 
        length: 0, 
        width: 0, 
        quantity: 1,
        material: null,
    };
}

function getDefaultSettings() {
    return {
        showLabels: false,
        showEdgeBanding: false,
        showMaterials: false,
        showTrimSettings: false,
        bladeThickness: 0.0,
        optimizationPriority: 'waste',
        trim: { top: 0, bottom: 0, left: 0, right: 0 }
    };
}

function getEmptyResults() {
    return {
        sheets: [],
        unfitted: [],
        stats: { 
            utilization: 0,
        }
    };
}

export {  getEmptyPanel, getEmptyStock, getDefaultSettings, getEmptyResults };