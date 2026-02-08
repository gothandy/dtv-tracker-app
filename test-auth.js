const sharepoint = require('./services/sharepoint');

async function test() {
    console.log('Testing Microsoft Graph API authentication...\n');

    console.log('Configuration:');
    console.log('- Site URL:', process.env.SHAREPOINT_SITE_URL || sharepoint.siteUrl);
    console.log('- Tenant ID:', process.env.SHAREPOINT_TENANT_ID || sharepoint.tenantId);
    console.log('- Client ID:', process.env.SHAREPOINT_CLIENT_ID || sharepoint.clientId);
    console.log('- Client Secret:', process.env.SHAREPOINT_CLIENT_SECRET ? '***' + sharepoint.clientSecret.slice(-4) : 'Not set');
    console.log();

    try {
        console.log('Step 1: Getting access token for Microsoft Graph...');
        const token = await sharepoint.getAccessToken();
        console.log('✓ Access token obtained successfully');
        console.log('  Token preview:', token.substring(0, 50) + '...');
        console.log();

        // Debug: Check what scopes the token has
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log('Token details:');
            console.log('  Audience:', payload.aud);
            const roles = payload.roles || payload.scp;
            console.log('  Scopes/Roles:', roles || '⚠️  NONE - This is the problem!');

            if (!roles || (Array.isArray(roles) && roles.length === 0)) {
                console.log('\n⚠️  WARNING: Token has NO permissions!');
                console.log('The token is valid but has no roles assigned.');
                console.log('\nTo fix this, you need to:');
                console.log('1. Go to Azure Portal → App Registrations → Your App');
                console.log('2. Go to "API permissions"');
                console.log('3. Ensure "Microsoft Graph" permission "Sites.ReadWrite.All" is added');
                console.log('4. Ensure it\'s type "Application" (not Delegated)');
                console.log('5. Click "Grant admin consent" button');
                console.log('6. Wait a few minutes for propagation\n');
            }
            console.log();
        }

        console.log('Step 2: Getting SharePoint site ID...');
        const siteId = await sharepoint.getSiteId();
        console.log('✓ Site ID obtained successfully');
        console.log('  Site ID:', siteId);
        console.log();

        console.log('Step 3: Fetching Groups from SharePoint via Graph API...');
        const groups = await sharepoint.getGroups();
        console.log('✓ Success! Retrieved', groups.length, 'group(s)');
        console.log();

        if (groups.length > 0) {
            console.log('Sample group:');
            console.log(JSON.stringify(groups[0], null, 2));
            console.log();

            console.log('Step 4: Fetching Sessions (testing lookup fields)...');
            const sessions = await sharepoint.getSessions();
            console.log('✓ Retrieved', sessions.length, 'session(s)');

            if (sessions.length > 0) {
                console.log('Sample session:');
                console.log(JSON.stringify(sessions[0], null, 2));
            }
        } else {
            console.log('No groups found in the list.');
        }

        console.log('\n✓ All tests passed! Microsoft Graph API migration successful.');
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.response?.data) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

test();
