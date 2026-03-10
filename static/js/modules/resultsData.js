import { optimize } from './api.js';
import { KonvaRenderer } from './canvas.js';
import { PDFExporter } from './pdf.js';
import { getGroupedParts } from './utils.js';

export const resultsData = () => ({
    panels: Alpine.$persist([]),
    stockSheets: Alpine.$persist([]),
    settings: Alpine.$persist({}),

    optimizationResults: Alpine.$persist({
        sheets: [],
        unfitted: [],
        stats: {
            utilization: 0,
        }
    }),

    isOptimizing: false,
    errorMessage: '',
    currentSheetIndex: 0,
    konvaStage: null,
    isExporting: false,

    init() {
        if (this.optimizationResults?.sheets?.length > 0) {
            this.$nextTick(() => this.setupKonva());
        }
        this.$watch('currentSheetIndex', () => {
            this.drawCanvas();
        });
    },

    async generatePlan() {
        if (this.optimizationResults && this.optimizationResults.sheets.length > 0) {
            console.log("Using cached optimization data");
            this.$nextTick(() => this.setupKonva());
            return;
        }

        const validPanels = this.panels.filter(p => parseFloat(p.length) > 0 && parseFloat(p.width) > 0);
        const validSheets = this.stockSheets.filter(s => parseFloat(s.length) > 0 && parseFloat(s.width) > 0);

        if (validPanels.length === 0 || validSheets.length === 0) {
            console.warn("Missing data for generation");
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
            this.$nextTick(() => this.setupKonva());
        } catch (error) {
            console.error("Nesting Error:", error);
            this.errorMessage = "Unable to generate plan.";
        } finally {
            this.isOptimizing = false;
        }
    },

    getGroupedParts(parts) {
        return getGroupedParts(parts);
    },

    setupKonva() {
        const holder = document.getElementById('konva-canvas');
        if (!holder) return;

        if (this.konvaStage) {
            this.konvaStage.destroy();
            this.konvaStage = null;
        }

        const width = holder.offsetWidth;
        const height = holder.offsetHeight;

        if (width === 0 || height === 0) {
            console.warn("Konva holder has 0 dimensions, retrying in 50ms...");
            setTimeout(() => this.setupKonva(), 50);
            return;
        }

        this.konvaStage = new Konva.Stage({
            container: 'konva-canvas',
            width: width,
            height: height
        });

        this.konvaLayer = new Konva.Layer();
        this.konvaStage.add(this.konvaLayer);

        this.drawCanvas();
    },
    async exportToPDF() {
        const sheetsToExport = this.optimizationResults.sheets.filter(s => s.parts && s.parts.length > 0);

        if (sheetsToExport.length === 0) {
            this.errorMessage = "No results for export.";
            setTimeout(() => { this.errorMessage = ''; }, 3000);
            return;
        }

        this.isExporting = true;

        try {
            await PDFExporter.generate(sheetsToExport, "Optimization_Cutting_Plan");
        } catch (err) {
            console.error("PDF Export failed:", err);
            this.errorMessage = "Chyba při generování PDF.";
            setTimeout(() => { this.errorMessage = ''; }, 3000);
        } finally {
            this.isExporting = false;
        }
    },

    drawCanvas() {
        if (!this.konvaLayer) return;

        this.konvaLayer.destroyChildren();

        const holder = document.getElementById('konva-canvas');
        const sheet = this.optimizationResults?.sheets?.[this.currentSheetIndex];

        if (!sheet || !holder) return;

        const layout = KonvaRenderer.calculateLayout(holder, sheet.width, sheet.height, 60);
        this.konvaLayer.add(KonvaRenderer.createSheet(sheet.width, sheet.height, layout));
        this.konvaLayer.add(KonvaRenderer.createGrid(sheet.width, sheet.height, layout));
        this.konvaLayer.add(KonvaRenderer.createSheetDimensions(sheet.width, sheet.height, layout));

        sheet.parts.forEach(part => {
            const group = KonvaRenderer.createPart(part, layout, false);
            group.draggable(false);
            this.konvaLayer.add(group);
        });

        this.konvaLayer.draw();
    },
});