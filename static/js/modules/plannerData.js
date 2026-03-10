import { removeItem } from './actions.js';
import { getEdgeBandingCount, parseSafeNumber, handleSelectChange } from './utils.js';

const getEmptyPanel = () => ({
    label: '',
    length: 0,
    width: 0,
    quantity: 1,
    material: null,
    edge_top: null,
    edge_bottom: null,
    edge_left: null,
    edge_right: null
});

const getEmptyStock = () => ({
    label: '',
    length: 0,
    width: 0,
    quantity: 1,
    material: null,
});

export const plannerData = () => ({
    projectId: Alpine.$persist(null),
    projectName: Alpine.$persist(''),

    panels: Alpine.$persist([]),
    stockSheets: Alpine.$persist([]),

    errorMessage: '',
    isProjectSaving: false,
    currentPanel: null,
    optimizationResults: Alpine.$persist({ sheets: [] }),

    settings: Alpine.$persist({
        showLabels: false,
        showEdgeBanding: false,
        showMaterials: false,
        showTrimSettings: false,
        bladeThickness: 0.0,
        optimizationPriority: 'waste',
        trim: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    }),

    init() {
        if (this.panels.length === 0) this.addPanel();
        if (this.stockSheets.length === 0) this.addStock();
    },

    addPanel() { this.panels.push(getEmptyPanel()); },
    addStock() { this.stockSheets.push(getEmptyStock()); },

    validateAndOptimize() {
        const validPanels = this.panels.filter(p => parseFloat(p.length) > 0 && parseFloat(p.width) > 0);
        const validSheets = this.stockSheets.filter(s => parseFloat(s.length) > 0 && parseFloat(s.width) > 0);

        if (validPanels.length === 0 || validSheets.length === 0) {
            this.errorMessage = validPanels.length === 0 ? "Please enter at least 1 panel!" : "Please enter at least 1 sheet!";
            setTimeout(() => { this.errorMessage = ''; }, 3000);
            return;
        }

        localStorage.removeItem('_x_optimizationResults');
        localStorage.removeItem('_x_manualLayout');

        window.location.href = window.resultsUrl;
    },

    removePanel(index) {
        removeItem(this.panels, index, 'Delete this panel?', () => this.addPanel());
    },

    removeStock(index) {
        removeItem(this.stockSheets, index, 'Delete this stock sheet?', () => this.addStock());
    },

    validateNumber(obj, field) {
        obj[field] = parseSafeNumber(obj[field]);
    },

    validateConfig(field, isTrim = false) {
        const target = isTrim ? this.settings.trim : this.settings;
        target[field] = parseSafeNumber(target[field]);
    },

    handleMaterialChange(item, event) {
        handleSelectChange(item, 'material', event);
    },

    handleEdgeBandingChange(panel, side, event) {
        handleSelectChange(panel, 'edge_' + side, event);
    },

    getEdgeBandingCount(panel) {
        return getEdgeBandingCount(panel);
    },
});