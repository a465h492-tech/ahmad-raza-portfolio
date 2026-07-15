const { Pool } = require('pg');
const urlMod = require('url');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Gf2b4gsxnQza@ep-misty-sea-atdwzg2o-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  max: 1,
  ssl: { rejectUnauthorized: false },
});

const ADMIN_HASH = '3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2';

function json(res, status, data) {
  res.status(status).json(data);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-email');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const parts = urlMod.parse(req.url).pathname.replace('/api', '').split('/').filter(Boolean);
    const method = req.method;
    const [resource, id] = parts;

    // Seed admin on first request
    const { rowCount } = await pool.query('SELECT 1 FROM public.users WHERE email = $1', ['admin@admin.com']);
    if (rowCount === 0) {
      await pool.query(
        'INSERT INTO public.users (name, email, pwd, role) VALUES ($1, $2, $3, $4)',
        ['Admin', 'admin@admin.com', ADMIN_HASH, 'admin']
      );
    }

    // --- SIGNUP ---
    if (resource === 'signup' && method === 'POST') {
      const { name, email, pwd } = req.body;
      const { rows: existing } = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
      if (existing.length > 0) return json(res, 400, { error: 'Email already registered' });
      const { rows } = await pool.query(
        'INSERT INTO public.users (name, email, pwd) VALUES ($1, $2, $3) RETURNING name, email, role',
        [name, email, pwd]
      );
      return json(res, 201, rows[0]);
    }

    // --- LOGIN ---
    if (resource === 'login' && method === 'POST') {
      const { email, pwd } = req.body;
      const { rows } = await pool.query(
        'SELECT name, email, role FROM public.users WHERE email = $1 AND pwd = $2',
        [email, pwd]
      );
      if (rows.length === 0) return json(res, 401, { error: 'Invalid email or password' });
      return json(res, 200, rows[0]);
    }

    // Helper: check admin
    async function getRequester(email) {
      if (!email) return null;
      const { rows } = await pool.query('SELECT name, email, role FROM public.users WHERE email = $1', [email]);
      return rows[0] || null;
    }

    // --- PRODUCTS (admin CRUD) ---
    if (resource === 'products') {
      // Public: GET all products
      if (method === 'GET') {
        const { rows } = await pool.query('SELECT * FROM public.products ORDER BY created_at DESC');
        return json(res, 200, rows);
      }

      const requester = await getRequester(req.headers['x-user-email']);
      if (!requester || requester.role !== 'admin') return json(res, 403, { error: 'Admin required' });

      // Admin: CREATE product
      if (method === 'POST') {
        const { name, description, price, tags } = req.body;
        const { rows } = await pool.query(
          'INSERT INTO public.products (name, description, price, tags) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, description || '', parseFloat(price), tags || []]
        );
        return json(res, 201, rows[0]);
      }

      // Admin: UPDATE product
      if (method === 'PUT' && id) {
        const { name, description, price, tags } = req.body;
        const { rows } = await pool.query(
          'UPDATE public.products SET name=$1, description=$2, price=$3, tags=$4 WHERE id=$5 RETURNING *',
          [name, description || '', parseFloat(price), tags || [], id]
        );
        if (rows.length === 0) return json(res, 404, { error: 'Product not found' });
        return json(res, 200, rows[0]);
      }

      // Admin: DELETE product
      if (method === 'DELETE' && id) {
        await pool.query('DELETE FROM public.products WHERE id = $1', [id]);
        return json(res, 200, { success: true });
      }
    }

    // --- USERS (admin only) ---
    if (resource === 'users') {
      const requester = await getRequester(req.headers['x-user-email']);
      if (!requester || requester.role !== 'admin') return json(res, 403, { error: 'Admin required' });

      if (method === 'GET') {
        const { rows } = await pool.query(
          "SELECT id, name, email, role, created_at FROM public.users WHERE role != 'admin' OR role IS NULL ORDER BY created_at DESC"
        );
        return json(res, 200, rows);
      }

      if (method === 'DELETE') {
        const { email } = req.body;
        await pool.query('DELETE FROM public.users WHERE email = $1', [email]);
        return json(res, 200, { success: true });
      }
    }

    // --- STATS (admin only) ---
    if (resource === 'stats') {
      const requester = await getRequester(req.headers['x-user-email']);
      if (!requester || requester.role !== 'admin') return json(res, 403, { error: 'Admin required' });

      const { rows: userCount } = await pool.query('SELECT COUNT(*) AS c FROM public.users');
      const { rows: prodCount } = await pool.query('SELECT COUNT(*) AS c FROM public.products');
      const { rows: adminRows } = await pool.query("SELECT COUNT(*) AS c FROM public.users WHERE role = 'admin'");
      const total = parseInt(userCount[0].c);
      const products = parseInt(prodCount[0].c);
      const admins = parseInt(adminRows[0].c);
      return json(res, 200, { totalUsers: total, totalProducts: products, adminCount: admins, regularCount: total - admins });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Server error' });
  }
};
