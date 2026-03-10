import { loadFromTemplates } from './api.js';

export const projectBuilder = () => ({
    selectedFurniture: [],
    selectedStock: [],
    isProjectSaving: false,

    toggleFurniture(id) {
        id = String(id);
        if (this.selectedFurniture.includes(id)) {
            this.selectedFurniture = this.selectedFurniture.filter(i => i !== id);
        } else {
            this.selectedFurniture.push(id);
        }
    },

    toggleStock(id) {
        id = String(id);
        if (this.selectedStock.includes(id)) {
            this.selectedStock = this.selectedStock.filter(i => i !== id);
        } else {
            this.selectedStock.push(id);
        }
    },

    async buildProject() {
        if (this.isProjectSaving) return;
        this.isProjectSaving = true;

        const payload = {
            furniture_ids: this.selectedFurniture,
            stock_ids: this.selectedStock
        };

        try {
            const result = await loadFromTemplates(payload);
            
            localStorage.setItem('_x_panels', JSON.stringify(result.panels || []));
            localStorage.setItem('_x_stockSheets', JSON.stringify(result.stockSheets || []));
            
            localStorage.removeItem('_x_projectId');
            localStorage.removeItem('_x_projectName');
            localStorage.removeItem('_x_optimizationResults');
            localStorage.removeItem('_x_manualLayout');

            window.location.href = window.homeUrl;

        } catch (err) {
            console.error('Build error:', err);
            alert('Could not build project: ' + err.message);
        } finally {
            this.isProjectSaving = false;
        }
    }
});
