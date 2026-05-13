import http from 'http';

http.get('http://localhost:3000/assets/index-Be5NEoQa.js', (res) => {
  console.log("Status:", res.statusCode);
  console.log("Content-Type:", res.headers['content-type']);
  res.on('data', () => {});
  res.on('end', () => console.log("Done"));
});
