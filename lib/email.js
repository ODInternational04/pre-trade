const { getGraphClient } = require('./sharepoint');
const config = require('../config');

// Send approval email via Microsoft Graph
async function sendApprovalEmail(clientName, applicationType, sharePointLink, clientFolder) {
    try {
        const client = await getGraphClient();
        
        const approvalUrl = `${config.server.baseUrl}/api/approve?client=${encodeURIComponent(clientFolder)}`;
        
        const message = {
            subject: `🔔 New ${applicationType} Application for Approval - ${clientName}`,
            body: {
                contentType: 'HTML',
                content: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #2c5f7e 0%, #1e4a63 100%); color: white; padding: 40px 30px; text-align: center; }
                            .header h1 { margin: 0; font-size: 28px; }
                            .content { padding: 30px; }
                            .info-box { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2c5f7e; }
                            .info-box p { margin: 8px 0; }
                            .info-box strong { color: #2c5f7e; }
                            .button-container { text-align: center; margin: 30px 0; }
                            .button { display: inline-block; padding: 16px 40px; margin: 10px; background: #28a745; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(40, 167, 69, 0.3); transition: all 0.3s; }
                            .button:hover { background: #218838; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(40, 167, 69, 0.4); }
                            .button-secondary { background: #2c5f7e; box-shadow: 0 4px 10px rgba(44, 95, 126, 0.3); }
                            .button-secondary:hover { background: #1e4a63; }
                            .note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                            .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 12px; border-top: 1px solid #dee2e6; }
                            .footer p { margin: 5px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>📋 New Application Requires Approval</h1>
                            </div>
                            <div class="content">
                                <h2 style="color: #2c5f7e; margin-top: 0;">Application Details</h2>
                                <div class="info-box">
                                    <p><strong>Client Name:</strong> ${clientName}</p>
                                    <p><strong>Application Type:</strong> ${applicationType}</p>
                                    <p><strong>Submission Date:</strong> ${new Date().toLocaleString('en-ZA', { 
                                        dateStyle: 'full', 
                                        timeStyle: 'short',
                                        timeZone: 'Africa/Johannesburg'
                                    })}</p>
                                    <p><strong>Folder Name:</strong> ${clientFolder}</p>
                                </div>
                                
                                <p style="font-size: 16px;">A new ${applicationType.toLowerCase()} application has been submitted and requires your review and approval.</p>
                                
                                <div class="button-container">
                                    <a href="${sharePointLink}" class="button button-secondary">📁 View Documents in SharePoint</a>
                                    <br>
                                    <a href="${approvalUrl}" class="button">✅ APPROVE APPLICATION</a>
                                </div>
                                
                                <div class="note">
                                    <p style="margin: 0;"><strong>⚠️ Important:</strong> Please review all documents in SharePoint before approving. Once approved, a Legal Approval PDF will be automatically generated and saved to the client's folder.</p>
                                </div>
                            </div>
                            <div class="footer">
                                <p><strong>IBV Gold Pre-Trade Application System</strong></p>
                                <p>AI Nex Gen | IBV International Vaults</p>
                                <p style="color: #999; margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: config.email.legalTeam
                    }
                }
            ]
        };

        await client.api(`/users/${config.email.from}/sendMail`)
            .post({ message });
        
        console.log('✓ Approval email sent successfully to:', config.email.legalTeam);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

module.exports = {
    sendApprovalEmail
};
