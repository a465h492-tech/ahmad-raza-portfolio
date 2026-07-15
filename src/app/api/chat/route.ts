import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages, apiKey, provider } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), { status: 400 });
  }

  const systemMsg = { role: 'system', content: 'You are a helpful assistant. Be concise.' };

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          stream: true,
          messages: [systemMsg, ...messages.map((m: any) => ({ role: m.role, content: m.content }))],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: err.error?.message || `HTTP ${res.status}` }), { status: res.status });
      }

      return new Response(res.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    if (provider === 'gemini') {
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemMsg.content }] } }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: err.error?.message || `HTTP ${res.status}` }), { status: res.status });
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) { controller.close(); return; }
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              try {
                const json = JSON.parse(trimmed.slice(6));
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(new TextEncoder().encode(text));
              } catch {}
            }
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown provider' }), { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
