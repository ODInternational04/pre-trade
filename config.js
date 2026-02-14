// Configuration for IBV Gold Pre-Trade Application System
// Uses environment variables to keep secrets secure
require('dotenv').config();

module.exports = {
    // SharePoint Configuration
    sharepoint: {
        siteUrl: process.env.SHAREPOINT_SITE_URL || 'https://ibvza.sharepoint.com/sites/AINexGen',
        tenantId: process.env.SHAREPOINT_TENANT_ID,
        clientId: process.env.SHAREPOINT_CLIENT_ID,
        clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
        documentLibrary: process.env.SHAREPOINT_DOCUMENT_LIBRARY || 'Gold Pre-Trade Clients',
        siteName: process.env.SHAREPOINT_SITE_NAME || 'AINexGen'
    },

    // Email Configuration (Microsoft Graph API)
    email: {
        tenantId: process.env.EMAIL_TENANT_ID,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        from: process.env.EMAIL_FROM || 'infoainexgen@ibvglobal.com',
        legalTeam: process.env.EMAIL_LEGAL_TEAM || 'magenta.naidoo@ainexgensa.co.za'
    },

    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    }
};
