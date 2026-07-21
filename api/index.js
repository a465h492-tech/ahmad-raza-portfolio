const { Pool } = require('pg');
const urlMod = require('url');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Gf2b4gsxnQza@ep-misty-sea-atdwzg2o-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  max: 1,
  ssl: { rejectUnauthorized: false },
});

const ADMIN_HASH = '3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2';
const COMMISSION_RATE = 0.10;

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

    async function getRequester(email) {
      if (!email) return null;
      const { rows } = await pool.query('SELECT name, email, role FROM public.users WHERE email = $1', [email]);
      return rows[0] || null;
    }

    // Bootstrap: tables + admin + schema
    await pool.query('SELECT 1 FROM public.users WHERE email = $1', ['admin@admin.com']).then(async ({ rowCount }) => {
      if (rowCount === 0) {
        await pool.query('INSERT INTO public.users (name, email, pwd, role) VALUES ($1, $2, $3, $4)', ['Admin', 'admin@admin.com', ADMIN_HASH, 'admin']);
      }
    }).catch(() => {});
    await pool.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_email VARCHAR(255)`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, product_id INTEGER, product_name VARCHAR(255), product_price DECIMAL(10,2), commission DECIMAL(10,2), net_amount DECIMAL(10,2), buyer_email VARCHAR(255), buyer_name VARCHAR(255), seller_email VARCHAR(255), status VARCHAR(50) DEFAULT 'completed', created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, product_id INTEGER, user_email VARCHAR(255), user_name VARCHAR(255), rating INTEGER CHECK (rating >= 1 AND rating <= 5), comment TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(product_id, user_email))`).catch(() => {});
    // Chat tables
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_rooms (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (id SERIAL PRIMARY KEY, room_id INTEGER REFERENCES chat_rooms(id), sender_name VARCHAR(50) NOT NULL, message TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_online (id SERIAL PRIMARY KEY, username VARCHAR(50) NOT NULL, room_id INTEGER REFERENCES chat_rooms(id), last_seen TIMESTAMP DEFAULT NOW(), UNIQUE(username, room_id))`).catch(() => {});
    await pool.query('SELECT 1 FROM chat_rooms LIMIT 1').then(async ({ rowCount }) => {
      if (rowCount === 0) {
        await pool.query("INSERT INTO chat_rooms (name) VALUES ('General'), ('Random'), ('Tech Talk')");
      }
    }).catch(() => {});

    // --- SIGNUP ---
    if (resource === 'signup' && method === 'POST') {
      const { name, email, pwd, role } = req.body;
      const { rows: existing } = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
      if (existing.length > 0) return json(res, 400, { error: 'Email already registered' });
      const { rows } = await pool.query('INSERT INTO public.users (name, email, pwd, role) VALUES ($1, $2, $3, $4) RETURNING name, email, role', [name, email, pwd, role || 'buyer']);
      return json(res, 201, rows[0]);
    }

    // --- LOGIN ---
    if (resource === 'login' && method === 'POST') {
      const { email, pwd } = req.body;
      const { rows } = await pool.query('SELECT name, email, role FROM public.users WHERE email = $1 AND pwd = $2', [email, pwd]);
      if (rows.length === 0) return json(res, 401, { error: 'Invalid email or password' });
      return json(res, 200, rows[0]);
    }

    // --- PRODUCTS (public GET, authenticated POST/PUT/DELETE) ---
    if (resource === 'products') {
      if (method === 'GET') {
        const q = urlMod.parse(req.url, true).query;
        let rows;
        if (q.seller) {
          rows = (await pool.query('SELECT * FROM public.products WHERE seller_email = $1 ORDER BY created_at DESC', [q.seller])).rows;
        } else {
          rows = (await pool.query('SELECT * FROM public.products ORDER BY created_at DESC')).rows;
        }
        // Attach avg rating + review count + buyer status
        for (const p of rows) {
          const r = await pool.query('SELECT COUNT(*) AS cnt, COALESCE(AVG(rating), 0) AS avg FROM public.reviews WHERE product_id = $1', [p.id]);
          p.reviewCount = parseInt(r.rows[0].cnt);
          p.avgRating = parseFloat(parseFloat(r.rows[0].avg).toFixed(1));
        }
        return json(res, 200, rows);
      }

      const requester = await getRequester(req.headers['x-user-email']);
      if (!requester) return json(res, 401, { error: 'Authentication required' });
      const isAdmin = requester.role === 'admin';
      const userEmail = requester.email;

      if (method === 'POST') {
        const { name, description, price, tags } = req.body;
        const { rows } = await pool.query('INSERT INTO public.products (name, description, price, tags, seller_email) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, description || '', parseFloat(price), tags || [], userEmail]);
        return json(res, 201, rows[0]);
      }

      if (method === 'PUT' && id) {
        const { name, description, price, tags } = req.body;
        const cond = isAdmin ? 'id=$5' : 'id=$5 AND seller_email=$6';
        const params = isAdmin ? [name, description || '', parseFloat(price), tags || [], id] : [name, description || '', parseFloat(price), tags || [], id, userEmail];
        const { rows } = await pool.query(`UPDATE public.products SET name=$1, description=$2, price=$3, tags=$4 WHERE ${cond} RETURNING *`, params);
        if (rows.length === 0) return json(res, 404, { error: 'Not found or not yours' });
        return json(res, 200, rows[0]);
      }

      if (method === 'DELETE' && id) {
        const cond = isAdmin ? 'id=$1' : 'id=$1 AND seller_email=$2';
        const params = isAdmin ? [id] : [id, userEmail];
        const { rowCount } = await pool.query(`DELETE FROM public.products WHERE ${cond}`, params);
        if (rowCount === 0) return json(res, 404, { error: 'Not found or not yours' });
        return json(res, 200, { success: true });
      }
    }

    // --- ORDERS ---
    if (resource === 'orders') {
      // POST /api/orders — buy a product (simulated payment)
      if (method === 'POST') {
        const requester = await getRequester(req.headers['x-user-email']);
        if (!requester) return json(res, 401, { error: 'Authentication required' });
        const { product_id } = req.body;
        if (!product_id) return json(res, 400, { error: 'product_id required' });
        const { rows: prods } = await pool.query('SELECT * FROM public.products WHERE id = $1', [product_id]);
        if (prods.length === 0) return json(res, 404, { error: 'Product not found' });
        const p = prods[0];
        // Check not buying own product
        if (p.seller_email === requester.email) return json(res, 400, { error: 'Cannot buy your own product' });
        const price = parseFloat(p.price);
        const commission = parseFloat((price * COMMISSION_RATE).toFixed(2));
        const net = parseFloat((price - commission).toFixed(2));
        const { rows } = await pool.query('INSERT INTO orders (product_id, product_name, product_price, commission, net_amount, buyer_email, buyer_name, seller_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [p.id, p.name, price, commission, net, requester.email, requester.name, p.seller_email]);
        return json(res, 201, rows[0]);
      }

      // GET /api/orders?buyer=email or ?seller=email
      if (method === 'GET') {
        const q = urlMod.parse(req.url, true).query;
        let rows;
        if (q.buyer) {
          rows = (await pool.query('SELECT * FROM orders WHERE buyer_email = $1 ORDER BY created_at DESC', [q.buyer])).rows;
        } else if (q.seller) {
          rows = (await pool.query('SELECT * FROM orders WHERE seller_email = $1 ORDER BY created_at DESC', [q.seller])).rows;
        } else {
          rows = (await pool.query('SELECT * FROM orders ORDER BY created_at DESC')).rows;
        }
        return json(res, 200, rows);
      }
    }

    // --- REVIEWS ---
    if (resource === 'reviews') {
      // POST /api/reviews — add review (must have purchased)
      if (method === 'POST') {
        const requester = await getRequester(req.headers['x-user-email']);
        if (!requester) return json(res, 401, { error: 'Authentication required' });
        const { product_id, rating, comment } = req.body;
        if (!product_id || !rating) return json(res, 400, { error: 'product_id and rating required' });
        if (rating < 1 || rating > 5) return json(res, 400, { error: 'Rating must be 1-5' });
        // Check purchase
        const { rows: orders } = await pool.query('SELECT id FROM orders WHERE product_id = $1 AND buyer_email = $2 LIMIT 1', [product_id, requester.email]);
        if (orders.length === 0) return json(res, 403, { error: 'You must purchase this product to review it' });
        try {
          const { rows } = await pool.query('INSERT INTO reviews (product_id, user_email, user_name, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *', [product_id, requester.email, requester.name, Math.round(rating), comment || '']);
          return json(res, 201, rows[0]);
        } catch (e) {
          if (e.code === '23505') return json(res, 400, { error: 'You already reviewed this product' });
          throw e;
        }
      }

      // GET /api/reviews?product_id=X
      if (method === 'GET') {
        const q = urlMod.parse(req.url, true).query;
        if (!q.product_id) return json(res, 400, { error: 'product_id required' });
        const { rows } = await pool.query('SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC', [parseInt(q.product_id)]);
        return json(res, 200, rows);
      }
    }

    // --- SELLER STATS (with sales) ---
    if (resource === 'seller-stats' && method === 'GET') {
      const requester = await getRequester(req.headers['x-user-email']);
      if (!requester) return json(res, 401, { error: 'Authentication required' });
      const email = requester.email;
      const { rows: prodRows } = await pool.query('SELECT COUNT(*) AS cnt, COALESCE(SUM(price), 0) AS total FROM public.products WHERE seller_email = $1', [email]);
      const { rows: ordRows } = await pool.query("SELECT COUNT(*) AS cnt, COALESCE(SUM(product_price), 0) AS gross, COALESCE(SUM(net_amount), 0) AS net FROM orders WHERE seller_email = $1 AND status = 'completed'", [email]);
      const totalProducts = parseInt(prodRows[0].cnt);
      const totalGross = parseFloat(prodRows[0].total);
      const commission = parseFloat((totalGross * COMMISSION_RATE).toFixed(2));
      const totalNet = parseFloat((totalGross - commission).toFixed(2));
      const totalSales = parseInt(ordRows[0].cnt);
      const salesRevenue = parseFloat(ordRows[0].gross);
      const salesNet = parseFloat(ordRows[0].net);
      return json(res, 200, { totalProducts, totalGross, commissionRate: COMMISSION_RATE, commission, totalNet, totalSales, salesRevenue, salesNet });
    }

    // --- USERS (admin only) ---
    if (resource === 'users') {
      const requester = await getRequester(req.headers['x-user-email']);
      if (!requester || requester.role !== 'admin') return json(res, 403, { error: 'Admin required' });
      if (method === 'GET') {
        const { rows } = await pool.query("SELECT id, name, email, role, created_at FROM public.users WHERE role != 'admin' OR role IS NULL ORDER BY created_at DESC");
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
      const { rows: uc } = await pool.query('SELECT COUNT(*) AS c FROM public.users');
      const { rows: pc } = await pool.query('SELECT COUNT(*) AS c FROM public.products');
      const { rows: ar } = await pool.query("SELECT COUNT(*) AS c FROM public.users WHERE role = 'admin'");
      const { rows: oc } = await pool.query("SELECT COUNT(*) AS c, COALESCE(SUM(product_price), 0) AS rev FROM orders WHERE status = 'completed'");
      return json(res, 200, { totalUsers: parseInt(uc[0].c), totalProducts: parseInt(pc[0].c), adminCount: parseInt(ar[0].c), regularCount: parseInt(uc[0].c) - parseInt(ar[0].c), totalOrders: parseInt(oc[0].c), totalRevenue: parseFloat(oc[0].rev) });
    }

    // --- CHAT ---
    if (resource === 'chat') {
      if (id === 'rooms' && method === 'GET') {
        const { rows } = await pool.query('SELECT * FROM chat_rooms ORDER BY id');
        return json(res, 200, rows);
      }
      if (id === 'rooms' && method === 'POST') {
        const { name } = req.body;
        if (!name || !name.trim()) return json(res, 400, { error: 'Room name required' });
        const { rows } = await pool.query('INSERT INTO chat_rooms (name) VALUES ($1) RETURNING *', [name.trim()]);
        return json(res, 201, rows[0]);
      }
      if (id === 'messages' && method === 'GET') {
        const q = urlMod.parse(req.url, true).query;
        const roomId = parseInt(q.room_id);
        if (!roomId) return json(res, 400, { error: 'room_id required' });
        let result;
        if (q.since_id) {
          result = await pool.query('SELECT * FROM chat_messages WHERE room_id = $1 AND id > $2 ORDER BY id ASC LIMIT 100', [roomId, parseInt(q.since_id)]);
        } else {
          result = await pool.query('SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY id DESC LIMIT 50', [roomId]);
          result.rows.reverse();
        }
        return json(res, 200, result.rows);
      }
      if (id === 'messages' && method === 'POST') {
        const { room_id, sender_name, message } = req.body;
        if (!room_id || !sender_name || !message) return json(res, 400, { error: 'room_id, sender_name, message required' });
        if (sender_name.length > 50 || message.length > 2000) return json(res, 400, { error: 'Name max 50, message max 2000 chars' });
        const { rows } = await pool.query('INSERT INTO chat_messages (room_id, sender_name, message) VALUES ($1, $2, $3) RETURNING *', [room_id, sender_name, message]);
        return json(res, 201, rows[0]);
      }
      if (id === 'heartbeat' && method === 'POST') {
        const { username, room_id } = req.body;
        if (!username || !room_id) return json(res, 400, { error: 'username, room_id required' });
        await pool.query('INSERT INTO chat_online (username, room_id, last_seen) VALUES ($1, $2, NOW()) ON CONFLICT (username, room_id) DO UPDATE SET last_seen = NOW()', [username, room_id]);
        return json(res, 200, { success: true });
      }
      if (id === 'online' && method === 'GET') {
        const q = urlMod.parse(req.url, true).query;
        const roomId = parseInt(q.room_id);
        if (!roomId) return json(res, 400, { error: 'room_id required' });
        await pool.query("DELETE FROM chat_online WHERE room_id = $1 AND last_seen < NOW() - INTERVAL '10 seconds'", [roomId]);
        const { rows } = await pool.query('SELECT username, last_seen FROM chat_online WHERE room_id = $1 ORDER BY last_seen DESC', [roomId]);
        return json(res, 200, rows);
      }
    }

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Server error' });
  }
};
