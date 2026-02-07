const sharepoint = require('./services/sharepoint');

async function test() {
    console.log('Testing SharePoint authentication...\n');

    console.log('Configuration:');
    console.log('- Site URL:', process.env.SHAREPOINT_SITE_URL || sharepoint.siteUrl);
    console.log('- Tenant ID:', process.env.SHAREPOINT_TENANT_ID || sharepoint.tenantId);
    console.log('- Client ID:', process.env.SHAREPOINT_CLIENT_ID || sharepoint.clientId);
    console.log('- Client Secret:', process.env.SHAREPOINT_CLIENT_SECRET ? '***' + sharepoint.clientSecret.slice(-4) : 'Not set');
    console.log();

    try {
        console.log('Step 1: Getting access token...');
        const token = await sharepoint.getAccessToken();
        console.log('✓ Access token obtained successfully');
        console.log('  Token preview:', token.substring(0, 50) + '...');
        console.log();

        console.log('Step 2: Fetching Groups from SharePoint...');
        const groups = await sharepoint.getGroups();
        console.log('✓ Success! Retrieved', groups.length, 'group(s)');
        console.log();

        if (groups.length > 0) {
            console.log('Sample group:');
            console.log(JSON.stringify(groups[0], null, 2));
        } else {
            console.log('No groups found in the list.');
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
        if (error.response?.data) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

test();
