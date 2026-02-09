require('dotenv').config();
const express = require('express');
const apiRoutes = require('./dist/routes/api');

const app = express();

app.use(express.static('public'));
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Running at http://localhost:${port}`);
    console.log('API endpoints available:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/stats');
    console.log('  - GET /api/groups');
    console.log('  - GET /api/sessions');
    console.log('  - GET /api/profiles');
});