'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TikTokPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);

  const fetchVideo = async () => {
    if (!url.trim()) {
      setStatus('Please enter a TikTok video URL');
      setIsError(true);
      return;
    }

    setStatus('Fetching video...');
    setIsError(false);
    setLoading(true);
    setVideoData(null);

    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.code !== 0) {
        setStatus(data.msg || 'Failed to fetch video. Check the URL.');
        setIsError(true);
        setLoading(false);
        return;
      }

      setVideoData(data.data);
      setStatus('');
    } catch {
      setStatus('Network error. Try again later.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!videoData) return;
    const videoUrl = videoData.play || videoData.wmplay || videoData.hdplay;
    if (!videoUrl) {
      setStatus('No video URL available');
      setIsError(true);
      return;
    }
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `tiktok_${videoData.author?.unique_id || 'video'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const videoUrl = videoData?.play || videoData?.wmplay || videoData?.hdplay;
  const duration = videoData?.duration || 0;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        borderRadius: 24, padding: 40, maxWidth: 520, width: '100%',
        border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.48 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.37 0 .72.07 1.04.19V7.96a6.33 6.33 0 00-1.04-.09 6.33 6.33 0 106.33 6.33V9.85a8.15 8.15 0 004.77 1.5v-3.4a4.83 4.83 0 01-1-.26z" fill="#fe2c55"/>
          </svg>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>TikTok Downloader</h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14, marginBottom: 28 }}>
          Paste a TikTok video link to download
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Video URL</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchVideo()}
              placeholder="https://www.tiktok.com/@user/video/123456789"
              style={{
                flex: 1, padding: '14px 16px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                color: '#fff', fontSize: 14, outline: 'none'
              }}
            />
            <button onClick={fetchVideo} disabled={loading}
              style={{
                padding: '14px 24px', borderRadius: 12, border: 'none',
                background: '#fe2c55', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                whiteSpace: 'nowrap'
              }}>
              {loading ? '...' : 'Get Video'}
            </button>
          </div>
        </div>

        {status && (
          <p style={{ color: isError ? '#ff4d4d' : 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 13, marginBottom: 16 }}>
            {status}
          </p>
        )}

        {videoData && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', marginBottom: 16 }}>
              {videoUrl && <video src={videoUrl} controls playsInline style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain' }} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                by <span style={{ color: '#fff', fontWeight: 600 }}>{videoData.author?.nickname || 'Unknown'}</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6 }}>
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button onClick={handleDownload}
              style={{
                width: '100%', padding: 16, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #fe2c55, #ff5842)', color: '#fff',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
              Download Video
            </button>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}>&larr; Back to Portfolio</Link>
        </div>
      </div>
    </div>
  );
}
