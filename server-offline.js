// Offline server for iPad development
const express = require('express');
const { success: setupAppRoutes } = require('./main-offline');

const app = express();
const port = process.env.PORT || 3000;

setupAppRoutes(app);

app.listen(port, () => {
    console.log(`🚀 Offline server running on http://localhost:${port}`);
    console.log(`📱 Perfect for iPad development on flights!`);
    console.log(`👤 Login with: Julia Reinman / password123`);
});