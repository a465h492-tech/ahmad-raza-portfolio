'use client';

import { useState, useEffect, useRef } from 'react';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp?: number }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('portfolio_chat');
    if (saved) {
      const parsed = JSON.parse(saved);
      setMessages(parsed);
      if (parsed.length > 0) setShowSuggestions(false);
    }
    setApiKey(localStorage.getItem('portfolio_chat_key') || '');
    setProvider(localStorage.getItem('portfolio_chat_provider') || 'openai');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
        body: JSON.stringify({ messages: [...messages, userMsg], apiKey, provider }),
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
      localStorage.setItem('portfolio_chat', JSON.stringify(finalMessages));
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'error', content: 'Error: ' + err.message }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('portfolio_chat');
    setShowSuggestions(true);
  };

  const saveSettings = () => {
    localStorage.setItem('portfolio_chat_key', apiKey);
    localStorage.setItem('portfolio_chat_provider', provider);
    setShowSettings(false);
  };

  const suggestions = [
    { label: 'Who is Ahmad Raza?', prompt: 'Who is Ahmad Raza?' },
    { label: 'Projects built', prompt: 'What projects has Ahmad built?' },
    { label: 'Top skills', prompt: "What are Ahmad's top skills?" },
    { label: 'Contact info', prompt: 'How can I contact Ahmad?' },
  ];

  return (
    <div id="chatbot-widget">
      <button id="chatbot-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Open chatbot">
        <i className="fas fa-comment-dots"></i>
      </button>

      {isOpen && (
        <div id="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <i className="fas fa-robot"></i>
              <span>AI Assistant</span>
            </div>
            <div className="chatbot-header-right">
              <button className="chatbot-icon-btn" title="New Chat" onClick={clearChat}>
                <i className="fas fa-trash-alt"></i>
              </button>
              <button className="chatbot-icon-btn" title="Settings" onClick={() => setShowSettings(!showSettings)}>
                <i className="fas fa-cog"></i>
              </button>
              <button className="chatbot-icon-btn" title="Close" onClick={() => setIsOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="chatbot-settings">
              <label>API Key</label>
              <div className="chatbot-input-group">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <label>Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
              </select>
              <button className="chatbot-btn-sm" onClick={saveSettings}>Save</button>
            </div>
          )}

          <div id="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-msg bot">
                <div className="chatbot-avatar"><i className="fas fa-robot"></i></div>
                <div className="chatbot-bubble">Hi! I&apos;m your AI assistant. Click ⚙️ to set your API key, then ask me anything.</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.role}`}>
                <div className="chatbot-avatar">
                  <i className={`fas ${msg.role === 'user' ? 'fa-user' : msg.role === 'error' ? 'fa-exclamation-triangle' : 'fa-robot'}`}></i>
                </div>
                <div className="chatbot-bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                {msg.timestamp && <div className="chatbot-timestamp">{formatTime(msg.timestamp)}</div>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {showSuggestions && messages.length === 0 && (
            <div className="chatbot-suggested-prompts">
              {suggestions.map((s) => (
                <button key={s.label} className="chatbot-suggestion-chip" onClick={() => handleSend(s.prompt)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <form
            id="chatbot-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
          >
            <input
              ref={inputRef}
              id="chatbot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
              disabled={isStreaming}
            />
            <button type="submit" id="chatbot-send" disabled={isStreaming || !input.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text: string): string {
  if (typeof window === 'undefined') return text;
  try {
    const { marked } = require('marked');
    const { hljs } = require('highlight.js');
    marked.setOptions({
      highlight: (code: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true,
    });
    return marked.parse(text);
  } catch {
    return text.replace(/\n/g, '<br/>');
  }
}
