// Simple diagnostic endpoint - no external dependencies
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const diagnostics = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: 'Vercel Serverless',
            node_version: process.version,
            env_vars_present: {
                SHAREPOINT_TENANT_ID: !!process.env.SHAREPOINT_TENANT_ID,
                SHAREPOINT_CLIENT_ID: !!process.env.SHAREPOINT_CLIENT_ID,
                SHAREPOINT_CLIENT_SECRET: !!process.env.SHAREPOINT_CLIENT_SECRET,
                EMAIL_TENANT_ID: !!process.env.EMAIL_TENANT_ID,
                EMAIL_CLIENT_ID: !!process.env.EMAIL_CLIENT_ID,
                EMAIL_CLIENT_SECRET: !!process.env.EMAIL_CLIENT_SECRET,
                BASE_URL: !!process.env.BASE_URL
            },
            cwd: process.cwd(),
            platform: process.platform
        };
        
        res.status(200).json(diagnostics);
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
};
