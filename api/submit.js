const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { searchExistingClient, uploadToSharePoint } = require('../lib/sharepoint');
const { sendApprovalEmail } = require('../lib/email');
const { createClientInfoPDF, createOrUpdateTrackingPDF } = require('../lib/pdf');
const appConfig = require('../config');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Parse multipart form data
        const form = formidable({
            uploadDir: '/tmp',
            keepExtensions: true,
            multiples: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB
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
        if (files.files) {
            const filesField = Array.isArray(files.files) ? files.files : [files.files];
            fileArray.push(...filesField);
        }
        
        console.log('Received form submission...');
        
        // Create client folder name
        const clientName = formData.fullName || formData.repFullName || formData.companyRegName || 'Unknown Client';
        const timestamp = new Date().toISOString().split('T')[0];
        
        let clientFolder;
        let isResubmission = false;
        
        // Check for duplicates
        const existingClients = await searchExistingClient(clientName);
        
        if (existingClients.length > 0 && formData.allowDuplicate === 'true') {
            // This is a resubmission - use the existing folder name
            clientFolder = existingClients[0].name;
            isResubmission = true;
            console.log('Processing RESUBMISSION for existing folder:', clientFolder);
        } else if (existingClients.length > 0 && formData.allowDuplicate !== 'true') {
            // Duplicate found but not allowed to proceed
            return res.status(409).json({
                success: false,
                duplicate: true,
                message: `A client named "${clientName}" already exists`,
                existingFolders: existingClients.map(folder => ({
                    name: folder.name,
                    createdDate: folder.createdDateTime,
                    webUrl: folder.webUrl
                }))
            });
        } else {
            // New submission - create new folder name with timestamp
            clientFolder = `${clientName.replace(/[/\\?%*:|"<>]/g, '-')}_${timestamp}`;
            console.log('Processing NEW submission for:', clientFolder);
        }
        
        console.log('Number of files:', fileArray.length);
        
        // Upload all files to SharePoint
        console.log('Uploading files to SharePoint...');
        const uploadPromises = fileArray.map(file => {
            const originalName = file.originalFilename || file.newFilename;
            return uploadToSharePoint(file.filepath, originalName, clientFolder)
                .then(url => {
                    try {
                        fs.unlinkSync(file.filepath);
                    } catch (e) {
                        console.error('Error cleaning up temp file:', e);
                    }
                    console.log('✓ Uploaded:', originalName);
                    return { file: originalName, url };
                })
                .catch(error => {
                    console.error('✗ Failed to upload:', originalName, error.message);
                    try {
                        fs.unlinkSync(file.filepath);
                    } catch (e) {
                        console.error('Error cleaning up temp file:', e);
                    }
                    return { file: originalName, error: error.message };
                });
        });
        
        const uploadedFiles = await Promise.all(uploadPromises);
        
        // Get SharePoint folder link
        const successfulUpload = uploadedFiles.find(f => f.url);
        const sharePointFolderLink = successfulUpload
            ? successfulUpload.url.split('/').slice(0, -1).join('/')
            : `${appConfig.sharepoint.siteUrl}/sites/${appConfig.sharepoint.siteName}/${appConfig.sharepoint.documentLibrary}/${clientFolder}`;
        
        console.log('SharePoint folder:', sharePointFolderLink);
        
        // Create client information PDF with all form data and signature
        console.log('Creating client information PDF...');
        await createClientInfoPDF(formData, clientFolder, formData.signatureData);
        
        // Create or update tracking PDF if it's a resubmission
        if (isResubmission) {
            console.log('Creating resubmission tracking PDF...');
            await createOrUpdateTrackingPDF(clientFolder, clientName, true);
        }
        
        // Send approval email
        console.log('Sending approval email...');
        await sendApprovalEmail(
            clientName,
            formData.applicationType || 'Business',
            sharePointFolderLink,
            clientFolder
        );
        
        res.json({
            success: true,
            message: 'Application submitted successfully',
            clientFolder,
            uploadedFiles,
            sharePointLink: sharePointFolderLink
        });
        
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing submission: ' + error.message
        });
    }
};

// Disable body parsing for formidable
module.exports.config = {
    api: {
        bodyParser: false
    }
};
