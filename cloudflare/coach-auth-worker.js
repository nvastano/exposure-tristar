/**
 * Coach Auth Worker
 *
 * Deploy to Cloudflare Workers, then add a Secret named PASSWORD
 * via: Dashboard → Workers → coach-auth → Settings → Variables → Add Secret
 * or:  wrangler secret put PASSWORD
 *
 * Set the allowed origin to your site domain.
 */

const ALLOWED_ORIGINS = [
  "https://teameliteprimetn.com",
  "https://www.teameliteprimetn.com",
  "https://nvastano.github.io",
];

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

    const correct = env.PASSWORD && body.password === env.PASSWORD;

    return json({ ok: correct }, correct ? 200 : 401, allowedOrigin);
  },
};

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
    },
  });
}
