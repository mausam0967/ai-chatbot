export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Parse the incoming request body for messages
    const body = await req.json();
    const messages = body.messages || [];
    const requestedModel = body.model;

    // Ensure the Together AI API key and model are available
    const apiKey = process.env.TOGETHER_API_KEY;
    const model = requestedModel || process.env.TOGETHER_MODEL || "togethercomputer/llama-2-70b-chat";
    if (!apiKey) {
      return new Response('Together AI API key not set in environment.', { status: 500 });
    }

    // Call Together AI's chat completions endpoint
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

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Together AI error: ${response.status} ${response.statusText} - ${errorText}`, { status: 500 });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || 'No response from AI.';

    return new Response(JSON.stringify({ content: aiReply }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(`Server error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}