const { createApprovalPDF } = require('../lib/pdf');

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
    
    try {
        const clientFolder = req.query.client;
        
        if (!clientFolder) {
            return res.status(400).send('Invalid approval link');
        }
        
        console.log('Approving application for:', clientFolder);
        
        // Create and upload approval PDF
        const approvalPdfUrl = await createApprovalPDF(clientFolder);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Application Approved - IBV Gold</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #2c5f7e 0%, #1e4a63 100%);
                    }
                    .success-box {
                        background: white;
                        padding: 50px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                        max-width: 500px;
                        animation: slideIn 0.5s ease-out;
                    }
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .checkmark {
                        font-size: 100px;
                        color: #28a745;
                        animation: scaleIn 0.5s ease-out 0.3s both;
                    }
                    @keyframes scaleIn {
                        from {
                            transform: scale(0);
                        }
                        to {
                            transform: scale(1);
                        }
                    }
                    h1 { 
                        color: #333; 
                        margin: 20px 0;
                    }
                    p {
                        color: #666;
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .client-folder {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-family: monospace;
                        color: #2c5f7e;
                    }
                    a {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 15px 35px;
                        background: #2c5f7e;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        transition: all 0.3s;
                    }
                    a:hover {
                        background: #1e4a63;
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        color: #999;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="success-box">
                    <div class="checkmark">✓</div>
                    <h1>Application Approved!</h1>
                    <p>The application has been successfully approved and the Legal Approval document has been generated.</p>
                    <div class="client-folder">${clientFolder}</div>
                    <p style="font-size: 14px; color: #666;">The approval document has been saved to the client's folder in SharePoint.</p>
                    <a href="${approvalPdfUrl}" target="_blank">📄 View Approval Document</a>
                    <div class="footer">
                        <p>IBV Gold Pre-Trade Application System</p>
                        <p>AI Nex Gen | IBV International Vaults</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Approval error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Approval Error</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        background: #f4f4f4;
                    }
                    .error-box {
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .error-icon { font-size: 60px; color: #dc3545; }
                    h1 { color: #333; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="error-box">
                    <div class="error-icon">✗</div>
                    <h1>Approval Error</h1>
                    <p>There was an error processing the approval.</p>
                    <p style="font-size: 14px; color: #999;">${error.message}</p>
                </div>
            </body>
            </html>
        `);
    }
}
