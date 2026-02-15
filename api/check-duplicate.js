const { searchExistingClient } = require('../lib/sharepoint');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { clientName } = req.body;
        
        if (!clientName) {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        console.log('Checking for existing client:', clientName);
        
        const existingClients = await searchExistingClient(clientName);
        
        if (existingClients.length > 0) {
            res.json({
                exists: true,
                message: `Client "${clientName}" already exists in SharePoint`,
                existingFolders: existingClients.map(folder => ({
                    name: folder.name,
                    createdDate: folder.createdDateTime,
                    webUrl: folder.webUrl
                }))
            });
        } else {
            res.json({
                exists: false,
                message: 'Client does not exist'
            });
        }
        
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({
            error: 'Error checking for duplicate client: ' + error.message
        });
    }
}
