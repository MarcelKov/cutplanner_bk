document.addEventListener('alpine:init', () => {
    Alpine.data('plannerData', () => ({
        projectId: Alpine.$persist(null),
        projectName: Alpine.$persist(''),

        selectedProjectId: null,
        isProjectSaving: false,
        isOptimizing: false,
        errorMessage: '',
        currentPanel: null,

        Materials: Alpine.$persist([]),
        EdgeBandings: Alpine.$persist([]),
        panels: Alpine.$persist([]),
        stockSheets: Alpine.$persist([]),

        optimizationResults: Alpine.$persist({
            sheets: [],
            unfitted: [],
            stats: {
                utilization: 0,
                total_waste: 0
            }
        }),

        settings: Alpine.$persist({
            showLabels: false,
            showEdgeBanding: false,
            showMaterials: false,
            showGrainDirection: false,
            showTrimSettings: false,
            bladeThickness: 0.0,
            optimizationPriority: 'waste',
            useOnlyOneSheet: false,
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

        addPanel() {
            this.panels.push({
                label: '', length: 0, width: 0, quantity: 1,
                material: '', grain_direction: 'none',
                edge_top: '', edge_bottom: '', edge_left: '', edge_right: ''
            });
        },

        addStock() {
            this.stockSheets.push({
                label: '', length: 0, width: 0, quantity: 1,
                material: '', grain_direction: 'none'
            });
        },

        resetProject() {
            if (confirm('Are you sure you want to start a new blank project? This will delete all unsaved data.')) {
                this.projectId = null;
                this.projectName = '';
                this.isProjectSaving = false;
                this.panels = [];
                this.stockSheets = [];
                this.Materials = [];
                this.EdgeBandings = [];
                this.addPanel();
                this.addStock();

                this.optimizationResults = { sheets: [], unfitted: [], stats: {} };

                this.settings = {
                    showLabels: false,
                    showEdgeBanding: false,
                    showMaterials: false,
                    showGrainDirection: false,
                    showTrimSettings: false,
                    bladeThickness: 0.0,
                    optimizationPriority: 'waste',
                    useOnlyOneSheet: false,
                    trim: { top: 0, bottom: 0, left: 0, right: 0 }
                };
            }
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

            if (validPanels.length === 0) {
                this.errorMessage = "Please enter at least 1 panel!";
                setTimeout(() => { this.errorMessage = ''; }, 3000);
                return;
            }
            if (validSheets.length === 0) {
                this.errorMessage = "Please enter at least 1 sheet!";
                setTimeout(() => { this.errorMessage = ''; }, 3000);
                return;
            }
            this.optimizationResults = { sheets: [], unfitted: [], stats: {} };

            window.location.href = window.resultsUrl;
        },

        removePanel(index) {
            const panel = this.panels[index];
            const isDirty = panel.label || panel.length || panel.width;

            if (!isDirty || confirm('Delete this panel?')) {
                this.panels.splice(index, 1);
                if (this.panels.length === 0) {
                    this.addPanel();
                }
            }
        },

        removeStock(index) {
            const sheet = this.stockSheets[index];
            const isDirty = sheet.label || sheet.length || sheet.width;

            if (!isDirty || confirm('Delete this stock sheet?')) {
                this.stockSheets.splice(index, 1);
                if (this.stockSheets.length === 0) {
                    this.addStock();
                }
            }
        },
        addMaterial(name) {
            if (!name) return;
            this.Materials.push({
                id: Date.now().toString(),
                name: name
            });
        },
        addEdgeBanding(name) {
            if (!name) return;
            this.EdgeBandings.push({
                id: Date.now().toString(),
                name: name
            });
        },
        getEdgeBandingCount(panel) {
            let count = 0;
            if (panel.edge_top) count++;
            if (panel.edge_bottom) count++;
            if (panel.edge_left) count++;
            if (panel.edge_right) count++;
            return count;
        },
        validateNumber(obj, field) {
            const val = parseFloat(obj[field]);
            obj[field] = isNaN(val) ? 0 : Math.abs(val);
        },

        validateConfig(field, isTrim = false) {
            if (isTrim) {
                this.settings.trim[field] = isNaN(parseFloat(this.settings.trim[field])) ? 0 : Math.abs(this.settings.trim[field]);
            } else {
                this.settings[field] = isNaN(parseFloat(this.settings[field])) ? 0 : Math.abs(this.settings[field]);
            }
        },
        handleMaterialChange(item, event) {
            const value = event.target.value;
            if (value === 'ADD_NEW') {
                material_modal.showModal();
                event.target.value = item.material || '';
            } else {
                item.material = value;
            }
        },
        handleEdgeBandingChange(panel, side, event) {
            const value = event.target.value;
            const field = 'edge_' + side;

            if (value === 'ADD_NEW_EB') {
                eb_modal.showModal();
                event.target.value = panel[field] || '';
            } else {
                panel[field] = value;
            }
        },
        async saveProject(newName = null) {
            if (this.isProjectSaving) return;
            this.isProjectSaving = true;

            const idToSend = newName ? null : this.projectId;
            const nameToSend = newName || this.projectName || "Unnamed Project";

            const payload = {
                id: idToSend,
                name: nameToSend,
                data: {
                    panels: this.panels,
                    stockSheets: this.stockSheets,
                    materials: this.Materials,
                    edgeBandings: this.EdgeBandings,
                    settings: this.settings
                }
            };

            try {
                const response = await fetch('/api/save-project', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Validation Error Details:', errorData);
                    throw new Error(JSON.stringify(errorData.detail));
                }

                const result = await response.json();

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
                const response = await fetch(`/api/project/${id}`);
                if (!response.ok) throw new Error('Failed to load project');

                const result = await response.json();
                const d = result.data;

                this.projectId = result.id;
                this.projectName = result.name;

                this.panels = d.panels || [];
                this.stockSheets = d.stockSheets || [];
                this.Materials = d.materials || [];
                this.EdgeBandings = d.edgeBandings || [];

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

            const payload = {
                panels: validPanels,
                stockSheets: validSheets,
                settings: this.settings
            };

            try {
                const response = await fetch('/api/optimize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Error while optimazing");
                }

                this.optimizationResults = await response.json();

            } catch (error) {
                console.error("Nesting Error:", error);
                this.errorMessage = "Unable to generate plan.";
            } finally {
                this.isOptimizing = false;
            }
        },
        getGroupedParts(parts) {
            const grouped = {};
            parts.forEach(p => {
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
        },
    }));
});