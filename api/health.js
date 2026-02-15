const config = require('../config');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: 'Vercel Serverless',
        config: {
            sharepoint: config.sharepoint.siteUrl,
            documentLibrary: config.sharepoint.documentLibrary,
            emailFrom: config.email.from
        }
    });
}
