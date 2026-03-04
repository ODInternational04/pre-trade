module.exports = async function (context, req) {
    context.log('Test endpoint called');
    
    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
            success: true,
            message: 'Azure Functions is working!',
            timestamp: new Date().toISOString(),
            environment: {
                hasEmailTenantId: !!process.env.EMAIL_TENANT_ID,
                hasEmailClientId: !!process.env.EMAIL_CLIENT_ID,
                hasEmailClientSecret: !!process.env.EMAIL_CLIENT_SECRET,
                hasSharePointUrl: !!process.env.SHAREPOINT_SITE_URL
            }
        }
    };
};
