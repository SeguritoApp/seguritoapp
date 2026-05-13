const { exec } = require('child_process');
const server = exec('npx node dist/server.cjs', { env: { ...process.env, NODE_ENV: 'production', PORT: '3001' } });
server.stdout.on('data', console.log);
server.stderr.on('data', console.error);

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:3001/assets/index-CjfTFIuC.css');
    console.log("Status css:", res.status, res.headers.get('content-type'));
    const res2 = await fetch('http://localhost:3001/');
    console.log("Status root:", res2.status, res2.headers.get('content-type'));
  } catch (e) {
    console.error(e);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 4000);
