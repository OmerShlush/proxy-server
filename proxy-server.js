const http = require('http');
const https = require('https');
const { parse } = require('url');
const fs = require('fs');

const proxyPort = 3000;
const destinationUrl = 'https://free-t-cio.openapi.gov.il/free/test/cio/gold/rest/applicationsteps/v1'; // Replace with the actual destination URL

const logFilePath = './proxy_log.txt';

const proxyServer = http.createServer((req, res) => {
  const requestOptions = {
    method: req.method,
    headers: req.headers,
    rejectUnauthorized: false,
  };

  const destinationOptions = parse(destinationUrl + req.url);

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'UPDATE') {
    let requestBody = '';
    req.on('data', (chunk) => {
      requestBody += chunk;
    });

    req.on('end', () => {
      writeToLogFile('Request Body:', requestBody);

      requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody);
      destinationOptions.method = req.method;

      const proxyRequest = (destinationOptions.protocol === 'https:' ? https : http).request(destinationOptions, (proxyResponse) => {
        const logResponseHeaders = {
          statusCode: proxyResponse.statusCode,
          headers: proxyResponse.headers,
        };
        writeToLogFile('Outgoing Response Headers:', logResponseHeaders);

        res.writeHead(proxyResponse.statusCode, proxyResponse.headers);

        let responseData = '';
        proxyResponse.on('data', (chunk) => {
          responseData += chunk;
          res.write(chunk);
        });

        proxyResponse.on('end', () => {
          res.end();
          writeToLogFile('Response Data:', responseData);
        });
      });

      proxyRequest.on('error', (err) => {
        console.error('Proxy request error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy request error');
      });

      proxyRequest.write(requestBody);
      proxyRequest.end();
    });
  } else {
    const proxyRequest = (destinationOptions.protocol === 'https:' ? https : http).request(destinationOptions, (proxyResponse) => {
      const logResponseHeaders = {
        statusCode: proxyResponse.statusCode,
        headers: proxyResponse.headers,
      };
      writeToLogFile('Outgoing Response Headers:', logResponseHeaders);

      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);

      let responseData = '';
      proxyResponse.on('data', (chunk) => {
        responseData += chunk;
        res.write(chunk);
      });

      proxyResponse.on('end', () => {
        res.end();
        writeToLogFile('Response Data:', responseData);
      });
    });

    proxyRequest.on('error', (err) => {
      console.error('Proxy request error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy request error');
    });

    proxyRequest.end();
  }

  const logRequestHeaders = {
    method: req.method,
    url: req.url,
    headers: req.headers,
  };
  writeToLogFile('Incoming Request Headers:', logRequestHeaders);
});

proxyServer.listen(proxyPort, () => {
  console.log(`Proxy server listening on port ${proxyPort}`);
});

function writeToLogFile(logType, logData) {
  const logEntry = `=====================\n[${new Date().toISOString()}]\n${logType}\n${JSON.stringify(logData, null, 2)}\n\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}
