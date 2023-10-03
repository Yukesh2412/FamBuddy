const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Define your base URL
const baseUrl = 'https://ags.hcm.bi';

// Create a proxy middleware for all requests
const apiProxy = createProxyMiddleware({ target: baseUrl, changeOrigin: true });
app.use(apiProxy);

// Optional: Add a route to specifically handle requests for the home page
// app.get('/', (req, res) => {
//   res.redirect(baseUrl);
// });

const port = 3000 || process.env.PORT;
app.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
