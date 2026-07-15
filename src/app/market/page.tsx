'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User { name: string; email: string; password: string; role: string; }
interface Product { id: number; name: string; desc: string; price: string; tags: string; }

const PRODUCTS: Product[] = [
  { id: 1, name: 'Starter Template', desc: 'A ready-to-use HTML/CSS/JS template.', price: '$19', tags: 'HTML,CSS,JS' },
  { id: 2, name: 'React Dashboard', desc: 'Admin dashboard built with React.', price: '$49', tags: 'React,Dashboard' },
  { id: 3, name: 'API Toolkit', desc: 'Node.js API scaffolding tool.', price: '$29', tags: 'Node,API' },
  { id: 4, name: 'Design System', desc: 'UI component library with tokens.', price: '$39', tags: 'Design,UI' },
  { id: 5, name: 'SEO Plugin', desc: 'Next.js SEO optimization plugin.', price: '$15', tags: 'Next.js,SEO' },
  { id: 6, name: 'Auth Starter', desc: 'Firebase authentication boilerplate.', price: '$25', tags: 'Firebase,Auth' },
];

const ADMIN_HASH = '98d58700704e5c5ebc932658a730d682f8a26f23ef618a753d252e5898e1e959'; // SHA-256 of 'admin123'

export default function MarketPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mh_user');
    if (saved) setUser(JSON.parse(saved));
    const savedProducts = localStorage.getItem('mh_products');
    if (savedProducts) setProducts(JSON.parse(savedProducts));
  }, []);

  const hashPassword = async (pw: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pw);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (email: string, password: string) => {
    const hashed = await hashPassword(password);
    const users: User[] = JSON.parse(localStorage.getItem('mh_users') || '[]');
    const found = users.find(u => u.email === email && u.password === hashed);
    if (found) {
      setUser(found);
      localStorage.setItem('mh_user', JSON.stringify(found));
      setShowAuth(false);
      setAuthError('');
    } else {
      setAuthError('Invalid email or password');
    }
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setAuthError('Password must be 8+ chars, include uppercase and number');
      return;
    }
    const users: User[] = JSON.parse(localStorage.getItem('mh_users') || '[]');
    if (users.some(u => u.email === email)) { setAuthError('Email already registered'); return; }
    const hashed = await hashPassword(password);
    const newUser = { name, email, password: hashed, role: 'user' };
    users.push(newUser);
    localStorage.setItem('mh_users', JSON.stringify(users));
    setUser(newUser);
    localStorage.setItem('mh_user', JSON.stringify(newUser));
    setShowAuth(false);
    setAuthError('');
  };

  const logout = () => { setUser(null); localStorage.removeItem('mh_user'); setShowAdmin(false); };

  const saveProduct = (p: Product) => {
    let updated: Product[];
    if (editProduct) { updated = products.map(pr => pr.id === p.id ? p : pr); }
    else { updated = [...products, { ...p, id: Date.now() }]; }
    setProducts(updated);
    localStorage.setItem('mh_products', JSON.stringify(updated));
    setEditProduct(null);
  };

  const deleteProduct = (id: number) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    localStorage.setItem('mh_products', JSON.stringify(updated));
  };

  const isAdmin = user?.role === 'admin';

  if (showAdmin && isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
          <button onClick={() => setShowAdmin(false)} style={{ background: 'none', border: 'none', color: '#6c63ff', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>&larr; Back to Store</button>
          <h1>Admin Dashboard</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '20px 0 30px' }}>
            {[
              { label: 'Total Products', value: products.length, color: '#6c63ff' },
              { label: 'Total Users', value: JSON.parse(localStorage.getItem('mh_users') || '[]').length, color: '#2ecc71' },
              { label: 'Revenue', value: '$' + products.length * 29, color: '#f39c12' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <h2 style={{ marginBottom: 15 }}>{editProduct ? 'Edit Product' : 'Add Product'}</h2>
          <div style={{ background: '#fff', padding: 25, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
            <input placeholder="Name" defaultValue={editProduct?.name || ''} style={{ padding: 12, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} id="prodName" />
            <input placeholder="Description" defaultValue={editProduct?.desc || ''} style={{ padding: 12, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} id="prodDesc" />
            <input placeholder="Price" defaultValue={editProduct?.price || ''} style={{ padding: 12, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} id="prodPrice" />
            <input placeholder="Tags (comma-separated)" defaultValue={editProduct?.tags || ''} style={{ padding: 12, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} id="prodTags" />
            <button onClick={() => {
              const name = (document.getElementById('prodName') as HTMLInputElement).value;
              const desc = (document.getElementById('prodDesc') as HTMLInputElement).value;
              const price = (document.getElementById('prodPrice') as HTMLInputElement).value;
              const tags = (document.getElementById('prodTags') as HTMLInputElement).value;
              if (name && price) saveProduct({ id: editProduct?.id || 0, name, desc, price, tags });
            }} style={{ padding: '12px 28px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
              {editProduct ? 'Update' : 'Add'} Product
            </button>
          </div>

          <h2 style={{ marginBottom: 15 }}>Products</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <thead><tr style={{ background: '#6c63ff', color: '#fff' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tags</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Actions</th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>{p.name}</td>
                  <td style={{ padding: '12px 16px' }}>{p.price}</td>
                  <td style={{ padding: '12px 16px' }}>{p.tags}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setEditProduct(p)} style={{ background: '#6c63ff', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', marginRight: 5 }}>Edit</button>
                    <button onClick={() => deleteProduct(p.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#333', background: '#f8f9fa' }}>
      <header>
        <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6c63ff', textDecoration: 'none' }}><i className="fas fa-store"></i> MarketHub</Link>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            {user ? (
              <>
                <span style={{ color: '#666' }}>Hi, {user.name}</span>
                {isAdmin && <button onClick={() => setShowAdmin(true)} style={{ background: '#6c63ff', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Admin</button>}
                <button onClick={logout} style={{ background: 'none', border: '1px solid #6c63ff', color: '#6c63ff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => { setShowAuth(true); setAuthMode('login'); }} style={{ background: 'none', border: '1px solid #6c63ff', color: '#6c63ff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Login</button>
                <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ background: '#6c63ff', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Sign Up</button>
              </>
            )}
            <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>&larr; Portfolio</Link>
          </div>
        </nav>
      </header>

      {showAuth && (
        <div onClick={() => setShowAuth(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 40, borderRadius: 12, width: '90%', maxWidth: 420, position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setShowAuth(false)} style={{ position: 'absolute', top: 15, right: 20, fontSize: '1.5rem', cursor: 'pointer', color: '#999', background: 'none', border: 'none' }}>&times;</button>
            <h2 style={{ marginBottom: 20, textAlign: 'center' }}>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
            {authError && <p style={{ color: '#e74c3c', textAlign: 'center', marginBottom: 10 }}>{authError}</p>}
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); if (authMode === 'login') handleLogin(fd.get('email') as string, fd.get('password') as string); else handleSignup(fd.get('name') as string, fd.get('email') as string, fd.get('password') as string); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {authMode === 'signup' && <input name="name" placeholder="Full Name" required style={{ padding: 14, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} />}
              <input name="email" type="email" placeholder="Email" required style={{ padding: 14, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} />
              <input name="password" type="password" placeholder="Password" required style={{ padding: 14, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: '1rem' }} />
              <button type="submit" style={{ padding: 14, background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                {authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 15, color: '#666' }}>
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <a onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} style={{ color: '#6c63ff', cursor: 'pointer', fontWeight: 600 }}>
                {authMode === 'login' ? 'Sign Up' : 'Login'}
              </a>
            </p>
          </div>
        </div>
      )}

      <section style={{ padding: '100px 0', textAlign: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: 15 }}>Welcome to <span style={{ color: '#6c63ff' }}>MarketHub</span></h1>
          <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: 30, maxWidth: 600, margin: '0 auto 30px' }}>A digital marketplace for developers. Buy and sell templates, tools, and resources.</p>
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#products" style={{ padding: '14px 32px', background: '#6c63ff', color: '#fff', textDecoration: 'none', borderRadius: 8, fontWeight: 600 }}>Browse Products</a>
            <a href="#tech" style={{ padding: '14px 32px', background: 'transparent', color: '#6c63ff', textDecoration: 'none', borderRadius: 8, fontWeight: 600, border: '2px solid #6c63ff' }}>Tech Stack</a>
          </div>
        </div>
      </section>

      <section id="products" style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 50 }}>Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {products.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', transition: 'transform 0.3s, box-shadow 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; }}>
                <div style={{ width: '100%', height: 140, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '2rem', marginBottom: 16 }}>
                  <i className="fas fa-box"></i>
                </div>
                <h3 style={{ marginBottom: 8 }}>{p.name}</h3>
                <p style={{ color: '#666', marginBottom: 12, fontSize: '0.9rem' }}>{p.desc}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {p.tags.split(',').map(t => <span key={t} style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', color: '#666' }}>{t}</span>)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#6c63ff' }}>{p.price}</span>
                  <button style={{ padding: '8px 20px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Buy Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: '#333', color: '#fff', padding: '30px 0', textAlign: 'center' }}>
        <p>&copy; {new Date().getFullYear()} MarketHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
