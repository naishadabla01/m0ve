export async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const ok = res.ok;

  // Try JSON; if it fails, return a readable error with a snippet
  try {
    const json = JSON.parse(text);
    if (!ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  } catch {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`[${res.status}] Non-JSON response from ${url}\n${snippet}`);
  }
}
