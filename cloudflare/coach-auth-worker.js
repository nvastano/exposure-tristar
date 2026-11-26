/**
 * Coach Auth Worker
 *
 * Deploy to Cloudflare Workers, then add a Secret named PASSWORD
 * via: Dashboard → Workers → coach-auth → Settings → Variables → Add Secret
 * or:  wrangler secret put PASSWORD
 *
 * Set the allowed origin to your site domain.
 *
 * On a correct password this now also mints a signed, time-limited token
 * (HMAC-SHA256 over an expiry timestamp, keyed by PASSWORD). The Sheets
 * Apps Script backend verifies that same token server-side before handing
 * back anything coach-only (player/parent profiles, birth certificates),
 * instead of trusting the browser's own "unlocked" flag the way it used to.
 *
 * IMPORTANT: the Apps Script project's Script Property COACH_PASSWORD must
 * be set to this exact same value as the PASSWORD secret below, or token
 * verification there will always fail.
 */

const ALLOWED_ORIGINS = [
  "https://teameliteprimetn.com",
  "https://www.teameliteprimetn.com",
  "https://nvastano.github.io",
];

const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false }, 400, allowedOrigin);
    }

    const correct = Boolean(env.PASSWORD) && body.password === env.PASSWORD;
    if (!correct) {
      return json({ ok: false }, 401, allowedOrigin);
    }

    const expiresAt = Date.now() + TOKEN_LIFETIME_MS;
    const sig = await signExpiry(env.PASSWORD, expiresAt);
    const token = `${expiresAt}.${sig}`;

    return json({ ok: true, token, expiresAt }, 200, allowedOrigin);
  },
};

async function signExpiry(secret, expiresAt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expiresAt)));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
    },
  });
}
