function calculateLayout(sheet, containerWidth, containerHeight) {
    const padding = 0.9;
    const scale = Math.min(
        (containerWidth * padding) / sheet.width,
        (containerHeight * padding) / sheet.length
    );

    return {
        scale: scale,
        xOffset: (containerWidth - sheet.width * scale) / 2,
        yOffset: (containerHeight - sheet.length * scale) / 2
    };
}

function drawSheetBackground(layer, sheet, layout) {
    const background = new Konva.Rect({
        x: layout.xOffset,
        y: layout.yOffset,
        width: sheet.width * layout.scale,
        height: sheet.length * layout.scale,
        fill: 'white',
        stroke: '#cbd5e1',
        strokeWidth: 2,
        shadowColor: 'black',
        shadowBlur: 4,
        shadowOpacity: 0.1
    });
    layer.add(background);
}

function drawParts(layer, parts, layout) {
    if (!parts || !Array.isArray(parts)) return;

    parts.forEach(function(part) {
        const rect = new Konva.Rect({
            x: layout.xOffset + (part.x * layout.scale),
            y: layout.yOffset + (part.y * layout.scale),
            width: part.w * layout.scale,
            height: part.h * layout.scale,
            fill: '#3b82f622',
            stroke: '#2563eb',
            strokeWidth: 1.5,
        });
        layer.add(rect);
    });
}


function renderSheet(sheet, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !sheet || !sheet.width) return null;

    const width = container.offsetWidth || 600;
    const height = container.offsetHeight || 600;

    const layout = calculateLayout(sheet, width, height);

    const stage = new Konva.Stage({
        container: containerId,
        width: width,
        height: height
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    drawSheetBackground(layer, sheet, layout);
    drawParts(layer, sheet.parts, layout);

    layer.draw();
    return stage;
}

export {renderSheet}