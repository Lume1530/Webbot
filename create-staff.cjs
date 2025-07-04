const https = require('https');
const http = require('http');

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createStaffUser() {
  try {
    console.log('Creating staff user...');
    
    const response = await makeRequest('http://localhost:4000/api/create-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      username: 'staff1',
      email: 'staff1@example.com',
      password: 'staff123'
    });

    if (response.status === 201) {
      console.log('✅ Staff user created successfully!');
      console.log('Username: staff1');
      console.log('Email: staff1@example.com');
      console.log('Password: staff123');
      console.log('Role: staff');
    } else {
      console.error('❌ Failed to create staff user:', response.data.error || response.data);
    }
  } catch (error) {
    console.error('❌ Error creating staff user:', error.message);
    console.log('Make sure your server is running on http://localhost:4000');
  }
}

createStaffUser(); 