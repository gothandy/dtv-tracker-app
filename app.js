require('dotenv').config();
const express = require('express');
const apiRoutes = require('./routes/api');

const app = express();

app.use(express.static('public'));
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

app.listen(3000, () => {
    console.log('Running at http://localhost:3000');
    console.log('API endpoints available:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/stats');
    console.log('  - GET /api/groups');
    console.log('  - GET /api/sessions');
    console.log('  - GET /api/profiles');
});