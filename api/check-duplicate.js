const { searchExistingClient } = require('../lib/sharepoint');

module.exports = async function (context, req) {
    context.log('Check duplicate endpoint called');
    
    try {
        const clientName = req.body?.clientName;
        
        if (!clientName) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Client name is required' }
            };
            return;
        }
        
        console.log('Checking for existing client:', clientName);
        
        const existingClients = await searchExistingClient(clientName);
        
        if (existingClients.length > 0) {
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    exists: true,
                    message: `Client "${clientName}" already exists in SharePoint`,
                    existingFolders: existingClients.map(folder => ({
                        name: folder.name,
                        createdDate: folder.createdDateTime,
                        webUrl: folder.webUrl
                    }))
                }
            };
        } else {
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    exists: false,
                    message: 'Client does not exist'
                }
            };
        }
        
    } catch (error) {
        console.error('Duplicate check error:', error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                error: 'Error checking for duplicate client: ' + error.message
            }
        };
    }
};
