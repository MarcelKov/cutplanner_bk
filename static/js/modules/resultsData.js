import { optimize, sendCuttingPlan } from './api.js';
import { KonvaRenderer } from './canvas.js';
import { PDFExporter } from './pdf.js';
import { getGroupedParts } from './utils.js';

export const resultsData = () => ({
    panels: Alpine.$persist([]),
    stockSheets: Alpine.$persist([]),
    settings: Alpine.$persist({}),

    optimizationResults: Alpine.$persist({
        sheets: [],
        cuts: [],
        stats: {
            utilization: 0,
            bladeThickness: 0,
            totalPartsArea: 0,
            totalUsedArea: 0,
            sheetCount: 0,
            totalCutLength: 0,
            cutCount: 0,
            totalMaterialSheetCost: 0,
            totalMaterialPartCost: 0,
            totalEdgebandCost: 0,
            materialUsage: {},
            materialUsageParts: {},
            edgebandUsage: {}
        }
    }),

    cuttingRate: 0.0,

    isOptimizing: false,
    currentSheetIndex: 0,
    konvaStage: null,
    isExporting: false,
    costMode: 'sheets',

    recipientEmail: '',
    recipientList: [],
    isSending: false,
    emailErrorMessage: '',

    toast: {
        show: false,
        message: '',
        type: 'success'
    },

    init() {
        if (this.optimizationResults?.sheets?.length > 0) {
            this.$nextTick(() => this.setupKonva());
        }
        this.$watch('currentSheetIndex', () => {
            this.drawCanvas();
        });
    },

    showToast(message, type = 'success') {
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;

        setTimeout(() => {
            this.toast.show = false;
        }, 4000);
    },

    addEmail() {
        this.emailErrorMessage = '';

        const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
        const trimmedEmail = this.recipientEmail.trim();

        if (trimmedEmail === '' || !emailRegex.test(trimmedEmail)) {
            this.emailErrorMessage = 'Please enter a valid email address.';
            setTimeout(() => { this.emailErrorMessage = ''; }, 3000);
            return;
        }

        if (this.recipientList.includes(trimmedEmail)) {
            this.emailErrorMessage = 'This email is already in the list.';
            setTimeout(() => { this.emailErrorMessage = ''; }, 3000);
            return;
        }

        this.recipientList.push(trimmedEmail);
        this.recipientEmail = '';
    },

    removeEmail(index) {
        this.recipientList.splice(index, 1);
    },

    async sendViaEmail() {
        if (this.recipientList.length === 0) return;

        const data = this.preparePdfData();
        if (!data) return;

        this.isSending = true;
        this.emailErrorMessage = '';

        try {
            // Generování PDF 
            const pdfBlob = await PDFExporter.generateBlob(data.sheets, data.cuts, data.stats, "Cutting_Plan");

            // Příprava FormData
            const formData = new FormData();
            formData.append('pdf_file', pdfBlob, 'cutting_plan.pdf');
            formData.append('recipients', JSON.stringify(this.recipientList));

            // Odeslání přes API
            await sendCuttingPlan(formData);

            // 4. Success handling
            email_modal.close();
            this.recipientList = [];
            this.showToast("Success! The cutting plan has been sent to all recipients.", "success");
        } catch (err) {
            console.error("Email error:", err);
            this.emailErrorMessage = err.message;
        } finally {
            this.isSending = false;
        }
    },

    preparePdfData() {
        const sheetsToExport = this.optimizationResults.sheets.filter(s => s.parts && s.parts.length > 0);

        if (sheetsToExport.length === 0) {
            this.showToast("No results for export.", "error");
            return null;
        }

        const stats = { ...this.optimizationResults.stats };
        const rate = parseFloat(this.cuttingRate) || 0;
        const length = parseFloat(stats.totalCutLength) || 0;

        stats.cuttingRate = rate;
        stats.laborCost = rate * length;

        return {
            sheets: sheetsToExport,
            cuts: this.optimizationResults.cuts || [],
            stats: stats
        };
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
            this.showToast("Unable to generate plan.", "error");
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
        KonvaRenderer.attachInteractivity(this.konvaStage);

        this.drawCanvas();
    },
    async exportToPDF() {
        const data = this.preparePdfData();
        if (!data) return;
        this.isExporting = true;
        try {
            await PDFExporter.generate(data.sheets, data.cuts, data.stats, "Optimization_Cutting_Plan");
        } catch (err) {
            console.error("PDF Export failed:", err);
            this.showToast("PDF Export failed", "error");
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

        const relevantCuts = (this.optimizationResults.cuts || [])
            .filter(cut => cut.sheet_uid === sheet.uid);

        const bladeThickness = this.optimizationResults.stats?.bladeThickness || 3;

        relevantCuts.forEach(cut => {
            this.konvaLayer.add(KonvaRenderer.createCutLine(cut, layout, bladeThickness));
        });

        sheet.parts.forEach(part => {
            const group = KonvaRenderer.createPart(part, layout, false);
            group.draggable(false);
            this.konvaLayer.add(group);
        });

        this.konvaLayer.draw();
    },
    highlightCut(cut, isHighlighted) {
        const node = this.konvaLayer.findOne('#' + cut.id);
        if (!node) return;

        const originalThickness = this.optimizationResults.stats.bladeThickness || 3;
        const scale = this.currentLayout?.scale || 1;

        if (isHighlighted) {
            const isVertical = cut.x1 === cut.x2;

            node.setAttrs({
                fill: '#c084fc',
                opacity: 1,
                stroke: '#000',
                strokeWidth: 1 / scale,
                width: isVertical ? (originalThickness + 4) * scale : node.width(),
                height: !isVertical ? (originalThickness + 4) * scale : node.height(),
                offsetX: isVertical ? 2 * scale : 0,
                offsetY: !isVertical ? 2 * scale : 0
            });

            node.moveToTop();
        } else {
            const isVertical = cut.x1 === cut.x2;
            node.setAttrs({
                fill: '#450a0a',
                opacity: 0.4,
                strokeWidth: 0,
                width: isVertical ? originalThickness * scale : node.width(),
                height: !isVertical ? originalThickness * scale : node.height(),
                offsetX: 0,
                offsetY: 0
            });
        }

        this.konvaLayer.batchDraw();
    },
});