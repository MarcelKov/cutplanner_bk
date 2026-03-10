import { KonvaRenderer } from './canvas.js';

export const PDFExporter = {
    async generate(sheets, fileName = "Cutting_Plan") {

        const validSheets = sheets.filter(s => s.parts && s.parts.length > 0);
        if (validSheets.length === 0) {
            alert("No parts have been placed on any sheets yet!");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        for (let i = 0; i < validSheets.length; i++) {
            const sheet = sheets[i];
            if (i > 0) doc.addPage();
            doc.setFontSize(16);
            doc.text(`Sheet: ${sheet.label || sheet.groupLabel}`, 15, 20);
            doc.setFontSize(10);
            doc.text(`Dimensions: ${sheet.width} x ${sheet.height} mm`, 15, 28);

            const imgData = await this.exportSheetToImage(sheet, tempDiv);

            const imgProps = doc.getImageProperties(imgData);
            const pdfImgWidth = pageWidth - 30;
            const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

            doc.addImage(imgData, 'PNG', 15, 35, pdfImgWidth, pdfImgHeight);

            let currentY = 35 + pdfImgHeight + 15;
            doc.setFontSize(12);
            doc.text("Parts on this sheet:", 15, currentY);
            currentY += 8;

            doc.setFontSize(9);
            sheet.parts.forEach((p, pIdx) => {
                const posX = Number(p.x).toFixed(1);
                const posY = Number(p.y).toFixed(1);

                const safeLabel = p.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
                const partInfo = `${pIdx + 1}. ${safeLabel} (${p.w}x${p.h} mm) - Position: [${posX}, ${posY}]`;

                doc.text(partInfo, 20, currentY);
                
                currentY += 6;

                if (currentY > 280) {
                    doc.addPage();
                    currentY = 20;
                }
            });
        }


        doc.setProperties({
            title: fileName
        });
        window.open(doc.output('bloburl'), '_blank');

        document.body.removeChild(tempDiv);
    },

    exportSheetToImage(sheet, container) {
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

        layer.draw();

        const data = stage.toDataURL({ pixelRatio: 1 });
        stage.destroy();
        return data;
    }
};