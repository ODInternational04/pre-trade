const { searchExistingClient } = require('../../lib/sharepoint');

module.exports = async function (context, req) {
    context.log('Check duplicate endpoint called');
    context.log('Request method:', req.method);
    context.log('Request body:', JSON.stringify(req.body));
    
    // Check critical environment variables
    const requiredEnvVars = [
        'EMAIL_TENANT_ID',
        'EMAIL_CLIENT_ID', 
        'EMAIL_CLIENT_SECRET',
        'SHAREPOINT_SITE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        context.log('Missing environment variables:', missingVars);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                error: `Server configuration incomplete. Missing environment variables: ${missingVars.join(', ')}. Please configure these in Azure Portal → Settings → Configuration.`,
                missingVariables: missingVars
            }
        };
        return;
    }
    
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
