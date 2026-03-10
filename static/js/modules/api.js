const getHeaders = () => {
    const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
    const headers = { 'Content-Type': 'application/json' };
    if (csrfElement) {
        headers['X-CSRFToken'] = csrfElement.value;
    }
    return headers;
};

async function save(payload) {
    const response = await fetch('/api/save-project', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData.detail) || 'Save failed');
    }
    return response.json();
}

async function load(id) {
    const response = await fetch(`/api/project/${id}`);
    if (!response.ok) throw new Error('Failed to load project');
    return response.json();
}

async function optimize(payload) {
    const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Optimization error");
    }
    return response.json();
}

async function loadFromTemplates(payload) {
    const response = await fetch('/api/create-from-templates', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create project from templates');
    }
    return response.json(); 
}


export { save, load, optimize ,loadFromTemplates};