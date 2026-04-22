const http = require('http');

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: responseBody ? JSON.parse(responseBody) : null }));
    });

    req.on('error', error => reject(error));
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  try {
    const signupRes = await makeRequest('/auth/signup', 'POST', { email: 'test3@quitio.com', password: 'Password123!' });
    const token = signupRes.data.token;

    console.log('Testing POST /cards/ingest/social-link...');
    const ingestRes = await makeRequest('/cards/ingest/social-link', 'POST', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }, token);
    console.log('Ingest social link:', ingestRes.status, ingestRes.data);

  } catch (error) {
    console.error('Error:', error);
  }
}

runTests();
