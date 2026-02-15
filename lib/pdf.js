const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { uploadToSharePoint, getGraphClient, getSharePointSiteId } = require('./sharepoint');
const config = require('../config');

// Create or update tracking PDF for resubmissions
async function createOrUpdateTrackingPDF(clientFolder, clientName, isResubmission) {
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const pdfPath = path.join('/tmp', 'temp_tracking.pdf');
        const stream = fs.createWriteStream(pdfPath);
        
        doc.pipe(stream);
        
        // Add logo
        const logoPath = path.join(__dirname, '..', 'public', 'IBV-Gold-1.png');
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
                    const folderPath = `root:/${clientFolder}`;
                    const items = await client.api(`/drives/${targetDrive.id}/${folderPath}:/children`).get();
                    const trackingFile = items.value.find(item => item.name === 'Resubmission_Tracking.pdf');
                    
                    if (trackingFile) {
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
        
        await uploadToSharePoint(pdfPath, 'Resubmission_Tracking.pdf', clientFolder);
        console.log('✓ Tracking PDF uploaded to SharePoint');
        
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
        const pdfPath = path.join('/tmp', 'temp_client_info.pdf');
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        // Logo in top left corner
        const logoPath = path.join(__dirname, '..', 'public', 'IBV-Gold-1.png');
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
        
        await new Promise((resolve) => stream.on('finish', resolve));
        
        console.log('✓ Client information PDF created');
        
        const sharePointUrl = await uploadToSharePoint(pdfPath, 'Client_Information.pdf', clientFolder);
        
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
        const pdfPath = path.join('/tmp', 'temp_approval.pdf');
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        // Logo in top left corner
        const logoPath = path.join(__dirname, '..', 'public', 'IBV-Gold-1.png');
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
        
        await new Promise((resolve) => stream.on('finish', resolve));
        
        console.log('✓ Approval PDF created');
        
        const sharePointUrl = await uploadToSharePoint(pdfPath, 'Legal_Approval.pdf', clientFolder);
        
        fs.unlinkSync(pdfPath);
        
        console.log('✓ Approval PDF uploaded to SharePoint');
        
        return sharePointUrl;
    } catch (error) {
        console.error('Error creating approval PDF:', error);
        throw error;
    }
}

module.exports = {
    createOrUpdateTrackingPDF,
    createClientInfoPDF,
    createApprovalPDF
};
