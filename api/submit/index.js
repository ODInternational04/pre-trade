const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { searchExistingClient, uploadToSharePoint } = require('../lib/sharepoint');
const { sendApprovalEmail } = require('../lib/email');
const { createClientInfoPDF } = require('../lib/pdf');
const config = require('../config');

module.exports = async function (context, req) {
    context.log('Submit endpoint called');
    context.log('Request method:', req.method);
    context.log('Request headers:', JSON.stringify(req.headers));
    
    // Check critical environment variables
    const requiredEnvVars = [
        'EMAIL_TENANT_ID',
        'EMAIL_CLIENT_ID', 
        'EMAIL_CLIENT_SECRET',
        'SHAREPOINT_SITE_URL',
        'EMAIL_FROM',
        'EMAIL_LEGAL_TEAM'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        context.log('Missing environment variables:', missingVars);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: `Server configuration incomplete. Missing environment variables: ${missingVars.join(', ')}. Please configure these in Azure Portal → Settings → Configuration.`,
                missingVariables: missingVars
            }
        };
        return;
    }
    
    try {
        context.log('Starting form parse with Busboy...');
        context.log('Content-Type:', req.headers['content-type']);
        
        // Parse multipart form data using busboy
        const fields = {};
        const files = [];
        
        await new Promise((resolve, reject) => {
            const busboy = Busboy({ 
                headers: req.headers,
                limits: {
                    fileSize: 50 * 1024 * 1024 // 50MB
                }
            });
            
            busboy.on('field', (fieldname, value) => {
                context.log(`Field [${fieldname}]: ${value.substring(0, 100)}`);
                fields[fieldname] = value;
            });
            
            busboy.on('file', (fieldname, fileStream, info) => {
                const { filename, encoding, mimeType } = info;
                context.log(`File [${fieldname}]: ${filename}, type: ${mimeType}`);
                
                // Save file to temp directory
                const tmpDir = os.tmpdir();
                const filepath = path.join(tmpDir, `${Date.now()}-${filename}`);
                const writeStream = fs.createWriteStream(filepath);
                
                fileStream.pipe(writeStream);
                
                writeStream.on('close', () => {
                    files.push({
                        fieldname,
                        originalFilename: filename,
                        filepath,
                        mimetype: mimeType,
                        size: fs.statSync(filepath).size
                    });
                });
                
                writeStream.on('error', (err) => {
                    context.log('File write error:', err);
                    reject(err);
                });
            });
            
            busboy.on('finish', () => {
                context.log(`Busboy finished. Fields: ${Object.keys(fields).length}, Files: ${files.length}`);
                resolve();
            });
            
            busboy.on('error', (err) => {
                context.log('Busboy error:', err);
                reject(err);
            });
            
            // Write request body to busboy
            if (req.body) {
                busboy.write(req.body);
                busboy.end();
            } else if (req.rawBody) {
                busboy.write(req.rawBody);
                busboy.end();
            } else {
                reject(new Error('No request body available'));
            }
        });
        
        const formData = fields;
        
        console.log('Received form submission...');
        console.log('Number of files:', files.length);
        
        // Create client folder name
        const clientName = formData.fullName || formData.repFullName || formData.companyRegName || 'Unknown Client';
        const timestamp = new Date().toISOString().split('T')[0];
        
        let clientFolder;
        let isResubmission = false;
        
        // Check for duplicates
        const existingClients = await searchExistingClient(clientName);
        
        if (existingClients.length > 0 && formData.allowDuplicate === 'true') {
            // This is a resubmission
            clientFolder = existingClients[0].name;
            isResubmission = true;
            console.log('Processing RESUBMISSION for existing folder:', clientFolder);
        } else if (existingClients.length > 0 && formData.allowDuplicate !== 'true') {
            // Duplicate found but not allowed
            context.res = {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    success: false,
                    duplicate: true,
                    message: `A client named "${clientName}" already exists`,
                    existingFolders: existingClients.map(folder => ({
                        name: folder.name,
                        createdDate: folder.createdDateTime,
                        webUrl: folder.webUrl
                    }))
                }
            };
            return;
        } else {
            // New submission
            clientFolder = `${clientName.replace(/[/\\?%*:|"<>]/g, '-')}_${timestamp}`;
            console.log('Processing NEW submission for:', clientFolder);
        }
        
        // Upload all files to SharePoint
        console.log('Uploading files to SharePoint...');
        const uploadPromises = files.map(async (file) => {
            try {
                const originalName = file.originalFilename || file.newFilename;
                const fileBuffer = fs.readFileSync(file.filepath);
                
                const url = await uploadToSharePoint(fileBuffer, originalName, clientFolder);
                
                // Clean up temp file
                fs.unlinkSync(file.filepath);
                
                console.log('✓ Uploaded:', originalName);
                return { file: originalName, url };
            } catch (error) {
                console.error('✗ Failed to upload:', file.originalFilename, error.message);
                
                // Clean up temp file even on error
                try {
                    fs.unlinkSync(file.filepath);
                } catch (e) {
                    // Ignore cleanup errors
                }
                
                return { file: file.originalFilename, error: error.message };
            }
        });
        
        const uploadedFiles = await Promise.all(uploadPromises);
        
        // Get SharePoint folder link
        const successfulUpload = uploadedFiles.find(f => f.url);
        const sharePointFolderLink = successfulUpload
            ? successfulUpload.url.split('/').slice(0, -1).join('/')
            : `${config.sharepoint.siteUrl}/sites/${config.sharepoint.siteName}/${config.sharepoint.documentLibrary}/${clientFolder}`;
        
        console.log('SharePoint folder:', sharePointFolderLink);
        
        // Create client information PDF
        console.log('Creating client information PDF...');
        await createClientInfoPDF(formData, clientFolder, formData.signatureData);
        
        // Send approval email
        console.log('Sending approval email...');
        await sendApprovalEmail(
            clientName,
            formData.applicationType || 'Business',
            sharePointFolderLink,
            clientFolder
        );
        
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
                success: true,
                message: 'Application submitted successfully',
                clientFolder,
                uploadedFiles,
                sharePointLink: sharePointFolderLink,
                isResubmission
            }
        };
        
    } catch (error) {
        console.error('Submission error:', error);
        context.log('Full error:', error);
        context.log('Error stack:', error.stack);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: error.message || 'Error processing submission',
                details: error.stack
            }
        };
    }
};
