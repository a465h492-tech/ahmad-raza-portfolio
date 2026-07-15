const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const apiKeyInput = document.getElementById('api-key');
const apiProvider = document.getElementById('api-provider');
const systemPrompt = document.getElementById('system-prompt');
const saveSettings = document.getElementById('save-settings');
const clearChat = document.getElementById('clear-chat');
const toggleKey = document.getElementById('toggle-key');
const suggestedPrompts = document.getElementById('suggested-prompts');

let messages = JSON.parse(localStorage.getItem('chatbot_messages') || '[]');
let isStreaming = false;

marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  const raw = marked.parse(text);
  const tmp = document.createElement('div');
  tmp.innerHTML = raw;
  tmp.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (code) {
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.innerHTML = '<i class="fas fa-copy"></i>';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
          btn.innerHTML = '<i class="fas fa-check"></i>';
          btn.classList.add('copied');
          setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; btn.classList.remove('copied'); }, 1500);
        });
      });
      pre.appendChild(btn);
    }
  });
  return tmp.innerHTML;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(text, timestamp) {
  const div = document.createElement('div');
  div.className = 'message bot';
  const tsHtml = timestamp ? `<div class="msg-timestamp">${formatTime(timestamp)}</div>` : '';
  div.innerHTML = `
    <div class="avatar"><i class="fas fa-robot"></i></div>
    <div class="bubble">${renderMarkdown(text)}</div>
    <button class="copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
    ${tsHtml}
  `;
  const copyBtn = div.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; copyBtn.classList.remove('copied'); }, 1500);
    });
  });
  chatMessages.appendChild(div);
  scrollToBottom();
}

function addUserMessage(text, timestamp) {
  const div = document.createElement('div');
  div.className = 'message user';
  const tsHtml = timestamp ? `<div class="msg-timestamp">${formatTime(timestamp)}</div>` : '';
  div.innerHTML = `
    <div class="avatar"><i class="fas fa-user"></i></div>
    <div class="bubble">${escapeHtml(text)}</div>
    <button class="copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
    ${tsHtml}
  `;
  const copyBtn = div.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; copyBtn.classList.remove('copied'); }, 1500);
    });
  });
  chatMessages.appendChild(div);
  scrollToBottom();
}

function addErrorMessage(text) {
  const div = document.createElement('div');
  div.className = 'message error';
  div.innerHTML = `
    <div class="avatar"><i class="fas fa-exclamation-triangle"></i></div>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function createStreamingMsg() {
  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = 'streaming-msg';
  div.innerHTML = `
    <div class="avatar"><i class="fas fa-robot"></i></div>
    <div class="bubble streaming-cursor"></div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
  return div.querySelector('.bubble');
}

function finalizeStreaming(fullText, timestamp) {
  const streamDiv = document.getElementById('streaming-msg');
  if (!streamDiv) return;
  streamDiv.removeAttribute('id');
  const bubble = streamDiv.querySelector('.bubble');
  bubble.classList.remove('streaming-cursor');
  bubble.innerHTML = renderMarkdown(fullText);
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(fullText).then(() => {
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; copyBtn.classList.remove('copied'); }, 1500);
    });
  });
  streamDiv.appendChild(copyBtn);
  if (timestamp) {
    const tsDiv = document.createElement('div');
    tsDiv.className = 'msg-timestamp';
    tsDiv.textContent = formatTime(timestamp);
    streamDiv.appendChild(tsDiv);
  }
  scrollToBottom();
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'message bot typing-indicator';
  div.id = 'typing';
  div.innerHTML = `
    <div class="avatar"><i class="fas fa-robot"></i></div>
    <div class="bubble"><span></span><span></span><span></span></div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

function hideSuggestions() {
  if (suggestedPrompts) suggestedPrompts.style.display = 'none';
}

function loadSettings() {
  apiKeyInput.value = localStorage.getItem('chatbot_api_key') || '';
  apiProvider.value = localStorage.getItem('chatbot_provider') || 'openai';
  systemPrompt.value = localStorage.getItem('chatbot_system_prompt') || 'You are a helpful, friendly AI assistant. Be concise and clear in your responses.';
}

function saveSettingsToStorage() {
  localStorage.setItem('chatbot_api_key', apiKeyInput.value);
  localStorage.setItem('chatbot_provider', apiProvider.value);
  localStorage.setItem('chatbot_system_prompt', systemPrompt.value);
  settingsPanel.classList.add('hidden');
}

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

saveSettings.addEventListener('click', saveSettingsToStorage);

toggleKey.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleKey.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
});

clearChat.addEventListener('click', () => {
  messages = [];
  localStorage.removeItem('chatbot_messages');
  chatMessages.querySelectorAll('.message').forEach(m => m.remove());
  if (suggestedPrompts) suggestedPrompts.style.display = '';
  addBotMessage("Chat cleared. How can I help you?", Date.now());
});

async function streamOpenAI(msgs, onChunk) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeyInput.value}` },
    body: JSON.stringify({ model: 'gpt-3.5-turbo', stream: true, messages: [{ role: 'system', content: systemPrompt.value }, ...msgs] })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return full;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) { full += delta; onChunk(full); }
      } catch (e) {}
    }
  }
  return full;
}

async function streamGemini(msgs, onChunk) {
  const contents = msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?alt=sse&key=${apiKeyInput.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt.value }] } })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { full += text; onChunk(full); }
      } catch (e) {}
    }
  }
  return full;
}

async function handleSend(text) {
  if (isStreaming) return;
  if (!apiKeyInput.value) {
    addErrorMessage('Please set your API key in settings first (click ⚙️).');
    return;
  }

  userInput.value = '';
  addUserMessage(text, Date.now());
  messages.push({ role: 'user', content: text, timestamp: Date.now() });
  hideSuggestions();

  isStreaming = true;
  sendBtn.disabled = true;
  createStreamingMsg();

  try {
    const provider = apiProvider.value;
    const streamFn = provider === 'openai' ? streamOpenAI : streamGemini;
    const reply = await streamFn(messages.slice(0, -1), (partial) => {
      const bubble = document.querySelector('#streaming-msg .bubble');
      if (bubble) { bubble.innerHTML = renderMarkdown(partial) + '<span class="streaming-cursor"></span>'; scrollToBottom(); }
    });
    const ts = Date.now();
    finalizeStreaming(reply, ts);
    messages.push({ role: 'assistant', content: reply, timestamp: ts });
    localStorage.setItem('chatbot_messages', JSON.stringify(messages));
  } catch (err) {
    const streamDiv = document.getElementById('streaming-msg');
    if (streamDiv) streamDiv.remove();
    addErrorMessage('Error: ' + err.message);
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text || isStreaming) return;
  await handleSend(text);
});

document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', async () => {
    const prompt = chip.getAttribute('data-prompt');
    if (prompt && !isStreaming) await handleSend(prompt);
  });
});

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

loadSettings();
if (messages.length > 0) {
  messages.forEach(m => {
    if (m.role === 'user') addUserMessage(m.content, m.timestamp);
    else addBotMessage(m.content, m.timestamp);
  });
  if (suggestedPrompts) suggestedPrompts.style.display = 'none';
}
