const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Fonctions utilitaires JSON ---
function loadJSON(file) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(file.endsWith('logs.json') ? [] : {}));
        }
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return file.endsWith('logs.json') ? [] : {};
    }
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- API : Récupérer l'état du stock ---
app.get('/api/stock', (req, res) => {
    const stock = loadJSON('./stock.json');
    const result = {};
    for (const service in stock) {
        result[service] = {
            count: stock[service].length,
            status: stock[service].length > 0 ? 'En stock' : 'Épuisé'
        };
    }
    res.json(result);
});

// --- API : Générer un compte ---
app.post('/api/gen', (req, res) => {
    const { service } = req.body;
    if (!service) {
        return res.status(400).json({ error: 'Service non spécifié.' });
    }

    const serviceName = service.toLowerCase().trim();
    const stock = loadJSON('./stock.json');

    if (!stock[serviceName] || stock[serviceName].length === 0) {
        return res.status(404).json({ error: `Le service ${serviceName} est actuellement hors stock.` });
    }

    const account = stock[serviceName].shift();
    saveJSON('./stock.json', stock);

    // Enregistrement des logs
    const logs = loadJSON('./logs.json');
    logs.push({
        service: serviceName,
        account: account,
        date: new Date().toLocaleString('fr-FR')
    });
    saveJSON('./logs.json', logs);

    res.json({ success: true, service: serviceName, account: account });
});

// --- API : Administration (Ajout de stock) ---
app.post('/api/admin/add', (req, res) => {
    const { service, accounts, password } = req.body;

    // Mot de passe de secours simple pour l'admin (modifiable)
    if (password !== 'shack2026') {
        return res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
    }

    if (!service || !accounts || !Array.isArray(accounts)) {
        return res.status(400).json({ error: 'Données invalides.' });
    }

    const serviceName = service.toLowerCase().trim();
    const stock = loadJSON('./stock.json');

    if (!stock[serviceName]) stock[serviceName] = [];
    stock[serviceName].push(...accounts.filter(a => a.length > 0));

    saveJSON('./stock.json', stock);

    res.json({ success: true, count: stock[serviceName].length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Shack Web] Serveur lancé sur le port ${PORT}`));
                           
