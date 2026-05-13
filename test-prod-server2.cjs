const { exec } = require('child_process');
const server = exec('npx node dist/server.cjs', { env: { ...process.env, NODE_ENV: 'production', PORT: '3001' } });
server.stdout.on('data', console.log);
server.stderr.on('data', console.error);

setTimeout(async () => {
  try {
    const fs = require('fs');
    const files = fs.readdirSync('./dist/assets');
    const jsFile = files.find(f => f.endsWith('.js'));
    const cssFile = files.find(f => f.endsWith('.css'));
    
    console.log("Found JS File:", jsFile);
    
    const res = await fetch('http://localhost:3001/assets/' + jsFile);
    console.log("Status js:", res.status, res.headers.get('content-type'));
    const res2 = await fetch('http://localhost:3001/');
    console.log("Status root:", res2.status, res2.headers.get('content-type'));
  } catch (e) {
    console.error(e);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 4000);
