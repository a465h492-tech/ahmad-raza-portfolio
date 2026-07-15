'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp?: number }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful, friendly AI assistant. Be concise and clear in your responses.');
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('chatbot_messages');
    if (saved) {
      const parsed = JSON.parse(saved);
      setMessages(parsed);
      if (parsed.length > 0) setShowSuggestions(false);
    }
    setApiKey(localStorage.getItem('chatbot_api_key') || '');
    setProvider(localStorage.getItem('chatbot_provider') || 'openai');
    setSystemPrompt(localStorage.getItem('chatbot_system_prompt') || 'You are a helpful, friendly AI assistant. Be concise and clear in your responses.');

    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming || !apiKey) return;

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], apiKey, provider, systemPrompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      const streamingMsg = { role: 'assistant', content: '', timestamp: Date.now() };
      setMessages((prev) => [...prev, streamingMsg]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: full };
            return updated;
          });
        }
      }

      const finalMessages = [...messages, userMsg, { role: 'assistant', content: full, timestamp: Date.now() }];
      localStorage.setItem('chatbot_messages', JSON.stringify(finalMessages));
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'error', content: 'Error: ' + err.message }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chatbot_messages');
    setShowSuggestions(true);
  };

  const saveSettings = () => {
    localStorage.setItem('chatbot_api_key', apiKey);
    localStorage.setItem('chatbot_provider', provider);
    localStorage.setItem('chatbot_system_prompt', systemPrompt);
    setShowSettings(false);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  const suggestions = [
    { label: 'Explain quantum computing', prompt: 'Explain quantum computing in simple terms' },
    { label: 'Write a poem', prompt: 'Write a short poem about the ocean' },
    { label: 'Web dev tips', prompt: 'What are the best practices for web development?' },
    { label: 'Fun fact', prompt: 'Tell me an interesting fun fact' },
  ];

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-left">
          <i className="fas fa-robot"></i>
          <div>
            <h1>AI Chatbot</h1>
            <span className="status">Online</span>
          </div>
        </div>
        <div className="header-right">
          <button className="icon-btn" title="New Chat" onClick={clearChat}><i className="fas fa-trash-alt"></i></button>
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(!showSettings)}><i className="fas fa-cog"></i></button>
          <button className="icon-btn" title="Theme" onClick={toggleTheme}><i className="fas fa-moon"></i></button>
          <Link href="/" className="icon-btn" title="Back to Portfolio"><i className="fas fa-arrow-left"></i></Link>
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content">
            <h3><i className="fas fa-cog"></i> Settings</h3>
            <label>API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your API key" />
            <label>Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
            <label>System Prompt</label>
            <textarea rows={3} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="You are a helpful assistant..." />
            <div className="settings-actions">
              <button className="btn-sm" onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-messages" id="chat-messages">
        {messages.length === 0 && (
          <div className="message bot">
            <div className="avatar"><i className="fas fa-robot"></i></div>
            <div className="bubble">Hi! I&apos;m your AI assistant. Ask me anything. Click the ⚙️ icon to set up your API key first.</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="avatar">
              <i className={`fas ${msg.role === 'user' ? 'fa-user' : msg.role === 'error' ? 'fa-exclamation-triangle' : 'fa-robot'}`}></i>
            </div>
            <div className="bubble" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
            {msg.timestamp && <div className="msg-timestamp">{formatTime(msg.timestamp)}</div>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showSuggestions && messages.length === 0 && (
        <div className="suggested-prompts">
          {suggestions.map((s) => (
            <button key={s.label} className="suggestion-chip" onClick={() => handleSend(s.prompt)}>{s.label}</button>
          ))}
        </div>
      )}

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>
        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." autoComplete="off" disabled={isStreaming} />
        <button type="submit" id="send-btn" disabled={isStreaming || !input.trim()}><i className="fas fa-paper-plane"></i></button>
      </form>
    </div>
  );
}
