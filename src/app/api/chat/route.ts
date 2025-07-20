export const maxDuration = 30;

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 2000; // 2 seconds
const rateLimitMap = new Map<string, number>();

export async function POST(req: Request) {
  const totalStart = Date.now();
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const lastRequest = rateLimitMap.get(ip);
    if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
      return new Response(JSON.stringify({ error: 'You are sending messages too quickly. Please wait a moment before trying again.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    rateLimitMap.set(ip, now);

    // Parse the incoming request body for messages
    const body = await req.json();
    const messages = body.messages || [];
    const requestedModel = body.model;

    // Validate message length (last user message)
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (typeof lastMsg.content !== 'string' || lastMsg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(JSON.stringify({ error: `Message too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Ensure the Together AI API key and model are available
    const apiKey = process.env.TOGETHER_API_KEY;
    const model = requestedModel || process.env.TOGETHER_MODEL || "togethercomputer/llama-2-70b-chat";
    if (!apiKey) {
      return new Response('Together AI API key not set in environment.', { status: 500 });
    }

    // Remove dedicated model check and error

    // Call Together AI's chat completions endpoint
    const aiStart = Date.now();
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 1024,
      }),
    });
    const aiEnd = Date.now();
    console.log('Together AI response time:', aiEnd - aiStart, 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Together AI error: ${response.status} ${response.statusText} - ${errorText}`, { status: 500 });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || 'No response from AI.';

    const totalEnd = Date.now();
    console.log('Total /api/chat POST time:', totalEnd - totalStart, 'ms');

    return new Response(JSON.stringify({ content: aiReply }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const totalEnd = Date.now();
    console.log('Total /api/chat POST time (error):', totalEnd - totalStart, 'ms');
    return new Response(`Server error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}