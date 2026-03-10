import { save, load } from './api.js';

export const projectManager = () => ({
    projectId: Alpine.$persist(null),
    projectName: Alpine.$persist(''),
    isProjectSaving: false,
    selectedProjectId: null,

    getLiveStorageData() {
        return {
            panels: JSON.parse(localStorage.getItem('_x_panels') || '[]'),
            stockSheets: JSON.parse(localStorage.getItem('_x_stockSheets') || '[]'),
            settings: JSON.parse(localStorage.getItem('_x_settings') || '{}'),
        };
    },

    async saveProject(newName = null) {
        if (this.isProjectSaving) return;
        this.isProjectSaving = true;

        const liveData = this.getLiveStorageData();

        const payload = {
            id: newName ? null : this.projectId,
            name: newName || this.projectName || "Unnamed Project",
            data: liveData
        };

        try {
            const result = await save(payload);
            this.projectId = result.id;
            this.projectName = result.name;
            alert(`Project "${this.projectName}" saved.`);
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            this.isProjectSaving = false;
        }
    },

    async loadProject(id) {
        if (!id) return;
        try {
            const result = await load(id);
            const d = result.data;

            this.projectId = result.id;
            this.projectName = result.name;

            localStorage.setItem('_x_panels', JSON.stringify(d.panels || []));
            localStorage.setItem('_x_stockSheets', JSON.stringify(d.stockSheets || []));
            localStorage.setItem('_x_settings', JSON.stringify(d.settings || {}));
            localStorage.setItem('_x_manualLayout', JSON.stringify(d.manualLayout || {}));

            localStorage.removeItem('_x_optimizationResults');
            localStorage.removeItem('_x_manualLayout');

            window.location.reload();
            window.location = window.homeUrl;
        } catch (err) {
            console.error('Load error:', err);
        }
    },

    resetProject() {
        if (!confirm('Start a new blank project?')) return;
        const persistKeys = [
            '_x_projectId', '_x_projectName', '_x_panels',
            '_x_stockSheets', '_x_optimizationResults',
            '_x_manualLayout', '_x_settings'
        ];
        persistKeys.forEach(key => localStorage.removeItem(key));
        window.location.reload();
        window.location = window.homeUrl;
    },

    handleProjectDeletion(deletedId) {
        const idToMatch = Number(deletedId);
        if (Number(this.selectedProjectId) === idToMatch) {
            console.log("Match found: Clearing selectedProjectId");
            this.selectedProjectId = null;
            window.location.reload();
        }
        if (Number(this.projectId) === idToMatch) {
            console.log("Match found: Resetting active project");
            this.projectId = null;
            this.projectName = '';
            window.location.reload();
        }
    },
});