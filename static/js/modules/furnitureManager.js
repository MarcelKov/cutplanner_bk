import { pasteFurniture, createFurniture } from './api.js';

export const furnitureManager = () => ({
    copiedFurnitureId: null,
    selectedFurniture: null,

    tab: 'simple',
    name: '',
    materialId: '',
    height: 720,
    width: 600,
    depth: 500,
    shelves: 2,
    openFront: true,

    copy(id) {
        this.copiedFurnitureId = id;
    },

    async paste(targetId) {
        if (!this.copiedFurnitureId) return;

        try {
            await pasteFurniture(this.copiedFurnitureId, targetId);

            const el = document.getElementById(`furn-item-${targetId}`);
            if (el) {
                htmx.trigger(el, 'refresh-detail');
            }

            this.copiedFurnitureId = null;
        } catch (error) {
            console.error("Paste error:", error);
            alert("Nepodařilo se vložit dílce: " + error.message);
        }
    },
    async submitCreate() {
        try {
            const payload = {
                name: this.name,
                h: this.tab === 'generator' ? parseInt(this.height) : null,
                w: this.tab === 'generator' ? parseInt(this.width) : null,
                d: this.tab === 'generator' ? parseInt(this.depth) : null,
                material_id: this.tab === 'generator' ? parseInt(this.materialId) : null,
                shelves: this.tab === 'generator' ? parseInt(this.shelves) : 0,
                openFront: this.openFront
            };

            await createFurniture(payload);

            const modal = document.getElementById('furniture_add_modal');
            if (modal) modal.close();

            this.name = '';

            htmx.trigger('#furniture-list', 'refresh-list');

        } catch (error) {
            alert("Error while creating furniture");
        }
    }
});