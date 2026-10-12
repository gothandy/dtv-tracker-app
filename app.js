/**
 * Entry point. Checks the app's settings, then starts the tracker (server.js).
 *
 * If a setting is missing or wrong, the tracker doesn't start. Instead every request gets a
 * page saying what's wrong and to contact the admin, and /api/health returns 503 so
 * a deploy fails. The deploy also checks settings before deploying, so this should
 * only happen if a setting is removed or renamed in Azure afterwards.
 * See docs/configuration.md.
 */

require('dotenv').config();
const http = require('http');
const { settingsProblems, platform } = require('./dist/backend/config');

const problems = settingsProblems();

if (problems.length === 0) {
    require('./server');
} else {
    const problem = problems.join('. ');
    console.error(`[Startup] ${problem}. The tracker has not started. See docs/configuration.md`);

    http.createServer((req, res) => {
        if (req.url.startsWith('/api/')) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `The tracker isn't set up correctly. ${problem}` }));
            return;
        }
        res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DTV Tracker unavailable</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 36rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5">
  <h1>The tracker isn't available</h1>
  <p>It isn't set up correctly, so it hasn't started. Please let the tracker admin know, including the message below.</p>
  <pre style="background: #f3f3f3; padding: 0.75rem; white-space: pre-wrap">${problem}</pre>
</body>
</html>`);
    }).listen(platform.port, () => {
        console.log(`Setup problem page running at http://localhost:${platform.port}`);
    });
}
