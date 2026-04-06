import { KonvaRenderer } from './canvas.js';

export const PDFExporter = {

    async generate(sheets, all_cuts = [], stats = {}, fileName = "Narezovy_plan") {
        const doc = await this._buildPDF(sheets, all_cuts, stats, fileName);
        window.open(doc.output('bloburl'), '_blank');
    },

    async generateBlob(sheets, all_cuts = [], stats = {}, fileName = "Narezovy_plan") {
        const doc = await this._buildPDF(sheets, all_cuts, stats, fileName);
        return doc.output('blob');
    },


    safeText(text) {
        if (!text) return "";
        return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    },

    async _buildPDF(sheets, all_cuts = [], stats = {}, fileName = "Narezovy_plan") {
        const validSheets = sheets.filter(s => s.parts && s.parts.length > 0);
        if (validSheets.length === 0) {
            alert("Žádné díly k exportu!");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        const purpleColor = [120, 113, 255];
        const bladeThickness = stats.bladeThickness || 3;

        const renderFooter = (data) => {
            const str = "Strana " + doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');

            doc.text(str, pageWidth - 25, pageHeight - 10);
            doc.text(this.safeText(fileName), 15, pageHeight - 10);
        };


        for (let i = 0; i < validSheets.length; i++) {
            const sheet = validSheets[i];
            if (i > 0) doc.addPage();

            // Header
            doc.setFillColor(...purpleColor);
            doc.rect(0, 0, pageWidth, 25, 'F');

            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text(this.safeText(`Deska: ${sheet.label || sheet.groupLabel}`), 15, 12);

            doc.setFontSize(9);
            doc.text(this.safeText(`Rozměr desky: ${sheet.width} x ${sheet.height} mm`), 15, 19);

            // Cutting plan image
            const sheetId = sheet.id || sheet.uid || sheet.label;
            const sheetCuts = all_cuts.filter(c => c.sheet_uid === sheetId);

            const imgData = await this.exportSheetToImage(sheet, sheetCuts, bladeThickness, tempDiv);

            const imgProps = doc.getImageProperties(imgData);
            const pdfImgWidth = pageWidth - 30;
            const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

            doc.setDrawColor(220, 220, 220);
            doc.rect(15, 30, pdfImgWidth, pdfImgHeight);
            doc.addImage(imgData, 'PNG', 15, 30, pdfImgWidth, pdfImgHeight);

            //TABLE 1 Dílce
            const startYPanels = 30 + pdfImgHeight + 10;

            // Nadpis
            doc.setFontSize(10);
            doc.setTextColor(...purpleColor);
            doc.setFont('helvetica', 'bold');
            doc.text(this.safeText("Dilce na teto desce:"), 15, startYPanels);

            const tableData = sheet.parts.map((p, idx) => [
                idx + 1,
                this.safeText(p.label),
                `${p.w} x ${p.h}`,
                Number(p.x).toFixed(1),
                Number(p.y).toFixed(1)
            ]);

            doc.autoTable({
                startY: startYPanels + 3,
                head: [['ID', 'Nazev dilu', 'Rozmer (mm)', 'X', 'Y']],
                body: tableData,
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', valign: 'middle' },
                headStyles: { fillColor: purpleColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'left' },
                    1: { halign: 'left' },
                    2: { halign: 'left' },
                    3: { halign: 'left', cellWidth: 20 },
                    4: { halign: 'left', cellWidth: 20 }
                },
                margin: { left: 15, right: 15 },
                didDrawPage: renderFooter
            });


            if (sheetCuts.length > 0) {
                const finalY = doc.lastAutoTable.finalY;

                // Nadpis 
                doc.setFontSize(10);
                doc.setTextColor(...purpleColor);
                doc.setFont('helvetica', 'bold');
                doc.text(this.safeText("Rezy na teto desce:"), 15, finalY + 10);

                const cutsData = sheetCuts.map((c, idx) => {
                    const isVertical = Math.abs(c.x1 - c.x2) < 0.1;
                    const type = isVertical ? 'Svisly' : 'Vodorovny';

                    const startPoint = `${Math.round(c.x1)},${Math.round(c.y1)}`;
                    const endPoint = `${Math.round(c.x2)},${Math.round(c.y2)}`;

                    return [
                        idx + 1,
                        this.safeText(type),
                        startPoint,
                        endPoint,
                        Number(c.length).toFixed(1)
                    ];
                });

                doc.autoTable({
                    startY: finalY + 13,
                    // Hlavička bez prázdného sloupce pro šipku
                    head: [['#', 'Typ rezu', 'Start (X,Y)', 'Konec (X,Y)', 'Delka (mm)']],
                    body: cutsData,
                    theme: 'striped',
                    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', valign: 'middle' },
                    headStyles: { fillColor: purpleColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'left' },
                        1: { cellWidth: 25, halign: 'left' },
                        2: { halign: 'left' }, // Start
                        3: { halign: 'left' }, // Konec
                        4: { halign: 'left' }  // Délka
                    },
                    margin: { left: 15, right: 15 },
                    didDrawPage: renderFooter
                });
            }
        }

        //statistika
        doc.addPage();

        doc.setFillColor(...purpleColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(this.safeText("Statistika Projektu"), 15, 25);

        let currentY = 55;

        const drawStatBlock = (label, value, unit, x, y, width) => {
            doc.setDrawColor(...purpleColor);
            doc.setLineWidth(0.5);
            doc.line(x, y, x + width, y);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text(this.safeText(label), x, y + 7);

            doc.setFontSize(14);
            doc.setTextColor(...purpleColor);
            doc.setFont('helvetica', 'bold');
            doc.text(`${value} ${unit}`, x, y + 16);
        };


        const colW = (pageWidth - 40) / 3;
        drawStatBlock("Vyuziti", stats.utilization, "%", 15, currentY, colW);
        drawStatBlock("Počet desek", stats.sheetCount, "ks", 15 + colW + 5, currentY, colW);
        drawStatBlock("Tloušťka řezu", stats.bladeThickness, "mm", 15 + (colW + 5) * 2, currentY, colW);

        currentY += 25;

        drawStatBlock("Plocha dílců", stats.totalPartsArea, "m2", 15, currentY, colW);
        drawStatBlock("Celková délka řezů", stats.totalCutLength, "m", 15 + colW + 5, currentY, colW);
        drawStatBlock("Počet řezů", stats.cutCount, "", 15 + (colW + 5) * 2, currentY, colW);

        currentY += 35;

        doc.setFillColor(248, 249, 250);
        doc.rect(15, currentY, pageWidth - 30, 55, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.rect(15, currentY, pageWidth - 30, 55, 'D');

        doc.setFontSize(12);
        doc.setTextColor(...purpleColor);
        doc.text(this.safeText("Odhadovane naklady"), 20, currentY + 10);

        const drawPriceRow = (label, price, y) => {
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'normal');
            doc.text(this.safeText(label), 20, y);
            doc.setFont('helvetica', 'bold');
            doc.text(`${Number(price).toFixed(2)} Kc`, pageWidth - 20, y, { align: 'right' });
        };


        drawPriceRow("Naklady na material (cele desky):", stats.totalMaterialSheetCost, currentY + 20);
        drawPriceRow("Naklady na olepeni hran:", stats.totalEdgebandCost, currentY + 28);
        const laborLabel = `Naklady na rezani (Sazba: ${stats.cuttingRate} Kc/m):`;
        drawPriceRow(laborLabel, stats.laborCost, currentY + 36);

        doc.setDrawColor(...purpleColor);
        doc.setLineWidth(0.5);
        doc.line(20, currentY + 41, pageWidth - 20, currentY + 41);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        const totalProjectCost = stats.totalMaterialSheetCost + stats.totalEdgebandCost + stats.laborCost;
        drawPriceRow("CELKEM:", totalProjectCost, currentY + 48);

        renderFooter();

        // deatil materialu
        doc.addPage();

        doc.setFillColor(...purpleColor);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(this.safeText("Detailní rozpis materiálu"), 15, 25);

        let nextY = 55;

        // 1. TABULKA: SPOTŘEBA DESEK (Celé desky)
        if (Object.keys(stats.materialUsage).length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(...purpleColor);
            doc.text(this.safeText("Spotřeba materiálu pro celé desky"), 15, nextY);

            const matBody = Object.values(stats.materialUsage).map(item => [
                item.label,
                `${Number(item.area).toFixed(2)} m2`,
                `${Number(item.cost).toFixed(2)} Kc`
            ]);

            doc.autoTable({
                startY: nextY + 5,
                head: [['Materiál', 'Plocha', 'Cena']],
                body: matBody,
                theme: 'striped',
                headStyles: { fillColor: purpleColor },
                styles: { font: 'helvetica', fontSize: 10 },
                didDrawPage: renderFooter
            });
            nextY = doc.lastAutoTable.finalY + 15;
        }

        // 2. TABULKA: SPOTŘEBA HRAN
        if (Object.keys(stats.edgebandUsage).length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(...purpleColor);
            doc.text(this.safeText("Spotřeba hranovacích pásek"), 15, nextY);

            const ebBody = Object.values(stats.edgebandUsage).map(item => [
                item.label,
                `${Number(item.length).toFixed(2)} m`,
                `${Number(item.cost).toFixed(2)} Kc`
            ]);

            doc.autoTable({
                startY: nextY + 5,
                head: [['Hrana', 'Celková delka', 'Cena']],
                body: ebBody,
                theme: 'striped',
                headStyles: { fillColor: purpleColor },
                styles: { font: 'helvetica', fontSize: 10 },
                didDrawPage: renderFooter
            });
            nextY = doc.lastAutoTable.finalY + 15;
        }

        if (Object.keys(stats.materialUsageParts).length > 0) {
            if (nextY > pageHeight - 60) {
                doc.addPage();
                nextY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(...purpleColor);
            doc.text(this.safeText("Spotřeba materiálu pouze pro dílce"), 15, nextY);

            const partsBody = Object.values(stats.materialUsageParts).map(item => [
                item.label,
                `${Number(item.area).toFixed(2)} m2`,
                `${Number(item.cost).toFixed(2)} Kc`
            ]);

            doc.autoTable({
                startY: nextY + 5,
                head: [['Material', 'Plocha', 'Cena']],
                body: partsBody,
                theme: 'striped',
                headStyles: { fillColor: purpleColor },
                styles: { font: 'helvetica', fontSize: 10 },
                didDrawPage: renderFooter
            });
        }

        renderFooter();

        document.body.removeChild(tempDiv);
        return doc;
    },

    exportSheetToImage(sheet, sheetCuts, bladeThickness, container) {
        const exportWidth = 1600;
        const exportHeight = 1000;

        const stage = new Konva.Stage({
            container: container,
            width: exportWidth,
            height: exportHeight
        });

        const layer = new Konva.Layer();
        stage.add(layer);

        const bg = new Konva.Rect({
            width: exportWidth,
            height: exportHeight,
            fill: 'white'
        });
        layer.add(bg);

        const layout = KonvaRenderer.calculateLayout(
            { offsetWidth: exportWidth, offsetHeight: exportHeight },
            sheet.width,
            sheet.height,
            80
        );

        layer.add(KonvaRenderer.createSheet(sheet.width, sheet.height, layout));
        layer.add(KonvaRenderer.createSheetDimensions(sheet.width, sheet.height, layout));
        layer.add(KonvaRenderer.createGrid(sheet.width, sheet.height, layout));

        sheet.parts.forEach(part => {
            const group = KonvaRenderer.createPart(part, layout, false);
            layer.add(group);
        });

        sheetCuts.forEach(cut => {
            const cutLine = KonvaRenderer.createCutLine(cut, layout, bladeThickness);
            layer.add(cutLine);
        });

        layer.draw();

        const data = stage.toDataURL({ pixelRatio: 1 });
        stage.destroy();
        return data;
    }
};