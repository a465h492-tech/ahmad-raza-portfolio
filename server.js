const h = require('http');
const f = require('fs');
const p = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Gf2b4gsxnQza@ep-misty-sea-atdwzg2o-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  max: 1,
  ssl: { rejectUnauthorized: false },
});

const ADMIN_HASH = '3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2';
const ROOT = 'C:\\Users\\Pc\\Desktop\\AiClass';

function json(r, code, data) {
  r.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  r.end(JSON.stringify(data));
}

async function handleAPI(q, r, body) {
  r.setHeader('Access-Control-Allow-Origin', '*');
  r.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  r.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-email');
  if (q.method === 'OPTIONS') { r.writeHead(200); r.end(); return; }

  const url = q.url.replace('/api', '');
  const parts = url.split('/').filter(Boolean);
  const [resource, id] = parts;

  try {
    const { rowCount } = await pool.query('SELECT 1 FROM public.users WHERE email = $1', ['admin@admin.com']);
    if (rowCount === 0) {
      await pool.query('INSERT INTO public.users (name, email, pwd, role) VALUES ($1, $2, $3, $4)', ['Admin', 'admin@admin.com', ADMIN_HASH, 'admin']);
    }

    async function getRequester(email) {
      if (!email) return null;
      const { rows } = await pool.query('SELECT name, email, role FROM public.users WHERE email = $1', [email]);
      return rows[0] || null;
    }

    if (resource === 'signup' && q.method === 'POST') {
      const { name, email, pwd } = body;
      const { rows: existing } = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
      if (existing.length > 0) return json(r, 400, { error: 'Email already registered' });
      const { rows } = await pool.query('INSERT INTO public.users (name, email, pwd) VALUES ($1, $2, $3) RETURNING name, email, role', [name, email, pwd]);
      return json(r, 201, rows[0]);
    }

    if (resource === 'login' && q.method === 'POST') {
      const { email, pwd } = body;
      const { rows } = await pool.query('SELECT name, email, role FROM public.users WHERE email = $1 AND pwd = $2', [email, pwd]);
      if (rows.length === 0) return json(r, 401, { error: 'Invalid email or password' });
      return json(r, 200, rows[0]);
    }

    if (resource === 'products') {
      if (q.method === 'GET') {
        const { rows } = await pool.query('SELECT * FROM public.products ORDER BY created_at DESC');
        return json(r, 200, rows);
      }
      const requester = await getRequester(body && body['x-user-email']);
      if (q.method === 'POST') {
        const { name, description, price, tags } = body;
        const { rows } = await pool.query('INSERT INTO public.products (name, description, price, tags) VALUES ($1, $2, $3, $4) RETURNING *', [name, description || '', parseFloat(price), tags || []]);
        return json(r, 201, rows[0]);
      }
      if (q.method === 'PUT' && id) {
        const { name, description, price, tags } = body;
        const { rows } = await pool.query('UPDATE public.products SET name=$1, description=$2, price=$3, tags=$4 WHERE id=$5 RETURNING *', [name, description || '', parseFloat(price), tags || [], id]);
        if (rows.length === 0) return json(r, 404, { error: 'Not found' });
        return json(r, 200, rows[0]);
      }
      if (q.method === 'DELETE' && id) {
        await pool.query('DELETE FROM public.products WHERE id = $1', [id]);
        return json(r, 200, { success: true });
      }
    }

    if (resource === 'users') {
      const requester = await getRequester(q.headers['x-user-email']);
      if (!requester || requester.role !== 'admin') return json(r, 403, { error: 'Admin required' });
      if (q.method === 'GET') {
        const { rows } = await pool.query("SELECT id, name, email, role, created_at FROM public.users WHERE role != 'admin' OR role IS NULL ORDER BY created_at DESC");
        return json(r, 200, rows);
      }
      if (q.method === 'DELETE') {
        const { email } = body;
        await pool.query('DELETE FROM public.users WHERE email = $1', [email]);
        return json(r, 200, { success: true });
      }
    }

    if (resource === 'stats') {
      const requester = await getRequester(q.headers['x-user-email']);
      if (!requester || requester.role !== 'admin') return json(r, 403, { error: 'Admin required' });
      const { rows: uc } = await pool.query('SELECT COUNT(*) AS c FROM public.users');
      const { rows: pc } = await pool.query('SELECT COUNT(*) AS c FROM public.products');
      const { rows: ar } = await pool.query("SELECT COUNT(*) AS c FROM public.users WHERE role = 'admin'");
      const total = parseInt(uc[0].c), products = parseInt(pc[0].c), admins = parseInt(ar[0].c);
      return json(r, 200, { totalUsers: total, totalProducts: products, adminCount: admins, regularCount: total - admins });
    }

    json(r, 404, { error: 'Not found' });
  } catch (err) {
    json(r, 500, { error: 'Server error' });
  }
}

h.createServer((q, r) => {
  if (q.url.startsWith('/api')) {
    let body = '';
    q.on('data', c => body += c);
    q.on('end', () => {
      let parsed = {};
      try { parsed = body ? JSON.parse(body) : {}; } catch {}
      handleAPI(q, r, parsed);
    });
    return;
  }
  let fp = p.join(ROOT, q.url === '/' ? '/market.html' : q.url);
  f.readFile(fp, (e, d) => {
    if (e) { r.writeHead(404); r.end('Not found'); }
    else {
      const ext = p.extname(fp).toLowerCase();
      const mimes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
      r.writeHead(200, { 'Content-Type': mimes[ext] || 'text/plain' });
      r.end(d);
    }
  });
}).listen(1020, () => console.log('MarketHub at http://localhost:1020'));
