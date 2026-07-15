import Link from 'next/link';

const games = [
  { name: 'Tetris', year: 1985, genre: 'Puzzle', desc: 'The most iconic puzzle game ever created.', color: '#e94560' },
  { name: 'Minecraft', year: 2011, genre: 'Sandbox', desc: 'A blocky world of unlimited creativity.', color: '#4ecca3' },
  { name: 'GTA V', year: 2013, genre: 'Action-Adventure', desc: 'Open-world crime epic.', color: '#f39c12' },
  { name: 'Pac-Man', year: 1980, genre: 'Arcade', desc: 'The original arcade legend.', color: '#f1c40f' },
  { name: 'Super Mario Bros', year: 1985, genre: 'Platformer', desc: 'Nintendo\'s world-famous plumber.', color: '#e74c3c' },
  { name: 'The Witcher 3', year: 2015, genre: 'RPG', desc: 'A masterclass in storytelling.', color: '#9b59b6' },
  { name: 'Fortnite', year: 2017, genre: 'Battle Royale', desc: 'The game that defined a generation.', color: '#3498db' },
  { name: 'PUBG', year: 2017, genre: 'Battle Royale', desc: 'The original battle royale.', color: '#2ecc71' },
  { name: 'FIFA', year: 1993, genre: 'Sports', desc: 'The world\'s most popular football game.', color: '#1abc9c' },
  { name: 'Call of Duty', year: 2003, genre: 'FPS', desc: 'The king of first-person shooters.', color: '#34495e' },
];

export default function GamesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: '2rem' }}>Top 10 Most Famous Games</h1>
          <Link href="/" style={{ color: '#e94560', textDecoration: 'none', fontWeight: 600 }}>&larr; Back</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {games.map((game, i) => (
            <div key={i} style={{
              background: '#1a1a2e', borderRadius: 16, padding: 24, border: '1px solid #2a2a3e',
              transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: game.color }}>#{i + 1}</span>
                <span style={{ fontSize: '0.8rem', color: '#888', background: '#2a2a3e', padding: '4px 10px', borderRadius: 20 }}>{game.genre}</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{game.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 8 }}>{game.year}</p>
              <p style={{ fontSize: '0.95rem', color: '#b0b0b0' }}>{game.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
