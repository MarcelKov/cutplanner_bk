import { KonvaRenderer } from './canvas.js';
import { calculateManualStats } from './api.js';

export const manualPlannerData = () => ({
    panels: Alpine.$persist([]),
    stockSheets: Alpine.$persist([]),

    manualLayout: Alpine.$persist({ sheets: [], unfitted: [] }),
    currentSheetIndex: 0,
    selectedPartUid: null,
    selectedPartX: 0,
    selectedPartY: 0,

    manualStage: null,
    manualLayer: null,

    settings: {
        snapToParts: true,
        snapGrid: 5,
        bladeThickness: 0
    },
    errorMessage: '',
    isOptimizing: false,

    initManualEditor() {
        this.$nextTick(() => {
            const globalSettings = JSON.parse(localStorage.getItem('_x_settings'));
            if (globalSettings && globalSettings.bladeThickness) {
                this.settings.bladeThickness = parseFloat(globalSettings.bladeThickness);
            }

            // Create a fresh list of sheets based on the current stockSheets in the editor
            const currentSheets = this.stockSheets
                .filter(s => (parseFloat(s.length) || 0) > 0 && (parseFloat(s.width) || 0) > 0)
                .flatMap((s, sIdx) => {
                    const qty = parseInt(s.quantity) || 1;
                    const physicalSheets = [];

                    for (let i = 0; i < qty; i++) {
                        physicalSheets.push({
                            uid: `sheet-${sIdx}-${i}`,
                            sheetGroupId: sIdx,
                            groupLabel: s.label || `Stock ${sIdx + 1}`,
                            label: s.label ? `${s.label} (${i + 1}/${qty})` : `Sheet ${sIdx + 1}.${i + 1}`,
                            width: parseFloat(s.length),
                            height: parseFloat(s.width),
                            material: s.material,
                            qty: qty
                        });
                    }
                    return physicalSheets;
                });

            const oldSheetsMap = new Map(this.manualLayout.sheets.map(s => [s.uid, s.parts]));

            this.manualLayout.sheets = currentSheets.map(newSheet => ({
                ...newSheet,
                parts: oldSheetsMap.get(newSheet.uid) || []
            }));

            // Generate a complete list of all parts defined in the Panels table
            let allCurrentParts = [];
            this.panels
                .filter(p => (parseFloat(p.length) || 0) > 0 && (parseFloat(p.width) || 0) > 0)
                .forEach((p, pIdx) => {
                    const qty = parseInt(p.quantity) || 1;
                    for (let i = 0; i < qty; i++) {
                        allCurrentParts.push({
                            uid: `part-${pIdx}-${i}`,
                            groupId: pIdx,
                            label: p.label || `P${pIdx + 1}`,
                            w: parseFloat(p.length),
                            h: parseFloat(p.width),
                            material: p.material,
                            isVirtual: false,
                            edges: {
                                top: p.edge_top || null,
                                bottom: p.edge_bottom || null,
                                left: p.edge_left || null,
                                right: p.edge_right || null
                            }
                        });
                    }
                });
            // Identify which parts are already placed on any sheet
            const placedPartUids = new Set(
                this.manualLayout.sheets.flatMap(s => s.parts.map(p => p.uid))
            );

            // Filter out parts that are already placed to get the "unfitted" list (sidebar)
            this.manualLayout.unfitted = allCurrentParts.filter(p => !placedPartUids.has(p.uid));

            // If a panel was deleted in the editor but was already placed on a sheet, remove it from the sheet too
            const currentPartUids = new Set(allCurrentParts.map(p => p.uid));
            this.manualLayout.sheets.forEach(sheet => {
                sheet.parts = sheet.parts.filter(p => currentPartUids.has(p.uid));
            });

            // Re-initialize the Konva stage with the synced data
            this.setupKonva();
        });
    },

    switchSheet(index) {
        this.currentSheetIndex = index;
        this.selectedPartUid = null;
        this.renderManualCanvas();
    },

    setupKonva() {
        const holder = document.getElementById('konva-holder');
        if (!holder) return;

        this.manualStage = new Konva.Stage({
            container: 'konva-holder',
            width: holder.offsetWidth,
            height: holder.offsetHeight
        });

        this.manualLayer = new Konva.Layer();
        this.manualStage.add(this.manualLayer);
        KonvaRenderer.attachInteractivity(this.manualStage);
        this.renderManualCanvas();
    },



    addPartToStage(part) {
        let sheet = this.manualLayout.sheets[this.currentSheetIndex];

        const partMat = part.material ? String(part.material) : null;
        const sheetMat = sheet.material ? String(sheet.material) : null;

        if (partMat !== sheetMat) {
            this.errorMessage = `Material mismatch! Part "${part.label}" requires different material than this sheet.`;
            setTimeout(() => { this.errorMessage = ''; }, 3000);
            return;
        }

        const fitsNormal = part.w <= sheet.width && part.h <= sheet.height;
        const fitsRotated = part.h <= sheet.width && part.w <= sheet.height;

        if (!fitsNormal && !fitsRotated) {
            this.errorMessage = `Part "${part.label}" is larger than the current sheet!`;
            setTimeout(() => { this.errorMessage = ''; }, 3000);
            return;
        }

        let finalW = part.w;
        let finalH = part.h;
        let isRotated = false;

        if (!fitsNormal && fitsRotated) {
            finalW = part.h;
            finalH = part.w;
            isRotated = true;
        }

        sheet.parts.push({
            ...part,
            w: finalW,
            h: finalH,
            x: 0,
            y: 0,
            rotated: isRotated
        });

        this.manualLayout.unfitted = this.manualLayout.unfitted.filter(p => p.uid !== part.uid);
        this.renderManualCanvas();
    },


    renderManualCanvas() {
        if (!this.manualLayer) return;

        this.manualLayer.destroyChildren();

        const holder = document.getElementById('konva-holder');
        const sheet = this.manualLayout.sheets[this.currentSheetIndex];
        if (!sheet || !holder) return;

        const layout = KonvaRenderer.calculateLayout(holder, sheet.width, sheet.height, 60);

        // Draw Sheet
        const board = KonvaRenderer.createSheet(sheet.width, sheet.height, layout);
        this.manualLayer.add(board);

        // Draw Dimensions
        const dimensions = KonvaRenderer.createSheetDimensions(sheet.width, sheet.height, layout);
        this.manualLayer.add(dimensions);

        //Draw grid
        const grid = KonvaRenderer.createGrid(sheet.width, sheet.height, layout);
        this.manualLayer.add(grid);

        // Draw Parts
        sheet.parts.forEach(part => {
            const isSelected = this.selectedPartUid === part.uid;
            const group = KonvaRenderer.createPart(part, layout, isSelected);

            // Add Interactivity 
            this.attachPartEvents(group, part, layout);

            this.manualLayer.add(group);
        });

        this.manualLayer.draw();
    },

    attachPartEvents(group, part, layout) {
        const { scale, offsetX, offsetY } = layout;
        const sheet = this.manualLayout.sheets[this.currentSheetIndex];

        group.on('click tap', () => {
            this.selectedPartUid = part.uid;
            this.selectedPartX = part.x;
            this.selectedPartY = part.y;
            this.renderManualCanvas();
        });

        group.on('dragmove', () => {
            let rawX = (group.x() - offsetX) / scale;
            let rawY = (group.y() - offsetY) / scale;

            let newX = rawX;
            let newY = rawY;

            const kerf = parseFloat(this.settings.bladeThickness) || 0;

            if (this.settings.snapToParts) {
                const threshold = 20;
                let bestX = newX;
                let bestY = newY;
                let minDistX = threshold;
                let minDistY = threshold;

                sheet.parts.forEach(other => {
                    if (other.uid === part.uid) return;

                    const xTargets = [
                        other.x,
                        other.x + other.w + kerf,
                        other.x - part.w - kerf
                    ];

                    xTargets.forEach(target => {
                        const dist = Math.abs(rawX - target);
                        if (dist < minDistX) {
                            minDistX = dist;
                            bestX = target;
                        }
                    });

                    const yTargets = [
                        other.y,
                        other.y + other.h + kerf,
                        other.y - part.h - kerf
                    ];

                    yTargets.forEach(target => {
                        const dist = Math.abs(rawY - target);
                        if (dist < minDistY) {
                            minDistY = dist;
                            bestY = target;
                        }
                    });
                });

                newX = bestX;
                newY = bestY;
            }

            else if (this.settings.snapGrid > 0) {
                if (newX === rawX) newX = Math.round(newX / this.settings.snapGrid) * this.settings.snapGrid;
                if (newY === rawY) newY = Math.round(newY / this.settings.snapGrid) * this.settings.snapGrid;
            }

            // OUT OF BOUNDS PREVENTION
            newX = Math.max(0, Math.min(newX, sheet.width - part.w));
            newY = Math.max(0, Math.min(newY, sheet.height - part.h));

            part.x = newX;
            part.y = newY;

            group.x(newX * scale + offsetX);
            group.y(newY * scale + offsetY);

            this.selectedPartX = part.x;
            this.selectedPartY = part.y;

            this.checkCollisions(part, sheet.parts, group);
        });

        group.on('dragend', () => {
            this.renderManualCanvas(); // Clean up and re-render final positions
        });

        group.on('mouseenter', () => (document.body.style.cursor = 'move'));
        group.on('mouseleave', () => (document.body.style.cursor = 'default'));
    },

    checkCollisions(movingPart, allParts, group) {
        let isOverlapping = false;
        const kerf = parseFloat(this.settings.bladeThickness) || 0;
        const rect = group.findOne('Rect');

        for (let other of allParts) {
            if (other.uid === movingPart.uid) continue;

            if (
                movingPart.x < other.x + other.w + kerf &&
                movingPart.x + movingPart.w + kerf > other.x &&
                movingPart.y < other.y + other.h + kerf &&
                movingPart.y + movingPart.h + kerf > other.y
            ) {
                isOverlapping = true;
                break;
            }
        }

        if (isOverlapping) {
            rect.stroke('#ef4444');
            rect.strokeWidth(3);
        } else {
            rect.stroke('#64748b');
            rect.strokeWidth(1.5);
        }
    },

    syncPos() {
        const sheet = this.manualLayout.sheets[this.currentSheetIndex];
        const part = sheet.parts.find(p => p.uid === this.selectedPartUid);

        if (part) {
            part.x = parseFloat(this.selectedPartX) || 0;
            part.y = parseFloat(this.selectedPartY) || 0;
            this.renderManualCanvas();
        }
    },

    rotatePart() {
        const sheet = this.manualLayout.sheets[this.currentSheetIndex];
        const part = sheet.parts.find(p => p.uid === this.selectedPartUid);

        if (part) {
            const tempW = part.w;
            part.w = part.h;
            part.h = tempW;

            part.rotated = !part.rotated;

            this.renderManualCanvas();
        }
    },

    returnPartToUnfitted(part) {
        if (part.rotated) {
            const tempW = part.w;
            part.w = part.h;
            part.h = tempW;
            part.rotated = false;
        }

        this.manualLayout.unfitted.push({
            uid: part.uid,
            label: part.label,
            w: part.w,
            h: part.h,
            material: part.material,
            groupId: part.groupId,
            isVirtual: part.isVirtual,
            rotated: false,
            x: 0,
            y: 0
        });
    },

    removePartFromSheet() {
        const sheet = this.manualLayout.sheets[this.currentSheetIndex];
        const partIndex = sheet.parts.findIndex(p => p.uid === this.selectedPartUid);

        if (partIndex !== -1) {
            const [removedPart] = sheet.parts.splice(partIndex, 1);

            this.returnPartToUnfitted(removedPart);

            this.selectedPartUid = null;
            this.renderManualCanvas();
        }
    },

    confirmReset() {
        if (confirm("Are you sure you want to clear current Stock Sheet?")) {
            this.resetCurrentSheet();
        }
    },

    resetCurrentSheet() {
        let sheet = this.manualLayout.sheets[this.currentSheetIndex];
        if (!sheet || sheet.parts.length === 0) return;

        sheet.parts.forEach(part => {
            this.returnPartToUnfitted(part);
        });

        sheet.parts = [];
        this.selectedPartUid = null;
        this.renderManualCanvas();
    },
    duplicateSelectedPart() {
        if (!this.selectedPartUid) return;

        const sheet = this.manualLayout.sheets[this.currentSheetIndex];
        const sourcePart = sheet.parts.find(p => p.uid === this.selectedPartUid);

        if (!sourcePart) return;

        const newLabel = sourcePart.isVirtual
            ? sourcePart.label
            : `Virtual_${sourcePart.label}`;

        const virtualUid = `virtual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newPart = {
            ...sourcePart,
            uid: virtualUid,
            isVirtual: true,
            label: newLabel,
        };

        sheet.parts.push(newPart);

        this.selectedPartUid = virtualUid;
        this.selectedPartX = newPart.x;
        this.selectedPartY = newPart.y;

        this.renderManualCanvas();
    },

    async finalizeManualPlan() {

        const activeSheets = this.manualLayout.sheets.filter(s => s.parts && s.parts.length > 0);
        if (activeSheets.length === 0) {
            this.errorMessage = "At least one part must be placed on a sheet.";
            setTimeout(() => { this.errorMessage = ''; }, 3000);
            return;
        }

        this.isOptimizing = true;

        try {
            const payload = {
                sheets: activeSheets.map(s => ({
                    uid: s.uid,
                    label: s.label,
                    width: s.width,
                    height: s.height,
                    material: s.material,
                    parts: s.parts.map(p => ({
                        uid: p.uid,
                        groupId: p.groupId,
                        label: p.label,
                        w: p.w,
                        h: p.h,
                        x: p.x,
                        y: p.y,
                        rotated: p.rotated || false,
                        material: p.material,
                        edges: p.edges
                    }))
                })),
                bladeThickness: this.settings.bladeThickness,
                trim: { top: 0, bottom: 0, left: 0, right: 0 }
            };

            const results = await calculateManualStats(payload);

            const finalResults = {
                sheets: activeSheets,
                cuts: results.cuts,
                stats: results.stats
            };

            localStorage.setItem('_x_optimizationResults', JSON.stringify(finalResults));

            this.$nextTick(() => {
                window.location.href = '/results/';
            });

        } catch (err) {
            console.error("Finalization failed:", err);
            this.errorMessage = "Chyba při zpracování plánu.";
        } finally {
            this.isOptimizing = false;
        }
    },
});