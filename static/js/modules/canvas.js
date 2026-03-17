export const KonvaRenderer = {
    calculateLayout(container, sheetWidth, sheetHeight, padding = 40) {
        const availableW = container.offsetWidth - (padding * 2);
        const availableH = container.offsetHeight - (padding * 2);

        const scale = Math.min(availableW / sheetWidth, availableH / sheetHeight);

        return {
            scale,
            offsetX: (container.offsetWidth - (sheetWidth * scale)) / 2,
            offsetY: (container.offsetHeight - (sheetHeight * scale)) / 2
        };
    },

    createSheet(width, height, layout) {
        return new Konva.Rect({
            x: layout.offsetX,
            y: layout.offsetY,
            width: width * layout.scale,
            height: height * layout.scale,
            fill: '#ffffff',
            stroke: '#94a3b8',
            strokeWidth: 2,
            shadowBlur: 15,
            shadowOpacity: 0.1,
            name: 'sheet-bg'
        });
    },

    createPart(part, layout, isSelected) {
        const { scale, offsetX, offsetY } = layout;
        const pw = part.w * scale;
        const ph = part.h * scale;

        const hue = (part.groupId * 137.5) % 360;
        const baseFill = `hsla(${hue}, 70%, 60%, 0.4)`;
        const selectedFill = `hsla(${hue}, 80%, 50%, 0.7)`;
        const strokeColor = `hsla(${hue}, 80%, 30%, 1)`;

        const group = new Konva.Group({
            x: offsetX + (part.x * scale),
            y: offsetY + (part.y * scale),
            draggable: true,
            uid: part.uid
        });

        // RECTANGLE
        const rect = new Konva.Rect({
            width: pw,
            height: ph,
            fill: isSelected ? selectedFill : baseFill,
            stroke: strokeColor,
            strokeWidth: 1.5,
            cornerRadius: 1,
        });

        if (part.edges) {
            const edgeStrokeWidth = 2;
            const dashPattern = [4, 4];
            const edgeColor = '#1e3a8a';

            const offset = 3;

            const sidePoints = {
                top: [offset, offset, pw - offset, offset],
                bottom: [offset, ph - offset, pw - offset, ph - offset],
                left: [offset, offset, offset, ph - offset],
                right: [pw - offset, offset, pw - offset, ph - offset]
            };

            Object.entries(part.edges).forEach(([side, hasEdge]) => {
                if (hasEdge && sidePoints[side]) {
                    const line = new Konva.Line({
                        points: sidePoints[side],
                        stroke: edgeColor,
                        strokeWidth: edgeStrokeWidth,
                        dash: dashPattern,
                        lineCap: 'round',
                        listening: false
                    });
                    group.add(line);
                }
            });
        }

        // MAIN LABEL
        const mainLabel = new Konva.Text({
            text: part.label,
            fontSize: Math.max(10, 12 * scale),
            fontStyle: 'bold',
            fontFamily: 'sans-serif',
            fill: '#1e3a8a',
            listening: false
        });

        mainLabel.offsetX(mainLabel.width() / 2);
        mainLabel.offsetY(mainLabel.height() / 2);
        mainLabel.x(pw / 2);
        mainLabel.y(ph / 2);

        // WIDTH DIMENSION
        const wText = new Konva.Text({
            text: part.w.toFixed(1),
            fontSize: Math.max(8, 9 * scale),
            fontFamily: 'sans-serif',
            fill: '#1e3a8a',
            listening: false
        });

        wText.offsetX(wText.width() / 2);
        wText.x(pw / 2);
        wText.y(2);

        // HEIGHT DIMENSION
        const hText = new Konva.Text({
            text: part.h.toFixed(1),
            fontSize: Math.max(8, 9 * scale),
            fontFamily: 'sans-serif',
            fill: '#1e3a8a',
            listening: false
        });

        hText.offsetY(hText.height() / 2);
        hText.x(4);
        hText.y(ph / 2);

        group.add(rect, mainLabel, wText, hText);
        return group;
    },

    createCutLine(cut, layout, bladeThickness) {
        const { scale, offsetX, offsetY } = layout;

        const kerf = bladeThickness || 3;
        const kerfScaled = kerf * scale;

        const isVertical = Math.abs(cut.x1 - cut.x2) < 0.1;

        let x, y, width, height;

        if (isVertical) {
            x = (cut.x1 * scale) - (kerfScaled / 2);
            y = cut.y1 * scale;
            width = kerfScaled;
            height = (cut.y2 - cut.y1) * scale;
        } else {
            x = cut.x1 * scale;
            y = (cut.y1 * scale) - (kerfScaled / 2);
            width = (cut.x2 - cut.x1) * scale;
            height = kerfScaled;
        }

        return new Konva.Rect({
            id: cut.id,
            x: offsetX + x,
            y: offsetY + y,
            width: Math.max(0.5, width),
            height: Math.max(0.5, height),
            fill: '#450a0a',
            opacity: 0.4,
            stroke: '#7f1d1d',
            strokeWidth: 0.5,
            listening: false
        });
    },

    createGrid(width, height, layout) {
        const { scale, offsetX, offsetY } = layout;
        const gridGroup = new Konva.Group({ listening: false });

        const drawLines = (step, stroke, strokeWidth, showLabels) => {
            for (let x = 0; x <= width; x += step) {
                const xPos = offsetX + (x * scale);
                gridGroup.add(new Konva.Line({
                    points: [xPos, offsetY, xPos, offsetY + (height * scale)],
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                }));

                if (showLabels && x > 0) {
                    gridGroup.add(new Konva.Text({
                        x: xPos - 10,
                        y: offsetY - 15,
                        text: x.toString(),
                        rotation: -30,
                        fontSize: Math.max(8, 9 * scale),
                        fill: '#64748b'
                    }));
                }
            }

            for (let y = 0; y <= height; y += step) {
                const yPos = offsetY + (y * scale);
                gridGroup.add(new Konva.Line({
                    points: [offsetX, yPos, offsetX + (width * scale), yPos],
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                }));

                if (showLabels && y > 0) {
                    gridGroup.add(new Konva.Text({
                        x: offsetX - 25,
                        y: yPos - 5,
                        text: y.toString(),
                        fontSize: Math.max(8, 9 * scale),
                        fill: '#64748b'
                    }));
                }
            }
        };

        drawLines(50, '#cbd5e1', 0.5, false);
        drawLines(100, '#94a3b8', 1, true);

        return gridGroup;
    },

    createSheetDimensions(width, height, layout) {
        const { scale, offsetX, offsetY } = layout;
        const group = new Konva.Group({ listening: false });
        const color = '#64748b';
        const margin = 30;

        const drawDim = (p1, p2, textValue, isVertical) => {
            const dimGroup = new Konva.Group();

            dimGroup.add(new Konva.Arrow({
                points: [p1.x, p1.y, p2.x, p2.y],
                pointerLength: 8,
                pointerWidth: 6,
                fill: color,
                stroke: color,
                strokeWidth: 1,
                pointerAtBeginning: true
            }));

            const label = new Konva.Text({
                text: `${textValue.toFixed(0)} mm`,
                fontSize: 12,
                fontStyle: 'bold',
                fill: color,
            });

            // Center the text's origin 
            label.offsetX(label.width() / 2);
            label.offsetY(label.height() / 2);

            if (isVertical) {
                label.x(p1.x + 15);
                label.y((p1.y + p2.y) / 2);
                label.rotation(90);
            } else {
                label.x((p1.x + p2.x) / 2);
                label.y(p1.y + 15);
                label.rotation(0);
            }
            dimGroup.add(label);

            return dimGroup;
        };

        group.add(drawDim(
            { x: offsetX, y: offsetY + (height * scale) + margin },
            { x: offsetX + (width * scale), y: offsetY + (height * scale) + margin },
            width,
            false
        ));

        group.add(drawDim(
            { x: offsetX + (width * scale) + margin, y: offsetY },
            { x: offsetX + (width * scale) + margin, y: offsetY + (height * scale) },
            height,
            true
        ));

        return group;
    }
};