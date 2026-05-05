const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const logFile = path.join(root, 'shader-log.txt');
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.wgsl': 'text/plain',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function writeLog(entry) {
  const line = `${new Date().toISOString()} ${entry.level.toUpperCase()}: ${entry.message}\n`;
  fs.appendFile(logFile, line, (err) => {
    if (err) console.error('Failed to write log file:', err);
  });
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        writeLog(entry);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  let requestedPath = req.url.split('?')[0];
  if (requestedPath === '/') requestedPath = '/index.html';
  const filePath = path.join(root, requestedPath);
  serveFile(filePath, res);
});

const port = 8000;
server.listen(port, () => {
  console.log(`Static logger server running at http://localhost:${port}`);
});
