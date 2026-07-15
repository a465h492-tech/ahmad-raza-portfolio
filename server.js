const h = require('http');
const f = require('fs');
const p = require('path');
h.createServer((q, r) => {
  let fp = p.join('C:\\Users\\Pc\\Desktop\\AiClass', q.url === '/' ? '/index.html' : q.url);
  f.readFile(fp, (e, d) => {
    if (e) { r.writeHead(404); r.end('Not found'); }
    else { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }
  });
}).listen(1020, () => console.log('Server at http://localhost:1020'));
