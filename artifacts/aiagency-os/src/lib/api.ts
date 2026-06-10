// Calls the GiassAi backend (OpenAI JSON endpoint) and logs the parsed JSON
// response to the browser console. The API server is served at the absolute
// "/api" path on the same origin as this app, so a relative URL is all we need
// (the shared proxy handles cross-service routing).
export async function sendToGiassAi(message: string): Promise<void> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[GiassAi] Richiesta fallita:", res.status, errBody);
      return;
    }

    const data = await res.json();
    console.log("[GiassAi] Risposta JSON:", data);
  } catch (err) {
    console.error("[GiassAi] Errore di rete:", err);
  }
}
