const http = require('http');

const host = 'localhost';
const port = process.env.PORT || 5000;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);

    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log('Checking /ping...');
    const ping = await request({ host, port, path: '/ping', method: 'GET' });
    if (ping.status !== 200) throw new Error(`/ping returned ${ping.status}`);
    console.log('/ping OK');

    console.log('Posting /api/report/sos...');
    const sos = await request({ host, port, path: '/api/report/sos', method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ test: true }));
    if (sos.status !== 200) throw new Error(`/api/report/sos returned ${sos.status}`);
    console.log('/api/report/sos OK');

    console.log('Smoke tests passed ✅');
    process.exit(0);
  } catch (err) {
    console.error('Smoke tests failed ❌', err);
    process.exit(1);
  }
})();