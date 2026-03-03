import { save, load, optimize } from './modules/api.js';
import { getEmptyPanel, getEmptyStock, getDefaultSettings, getEmptyResults } from './modules/defaults.js';
import { removeItem } from './modules/actions.js';
import { getEdgeBandingCount, parseSafeNumber, handleSelectChange, getGroupedParts } from './modules/utils.js';
import { renderSheet } from './modules/canvas.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('plannerData', () => ({
        projectId: Alpine.$persist(null),
        projectName: Alpine.$persist(''),

        selectedProjectId: null,
        isProjectSaving: false,
        isOptimizing: false,
        errorMessage: '',
        currentPanel: null,
        currentSheetIndex: 0,

        panels: Alpine.$persist([]),
        stockSheets: Alpine.$persist([]),

        optimizationResults: Alpine.$persist({
            sheets: [],
            unfitted: [],
            stats: {
                utilization: 0,
            }
        }),

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

            this.$watch('currentSheetIndex', () => {
                this.drawCanvas();
            });
        },

        addPanel() { this.panels.push(getEmptyPanel()); },
        addStock() { this.stockSheets.push(getEmptyStock()); },

        resetProject() {
            if (!confirm('Are you sure you want to start a new blank project? This will delete all unsaved data.')) return;

            this.projectId = null;
            this.projectName = '';
            this.isProjectSaving = false;

            this.panels = [getEmptyPanel()];
            this.stockSheets = [getEmptyStock()];
            this.optimizationResults = getEmptyResults();
            this.settings = getDefaultSettings();
        },

        handleProjectDeletion(deletedId) {
            const idToMatch = Number(deletedId);
            if (Number(this.selectedProjectId) === idToMatch) {
                console.log("Match found: Clearing selectedProjectId");
                this.selectedProjectId = null;
            }
            if (Number(this.projectId) === idToMatch) {
                console.log("Match found: Resetting active project");
                this.projectId = null;
                this.projectName = '';
            }
        },

        validateAndOptimize() {
            const validPanels = this.panels.filter(p => parseFloat(p.length) > 0 && parseFloat(p.width) > 0);
            const validSheets = this.stockSheets.filter(s => parseFloat(s.length) > 0 && parseFloat(s.width) > 0);

            if (validPanels.length === 0 || validSheets.length === 0) {
                this.errorMessage = validPanels.length === 0 ? "Please enter at least 1 panel!" : "Please enter at least 1 sheet!";
                setTimeout(() => { this.errorMessage = ''; }, 3000);
                return;
            }

            this.optimizationResults = getEmptyResults();

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
        getGroupedParts(parts) {
            return getGroupedParts(parts);
        },

        async saveProject(newName = null) {
            if (this.isProjectSaving) return;
            this.isProjectSaving = true;

            const payload = {
                id: newName ? null : this.projectId,
                name: newName || this.projectName || "Unnamed Project",
                data: {
                    panels: this.panels,
                    stockSheets: this.stockSheets,
                    settings: this.settings
                }
            };

            try {
                const result = await save(payload);
                this.projectId = result.id;
                this.projectName = result.name;
                alert(`Project "${this.projectName}" was saved.`);
            } catch (err) {
                console.error('Save error:', err);
                alert('Error while saving');
            } finally {
                this.isProjectSaving = false;
            }
        },
        async loadProject(id) {
            if (!id) return;

            try {
                const result = await load(id);
                const d = result.data;

                this.projectId = result.id;
                this.projectName = result.name;

                this.panels = d.panels || [];
                this.stockSheets = d.stockSheets || [];
                
                if (d.settings) {
                    this.settings = d.settings;
                }

                console.log(`Project "${this.projectName}" loaded successfully.`);

            } catch (err) {
                console.error('Load error:', err);
                alert('Error while loading project data.');
            }
        },
        async generatePlan() {
            if (this.optimizationResults && this.optimizationResults.sheets.length > 0) {
                console.log("Using old data");
                this.$nextTick(() => this.drawCanvas());
                return;
            }
            const validPanels = this.panels.filter(p => parseFloat(p.length) > 0 && parseFloat(p.width) > 0);
            const validSheets = this.stockSheets.filter(s => parseFloat(s.length) > 0 && parseFloat(s.width) > 0);

            if (validPanels.length === 0 || validSheets.length === 0) {
                console.warn("No Data");
                window.location.href = window.homeUrl;
                return;
            }

            this.isOptimizing = true;

            try {
                const payload = {
                    panels: validPanels,
                    stockSheets: validSheets,
                    settings: this.settings
                };
                this.optimizationResults = await optimize(payload);
                this.$nextTick(() => this.drawCanvas());
            } catch (error) {
                console.error("Nesting Error:", error);
                this.errorMessage = "Unable to generate plan.";
            } finally {
                this.isOptimizing = false;
            }
        },
        drawCanvas() {
            if (this.konvaStage) {
                this.konvaStage.destroy();
            }
            const sheet = this.optimizationResults?.sheets?.[this.currentSheetIndex];
            this.konvaStage = renderSheet(sheet, 'konva-canvas');
        }
    }));
});