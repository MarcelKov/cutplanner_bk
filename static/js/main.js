import { plannerData } from './modules/plannerData.js';
import { resultsData } from './modules/resultsData.js';
import { manualPlannerData } from './modules/manualPlannerData.js';
import { projectManager } from './modules/projectManager.js';
import { projectBuilder } from './modules/projectBuilder.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('projectManager', projectManager);
    Alpine.data('plannerData', plannerData);
    Alpine.data('resultsData', resultsData);
    Alpine.data('manualPlannerData', manualPlannerData);
    Alpine.data('projectBuilder', projectBuilder);
});