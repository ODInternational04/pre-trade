const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const PDFDocument = require('pdfkit');
const config = require('./config');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Note: Static files will be served by Vercel, not this backend
app.use((req, res, next) => {
    // Allow requests from frontend (Vercel) and localhost for testing
    const allowedOrigins = [config.server.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Azure AD MSAL Configuration
const msalConfig = {
    auth: {
        clientId: config.email.clientId,
        authority: `https://login.microsoftonline.com/${config.email.tenantId}`,
        clientSecret: config.email.clientSecret
    }
};

const cca = new ConfidentialClientApplication(msalConfig);

// Get Access Token
async function getAccessToken() {
    const tokenRequest = {
        scopes: ['https://graph.microsoft.com/.default']
    };
    
    try {
        const response = await cca.acquireTokenByClientCredential(tokenRequest);
        return response.accessToken;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

// Initialize Graph Client
async function getGraphClient() {
    const accessToken = await getAccessToken();
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
}

// Get SharePoint Site ID
async function getSharePointSiteId() {
    try {
        const client = await getGraphClient();
        const hostname = 'ibvza.sharepoint.com';
        const sitePath = '/sites/AINexGen';
        
        const site = await client.api(`/sites/${hostname}:${sitePath}`).get();
        return site.id;
    } catch (error) {
        console.error('Error getting SharePoint site ID:', error);
        throw error;
    }
}

// List all drives in SharePoint site (for debugging)
async function listSharePointDrives() {
    try {
        const client = await getGraphClient();
        const siteId = await getSharePointSiteId();
        const drives = await client.api(`/sites/${siteId}/drives`).get();
        
        console.log('Available SharePoint drives:');
        drives.value.forEach(drive => {
            console.log(`  - ${drive.name} (ID: ${drive.id})`);
        });
        
        return drives.value;
    } catch (error) {
        console.error('Error listing drives:', error);
        return [];
    }
}

// Search for existing client in SharePoint
async function searchExistingClient(clientName) {
    try {
        const client = await getGraphClient();
        const siteId = await getSharePointSiteId();
        
        // Get the drive (document library)
        const drives = await client.api(`/sites/${siteId}/drives`).get();
        const targetDrive = drives.value.find(d => d.name === config.sharepoint.documentLibrary);
        
        if (!targetDrive) {
            console.log('Document library not found, no existing clients');
            return [];
        }
        
        // Get all folders in the root
        const items = await client.api(`/drives/${targetDrive.id}/root/children`).get();
        
        // Filter folders that match the client name (case-insensitive)
        const matchingFolders = items.value.filter(item => 
            item.folder && 
            item.name.toLowerCase().includes(clientName.toLowerCase())
        );
        
        return matchingFolders;
    } catch (error) {
        console.error('Error searching for existing client:', error);
        return [];
    }
}

// Upload file to SharePoint
async function uploadToSharePoint(filePath, fileName, clientFolder) {
    try {
        const client = await getGraphClient();
        const siteId = await getSharePointSiteId();
        
        // Get the drive
        const drives = await client.api(`/sites/${siteId}/drives`).get();
        const targetDrive = drives.value.find(d => d.name === config.sharepoint.documentLibrary);
        
        if (!targetDrive) {
            throw new Error('Document library not found');
        }
        
        const fileContent = fs.readFileSync(filePath);
        
        // Create folder if it doesn't exist and upload file
        const uploadPath = `/drives/${targetDrive.id}/root:/${clientFolder}/${fileName}:/content`;
        
        const response = await client.api(uploadPath)
            .put(fileContent);
        
        return response.webUrl;
    } catch (error) {
        console.error('Error uploading to SharePoint:', error);
        throw error;
    }
}

// Send approval email via Microsoft Graph
async function sendApprovalEmail(clientName, applicationType, sharePointLink, clientFolder) {
    try {
        const client = await getGraphClient();
        
        const approvalUrl = `${config.server.baseUrl}/approve?client=${encodeURIComponent(clientFolder)}`;
        
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

// Create or update tracking PDF for resubmissions
async function createOrUpdateTrackingPDF(clientFolder, clientName, isResubmission) {
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const pdfPath = path.join(__dirname, 'uploads', 'temp_tracking.pdf');
        const stream = fs.createWriteStream(pdfPath);
        
        doc.pipe(stream);
        
        // Add logo
        const logoPath = path.join(__dirname, 'IBV-Gold-1.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 18, { fit: [100, 35] });
        }
        
        doc.y = 70;
        
        // Title
        doc.fontSize(15).fillColor('#000000').font('Helvetica-Bold')
           .text('APPLICATION RESUBMISSION TRACKING', 30, doc.y, { align: 'center' });
        doc.y += 30;
        
        // Client info
        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold')
           .text('Client Name:', 30);
        doc.fontSize(9).font('Helvetica')
           .text(clientName, 30, doc.y + 5);
        doc.y += 30;
        
        // Tracking table header
        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold')
           .text('SUBMISSION HISTORY', 30);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
        doc.y += 10;
        
        // Get existing tracking data if it's a resubmission
        let trackingEntries = [];
        
        if (isResubmission) {
            try {
                const client = await getGraphClient();
                const siteId = await getSharePointSiteId();
                const drives = await client.api(`/sites/${siteId}/drives`).get();
                const targetDrive = drives.value.find(d => d.name === config.sharepoint.documentLibrary);
                
                if (targetDrive) {
                    // Try to get existing tracking PDF
                    const folderPath = `root:/${clientFolder}`;
                    const items = await client.api(`/drives/${targetDrive.id}/${folderPath}:/children`).get();
                    const trackingFile = items.value.find(item => item.name === 'Resubmission_Tracking.pdf');
                    
                    if (trackingFile) {
                        // Read existing tracking data from SharePoint
                        // For now, we'll start fresh but note it's a resubmission
                        trackingEntries.push({
                            date: new Date(trackingFile.createdDateTime).toLocaleDateString(),
                            note: 'Original submission'
                        });
                    }
                }
            } catch (error) {
                console.log('Could not retrieve existing tracking data:', error.message);
            }
        }
        
        // Add current submission
        trackingEntries.push({
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            note: isResubmission ? 'Resubmission - Information updated' : 'Initial submission'
        });
        
        // Draw tracking entries
        doc.fontSize(8).fillColor('#000000').font('Helvetica');
        trackingEntries.forEach((entry, index) => {
            doc.font('Helvetica-Bold').text(`${index + 1}. `, 30, doc.y, { continued: true });
            doc.font('Helvetica').text(`${entry.date} - ${entry.note}`);
            doc.y += 15;
        });
        
        doc.y += 20;
        
        // Footer note
        doc.fontSize(7).fillColor('#000000').font('Helvetica-Oblique')
           .text('This document tracks all submission and resubmission dates for compliance purposes.', 30, doc.y, {
               width: doc.page.width - 60,
               align: 'center'
           });
        
        doc.end();
        
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
        
        console.log('✓ Tracking PDF created');
        
        // Upload to SharePoint
        await uploadToSharePoint(pdfPath, 'Resubmission_Tracking.pdf', clientFolder);
        console.log('✓ Tracking PDF uploaded to SharePoint');
        
        // Clean up
        fs.unlinkSync(pdfPath);
        
    } catch (error) {
        console.error('Error creating tracking PDF:', error);
        throw error;
    }
}

// Create client information PDF with all submitted data
async function createClientInfoPDF(formData, clientFolder, signatureDataUrl) {
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const pdfPath = path.join(__dirname, 'uploads', 'temp_client_info.pdf');
        
        // Ensure uploads directory exists
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
        }
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        // Logo in top left corner
        const logoPath = path.join(__dirname, 'IBV-Gold-1.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 18, { width: 100, fit: [100, 35] });
        }
        
        doc.y = 35;
        
        // Title - simple black text
        const applicationType = formData.applicantType === 'individual' ? 'INDIVIDUAL' : 'BUSINESS';
        doc.fontSize(15).fillColor('#000000').font('Helvetica-Bold').text('PRE-TRADE APPLICATION', { align: 'center' });
        doc.fontSize(10).fillColor('#000000').font('Helvetica').text(applicationType, { align: 'center' });
        
        doc.y += 12;
        
        // Submission info
        doc.fontSize(8).fillColor('#000000').font('Helvetica');
        const submissionDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
        doc.text(`Submission Date: ${submissionDate}     Client Folder: ${clientFolder}`, { align: 'center' });
        
        doc.y += 14;
        
        // Helper function for compact two-column layout
        const addCompactSection = (title, data, startY) => {
            doc.y = startY;
            doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text(title, 30);
            doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
            doc.y += 6;
            
            const leftX = 30;
            const rightX = doc.page.width / 2 + 10;
            const columnWidth = (doc.page.width / 2) - 40;
            let currentColumn = 'left';
            let leftY = doc.y;
            let rightY = doc.y;
            
            doc.fontSize(8).fillColor('#000000').font('Helvetica');
            
            Object.entries(data).forEach(([key, value], index) => {
                if (value && key !== 'signature' && key !== 'signatureData' && key !== 'allowDuplicate' && key !== 'applicationType') {
                    const label = key.replace(/([A-Z])/g, ' $1').toUpperCase().trim().replace(/_/g, ' ');
                    const displayValue = Array.isArray(value) ? value.join(', ') : value;
                    
                    if (currentColumn === 'left') {
                        doc.font('Helvetica-Bold').text(`${label}:`, leftX, leftY, { width: columnWidth, continued: false });
                        leftY += 9;
                        doc.font('Helvetica').text(displayValue, leftX + 2, leftY, { width: columnWidth - 2 });
                        leftY += 12;
                        currentColumn = 'right';
                    } else {
                        doc.font('Helvetica-Bold').text(`${label}:`, rightX, rightY, { width: columnWidth, continued: false });
                        rightY += 9;
                        doc.font('Helvetica').text(displayValue, rightX + 2, rightY, { width: columnWidth - 2 });
                        rightY += 12;
                        currentColumn = 'left';
                    }
                }
            });
            
            return Math.max(leftY, rightY) + 3;
        };
        
        let currentY = doc.y;
        
        // Add form data sections based on type
        if (formData.applicantType === 'individual') {
            currentY = addCompactSection('APPLICANT DETAILS', {
                fullName: formData.fullName,
                idNumber: formData.idNumber,
                mobile: formData.mobile,
                email: formData.email,
                residentialAddress: formData.residentialAddress,
                residency: formData.residency
            }, currentY);
            
            if (formData.employmentStatus || formData.employer) {
                currentY = addCompactSection('PROFESSION DETAILS', {
                    employmentStatus: formData.employmentStatus,
                    employer: formData.employer,
                    occupation: formData.occupation,
                    sourceOfFunds: formData.sourceOfFunds
                }, currentY);
            }
            
            currentY = addCompactSection('BANKING DETAILS', {
                bankName: formData.bankName,
                accountHolder: formData.accountHolder,
                accountNumber: formData.accountNumber,
                branchCode: formData.branchCode,
                swift: formData.swift
            }, currentY);
            
            if (formData.transactionSize) {
                currentY = addCompactSection('TRANSACTION INFORMATION', {
                    transactionSize: formData.transactionSize,
                    purpose: formData.purpose
                }, currentY);
            }
        } else {
            currentY = addCompactSection('REPRESENTATIVE DETAILS', {
                repFullName: formData.repFullName,
                repIdNumber: formData.repIdNumber,
                repMobile: formData.repMobile,
                repEmail: formData.repEmail
            }, currentY);
            
            currentY = addCompactSection('ENTITY DETAILS', {
                entityName: formData.entityName,
                registrationNumber: formData.registrationNumber,
                entityType: formData.entityType,
                registeredAddress: formData.registeredAddress
            }, currentY);
            
            currentY = addCompactSection('BANKING DETAILS', {
                bankName: formData.bankName,
                accountHolder: formData.accountHolder,
                accountNumber: formData.accountNumber,
                branchCode: formData.branchCode,
                swift: formData.swift
            }, currentY);
        }
        
        // PEP Declaration - compact
        doc.y = currentY;
        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text('PEP DECLARATION', 30);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
        doc.y += 6;
        
        doc.fontSize(8).fillColor('#000000').font('Helvetica');
        const pepData = [
            `Foreign PEP: ${formData.pep_foreign || formData.foreignPep || 'No'}`,
            `Domestic PEP: ${formData.pep_domestic || formData.domesticPep || 'No'}`,
            `Prominent Person: ${formData.pep_prominent || formData.familyPep || 'No'}`
        ].join('  |  ');
        doc.text(pepData, 30);
        doc.y += 10;
        
        // Add PEP Details if any exist
        const hasPepDetails = formData.pep_position_1 || formData.pep_position_2;
        if (hasPepDetails) {
            doc.y += 5;
            doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold').text('PEP Details:', 30);
            doc.y += 6;
            
            doc.fontSize(7).fillColor('#000000').font('Helvetica');
            
            // Check for up to 5 PEP entries (common case is 2, but allow for dynamically added rows)
            for (let i = 1; i <= 5; i++) {
                const position = formData[`pep_position_${i}`];
                const organisation = formData[`pep_organisation_${i}`];
                const relationship = formData[`pep_relationship_${i}`];
                const period = formData[`pep_period_${i}`];
                
                if (position || organisation || relationship || period) {
                    doc.font('Helvetica-Bold').text(`Entry ${i}:`, 30, doc.y);
                    doc.y += 8;
                    
                    if (position) {
                        doc.font('Helvetica-Bold').text('Position: ', 35, doc.y, { continued: true });
                        doc.font('Helvetica').text(position);
                        doc.y += 8;
                    }
                    if (organisation) {
                        doc.font('Helvetica-Bold').text('Organisation/Country: ', 35, doc.y, { continued: true });
                        doc.font('Helvetica').text(organisation);
                        doc.y += 8;
                    }
                    if (relationship) {
                        doc.font('Helvetica-Bold').text('Relationship: ', 35, doc.y, { continued: true });
                        doc.font('Helvetica').text(relationship);
                        doc.y += 8;
                    }
                    if (period) {
                        doc.font('Helvetica-Bold').text('Period Held: ', 35, doc.y, { continued: true });
                        doc.font('Helvetica').text(period);
                        doc.y += 8;
                    }
                    
                    doc.y += 4; // Space between entries
                }
            }
        }
        
        doc.y += 8;
        
        // Attestation - compact
        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text('ATTESTATION', 30);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
        doc.y += 6;
        
        doc.fontSize(7).fillColor('#000000').font('Helvetica-Oblique');
        doc.text('I HEREBY SWEAR OR AFFIRM THAT THE INFORMATION SET FORTH ABOVE AND ANY OTHER DOCUMENTATION PROVIDED TO IBV FOR THE PURPOSE OF ESTABLISHING AN ACCOUNT WITH IBV GOLD IS TRUE, ACCURATE AND COMPLETE.', 30, doc.y, { 
            width: doc.page.width - 60, 
            align: 'justify' 
        });
        doc.y += 15;
        
        // Signature section - horizontal layout
        doc.fontSize(8).fillColor('#000000').font('Helvetica');
        doc.font('Helvetica-Bold').text(`Name: `, 30, doc.y, { continued: true });
        doc.font('Helvetica').text(formData.attestationName || 'N/A');
        
        doc.font('Helvetica-Bold').text(`Date: `, 280, doc.y - 8, { continued: true });
        doc.font('Helvetica').text(formData.attestationDate || 'N/A');
        
        doc.y += 11;
        
        // Add signature image
        if (signatureDataUrl) {
            doc.font('Helvetica-Bold').text('Signature:', 30);
            doc.y += 3;
            try {
                const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, 30, doc.y, { width: 120, height: 36, fit: [120, 36] });
                doc.y += 40;
            } catch (err) {
                console.error('Error adding signature image:', err);
                doc.font('Helvetica').text('Digital signature on file', 32);
                doc.y += 12;
            }
        } else {
            doc.font('Helvetica-Bold').text('Signature: ', 30, doc.y, { continued: true });
            doc.font('Helvetica').text(formData.signature || 'N/A');
            doc.y += 12;
        }
        
        doc.end();
        
        // Wait for PDF to be created
        await new Promise((resolve) => stream.on('finish', resolve));
        
        console.log('✓ Client information PDF created');
        
        // Upload to SharePoint
        const sharePointUrl = await uploadToSharePoint(pdfPath, 'Client_Information.pdf', clientFolder);
        
        // Clean up temp file
        fs.unlinkSync(pdfPath);
        
        console.log('✓ Client information PDF uploaded to SharePoint');
        
        return sharePointUrl;
    } catch (error) {
        console.error('Error creating client info PDF:', error);
        throw error;
    }
}

// Create enhanced approval PDF
async function createApprovalPDF(clientFolder) {
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const pdfPath = path.join(__dirname, 'uploads', 'temp_approval.pdf');
        
        // Ensure uploads directory exists
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
        }
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        // Logo in top left corner
        const logoPath = path.join(__dirname, 'IBV-Gold-1.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 18, { width: 100, fit: [100, 35] });
        }
        
        doc.y = 35;
        
        // Title - simple black text
        doc.fontSize(18).fillColor('#000000').font('Helvetica-Bold').text('LEGAL APPROVAL', { align: 'center' });
        doc.fontSize(10).fillColor('#000000').font('Helvetica').text('APPLICATION APPROVED FOR TRADING', { align: 'center' });
        
        doc.y += 30;
        
        // Large approval badge with checkmark
        const centerX = doc.page.width / 2;
        doc.circle(centerX, doc.y + 60, 70).fillAndStroke('#ffffff', '#000000');
        
        // Draw checkmark
        doc.save();
        doc.strokeColor('#000000')
           .lineWidth(6)
           .lineCap('round')
           .lineJoin('round');
        doc.moveTo(centerX - 20, doc.y + 60)
           .lineTo(centerX - 5, doc.y + 75)
           .lineTo(centerX + 25, doc.y + 45)
           .stroke();
        doc.restore();
        
        doc.y += 150;
        
        // Approved status
        doc.fontSize(16).fillColor('#000000').font('Helvetica-Bold').text('APPROVED', { align: 'center' });
        
        doc.y += 25;
        
        // Information section
        doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text('APPROVAL DETAILS', 30);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
        doc.y += 12;
        
        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
        doc.text('CLIENT FOLDER:', 30, doc.y, { continued: true });
        doc.font('Helvetica').text(`  ${clientFolder}`);
        doc.y += 15;
        
        doc.font('Helvetica-Bold').text('APPROVAL DATE:', 30, doc.y, { continued: true });
        doc.font('Helvetica').text(`  ${new Date().toLocaleString('en-ZA', { 
            dateStyle: 'full', 
            timeStyle: 'short',
            timeZone: 'Africa/Johannesburg'
        })}`);
        doc.y += 15;
        
        doc.font('Helvetica-Bold').text('APPROVED BY:', 30, doc.y, { continued: true });
        doc.font('Helvetica').text('  Legal Team - IBV Global');
        doc.y += 15;
        
        doc.font('Helvetica-Bold').text('STATUS:', 30, doc.y, { continued: true });
        doc.font('Helvetica').text('  APPROVED FOR TRADING');
        doc.y += 15;
        
        doc.font('Helvetica-Bold').text('REFERENCE:', 30, doc.y, { continued: true });
        doc.font('Helvetica').text(`  ${Date.now()}`);
        
        doc.y += 30;
        
        // Certification text
        doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text('CERTIFICATION', 30);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
        doc.y += 12;
        
        doc.fontSize(9).fillColor('#000000').font('Helvetica');
        doc.text('This document certifies that the above-mentioned application has been thoroughly reviewed and approved by the IBV Gold legal team for pre-trade activities. All compliance requirements have been satisfied.', 30, doc.y, { 
            width: doc.page.width - 60, 
            align: 'justify' 
        });
        
        doc.end();
        
        // Wait for PDF to be created
        await new Promise((resolve) => stream.on('finish', resolve));
        
        console.log('✓ Approval PDF created');
        
        // Upload to SharePoint
        const sharePointUrl = await uploadToSharePoint(pdfPath, 'Legal_Approval.pdf', clientFolder);
        
        // Clean up temp file
        fs.unlinkSync(pdfPath);
        
        console.log('✓ Approval PDF uploaded to SharePoint');
        
        return sharePointUrl;
    } catch (error) {
        console.error('Error creating approval PDF:', error);
        throw error;
    }
}

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        config: {
            sharepoint: config.sharepoint.siteUrl,
            documentLibrary: config.sharepoint.documentLibrary,
            emailFrom: config.email.from
        }
    });
});

// Test endpoint to list SharePoint drives
app.get('/test/drives', async (req, res) => {
    try {
        const drives = await listSharePointDrives();
        res.json({
            success: true,
            drives: drives.map(d => ({
                name: d.name,
                id: d.id,
                webUrl: d.webUrl
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test endpoint to regenerate Client_Information.pdf for existing folder
app.get('/test/regenerate-pdf', async (req, res) => {
    try {
        // Sample form data based on your submission
        const formData = {
            applicantType: 'individual',
            fullName: 'Magenta Naidoo',
            idNumber: '1234567890123',
            mobile: '0123456789',
            email: 'magenta@example.com',
            residentialAddress: '15 poverty place',
            residency: 'resident',
            employmentStatus: 'full-time',
            employer: 'unknown',
            occupation: 'unknown',
            sourceOfFunds: 'unknown',
            bankName: 'capitec',
            accountHolder: 'magenta',
            accountNumber: '4747858632',
            branchCode: '470010',
            swift: 'CABLZAJJ',
            transactionSize: 'R0-R20000',
            purpose: 'unknown',
            foreignPep: 'No',
            domesticPep: 'No',
            familyPep: 'No',
            attestationName: 'Magenta Naidoo',
            attestationDate: '2026-02-14',
            signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAACWCAYAAADW4BqUAAAAAXNSR0IArs4c6QAABJBJREFUeF7t3bFRG0EQQNFd' // truncated example
        };
        
        const clientFolder = 'Magenta Naidoo_2026-02-14';
        
        console.log('Regenerating Client Information PDF for:', clientFolder);
        
        // Create the PDF
        await createClientInfoPDF(formData, clientFolder, formData.signatureData);
        
        res.json({
            success: true,
            message: 'Client Information PDF regenerated successfully',
            folder: clientFolder
        });
        
    } catch (error) {
        console.error('Error regenerating PDF:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check for duplicate client
app.post('/api/check-duplicate', async (req, res) => {
    try {
        const { clientName } = req.body;
        
        if (!clientName) {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        console.log('Checking for existing client:', clientName);
        
        const existingClients = await searchExistingClient(clientName);
        
        if (existingClients.length > 0) {
            res.json({
                exists: true,
                message: `Client "${clientName}" already exists in SharePoint`,
                existingFolders: existingClients.map(folder => ({
                    name: folder.name,
                    createdDate: folder.createdDateTime,
                    webUrl: folder.webUrl
                }))
            });
        } else {
            res.json({
                exists: false,
                message: 'Client does not exist'
            });
        }
        
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({
            error: 'Error checking for duplicate client: ' + error.message
        });
    }
});

// Submit form
app.post('/api/submit', upload.any(), async (req, res) => {
    try {
        const formData = req.body;
        const files = req.files;
        
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
        
        console.log('Number of files:', files.length);
        
        // Upload all files to SharePoint
        console.log('Uploading files to SharePoint...');
        const uploadPromises = files.map(file => {
            const originalName = file.originalname || file.fieldname + path.extname(file.path);
            return uploadToSharePoint(file.path, originalName, clientFolder)
                .then(url => {
                    fs.unlinkSync(file.path); // Clean up temp file
                    console.log('✓ Uploaded:', originalName);
                    return { file: originalName, url };
                })
                .catch(error => {
                    console.error('✗ Failed to upload:', originalName, error.message);
                    fs.unlinkSync(file.path); // Clean up temp file even on error
                    return { file: originalName, error: error.message };
                });
        });
        
        const uploadedFiles = await Promise.all(uploadPromises);
        
        // Get SharePoint folder link
        const successfulUpload = uploadedFiles.find(f => f.url);
        const sharePointFolderLink = successfulUpload
            ? successfulUpload.url.split('/').slice(0, -1).join('/')
            : `${config.sharepoint.siteUrl}/sites/${config.sharepoint.siteName}/${config.sharepoint.documentLibrary}/${clientFolder}`;
        
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
});

// Approve application
app.get('/approve', async (req, res) => {
    try {
        const clientFolder = req.query.client;
        
        if (!clientFolder) {
            return res.status(400).send('Invalid approval link');
        }
        
        console.log('Approving application for:', clientFolder);
        
        // Create and upload approval PDF
        const approvalPdfUrl = await createApprovalPDF(clientFolder);
        
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
});

// Start server
app.listen(config.server.port, () => {
    console.log('='.repeat(60));
    console.log('🚀 IBV Gold Pre-Trade Application System');
    console.log('='.repeat(60));
    console.log(`✓ Server running on ${config.server.baseUrl}`);
    console.log(`✓ Azure AD authentication configured`);
    console.log(`✓ SharePoint: ${config.sharepoint.siteUrl}`);
    console.log(`✓ Document Library: ${config.sharepoint.documentLibrary}`);
    console.log(`✓ Email from: ${config.email.from}`);
    console.log(`✓ Legal team: ${config.email.legalTeam}`);
    console.log('='.repeat(60));
    console.log(`📝 Access forms at: ${config.server.baseUrl}/index.html`);
    console.log(`💚 Health check: ${config.server.baseUrl}/health`);
    console.log('='.repeat(60));
});
