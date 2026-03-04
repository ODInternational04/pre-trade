const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { uploadToSharePoint } = require('./sharepoint');

// Create client information PDF
async function createClientInfoPDF(formData,clientFolder, signatureDataUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', async () => {
                try {
                    const pdfBuffer = Buffer.concat(chunks);
                    
                    // Upload to SharePoint
                    const sharePointUrl = await uploadToSharePoint(pdfBuffer, 'Client_Information.pdf', clientFolder);
                    console.log('✓ Client information PDF uploaded to SharePoint');
                    resolve(sharePointUrl);
                } catch (error) {
                    reject(error);
                }
            });
            
            // Logo (if exists)
            const logoPath = path.join(__dirname, '..', 'IBV-Gold-1.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 30, 18, { width: 100, fit: [100, 35] });
            }
            
            doc.y = 35;
            
            // Title
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
                
                Object.entries(data).forEach(([key, value]) => {
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
            
            // PEP Declaration
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
            doc.y += 20;
            
            // Attestation
            doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text('ATTESTATION', 30);
            doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
            doc.y += 6;
            
            doc.fontSize(7).fillColor('#000000').font('Helvetica-Oblique');
            doc.text('I HEREBY SWEAR OR AFFIRM THAT THE INFORMATION SET FORTH ABOVE AND ANY OTHER DOCUMENTATION PROVIDED TO IBV FOR THE PURPOSE OF ESTABLISHING AN ACCOUNT WITH IBV GOLD IS TRUE, ACCURATE AND COMPLETE.', 30, doc.y, { 
                width: doc.page.width - 60, 
                align: 'justify' 
            });
            doc.y += 15;
            
            // Signature section
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
            }
            
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
}

// Create approval PDF
async function createApprovalPDF(clientFolder) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', async () => {
                try {
                    const pdfBuffer = Buffer.concat(chunks);
                    
                    // Upload to SharePoint
                    const sharePointUrl = await uploadToSharePoint(pdfBuffer, 'Legal_Approval.pdf', clientFolder);
                    console.log('✓ Approval PDF uploaded to SharePoint');
                    resolve(sharePointUrl);
                } catch (error) {
                    reject(error);
                }
            });
            
            // Logo
            const logoPath = path.join(__dirname, '..', 'IBV-Gold-1.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 30, 18, { width: 100, fit: [100, 35] });
            }
            
            doc.y = 35;
            
            // Title
            doc.fontSize(18).fillColor('#000000').font('Helvetica-Bold').text('LEGAL APPROVAL', { align: 'center' });
            doc.fontSize(10).fillColor('#000000').font('Helvetica').text('APPLICATION APPROVED FOR TRADING', { align: 'center' });
            
            doc.y += 30;
            
            // Large approval badge
            const centerX = doc.page.width / 2;
            doc.circle(centerX, doc.y + 60, 70).fillAndStroke('#ffffff', '#000000');
            
            // Draw checkmark
            doc.save();
            doc.strokeColor('#000000').lineWidth(6).lineCap('round').lineJoin('round');
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
            
            // Certification
            doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text('CERTIFICATION', 30);
            doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).lineWidth(0.5).stroke('#000000');
            doc.y += 12;
            
            doc.fontSize(9).fillColor('#000000').font('Helvetica');
            doc.text('This document certifies that the above-mentioned application has been thoroughly reviewed and approved by the IBV Gold legal team for pre-trade activities. All compliance requirements have been satisfied.', 30, doc.y, { 
                width: doc.page.width - 60, 
                align: 'justify' 
            });
            
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    createClientInfoPDF,
    createApprovalPDF
};
