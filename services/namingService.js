const fs = require('fs');
const path = require('path');

const RESGISTRY_FILE = path.join(__dirname, '../data/serviceRegistry.json');

function loadRegistry() {
    if (!fs.existsSync(RESGISTRY_FILE)) {
        fs.writeFileSync(RESGISTRY_FILE, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(RESGISTRY_FILE, 'utf8'));
}

function saveRegistry(registry) {
    fs.writeFileSync(RESGISTRY_FILE, JSON.stringify(registry, null, 2));
}


function registerService(service) {
    const registry = loadRegistry();

    const existingIndex = registry.findIndex(
        item => item.serviceName === service.serviceName
    );

    if (existingIndex >= 0) {
        registry[existingIndex] = service;
    } else {
        registry.push(service);
    }

    saveRegistry(registry);
    console.log(`${service.serviceName} registered successfully`);
}

function discoverService(serviceName) {
    const registry = loadRegistry();

    return registry.find(service => service.serviceName === serviceName);
}

module.exports = {
    registerService,
    discoverService
};

   
