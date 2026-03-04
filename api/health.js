module.exports = async function (context, req) {
    context.log('Health check endpoint called');
    
    const requiredEnvVars = [
        'SHAREPOINT_TENANT_ID',
        'SHAREPOINT_CLIENT_ID', 
        'SHAREPOINT_CLIENT_SECRET',
        'EMAIL_TENANT_ID',
        'EMAIL_CLIENT_ID',
        'EMAIL_CLIENT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: {
            status: 'OK',
            timestamp: new Date().toISOString(),
            env_check: missingVars.length === 0 ? 'all_present' : 'missing_vars',
            missing: missingVars.length > 0 ? missingVars : undefined,
            node_version: process.version,
            platform: 'Azure Static Web Apps'
        }
    };
};
