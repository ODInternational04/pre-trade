const formidable = require('formidable');
const fs = require('fs');
const { searchExistingClient, uploadToSharePoint } = require('../lib/sharepoint');
const { sendApprovalEmail } = require('../lib/email');
const { createClientInfoPDF } = require('../lib/pdf');
const config = require('../config');

module.exports = async function (context, req) {
    context.log('Submit endpoint called');
    
    try {
        // Parse multipart form data
        const form = formidable({
            multiples: true,
            maxFileSize: 50 * 1024 * 1024, // 50MB
        });
        
        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve([fields, files]);
            });
        });
        
        // Convert fields to simple object (formidable returns arrays)
        const formData = {};
        for (const key in fields) {
            formData[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
        }
        
        // Convert files to array
        const fileArray = [];
        for (const key in files) {
            const file = files[key];
            if (Array.isArray(file)) {
                fileArray.push(...file);
            } else {
                fileArray.push(file);
            }
        }
        
        console.log('Received form submission...');
        console.log('Number of files:', fileArray.length);
        
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
        const uploadPromises = fileArray.map(async (file) => {
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
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: error.message || 'Error processing submission'
            }
        };
    }
};
