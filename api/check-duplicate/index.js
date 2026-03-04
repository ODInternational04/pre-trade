const { searchExistingClient } = require('../../lib/sharepoint');

module.exports = async function (context, req) {
    context.log('Check duplicate endpoint called');
    context.log('Request method:', req.method);
    context.log('Request body:', JSON.stringify(req.body));
    context.log('Environment check - TENANT_ID exists:', !!process.env.TENANT_ID);
    context.log('Environment check - CLIENT_ID exists:', !!process.env.CLIENT_ID);
    
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
        context.log('Full error:', error);
        context.log('Error stack:', error.stack);
        context.log('Error name:', error.name);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                error: 'Error checking for duplicate client: ' + error.message,
                stack: error.stack,
                name: error.name
            }
        };
    }
};
