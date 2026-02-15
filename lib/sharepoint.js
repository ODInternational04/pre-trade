const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const fs = require('fs');
const config = require('../config');

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

module.exports = {
    getAccessToken,
    getGraphClient,
    getSharePointSiteId,
    listSharePointDrives,
    searchExistingClient,
    uploadToSharePoint
};
