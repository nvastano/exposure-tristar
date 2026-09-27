/**
 * Coach Auth Worker
 *
 * Deploy to Cloudflare Workers, then add a Secret named PASSWORD
 * via: Dashboard → Workers → coach-auth → Settings → Variables → Add Secret
 * or:  wrangler secret put PASSWORD
 *
 * Set the allowed origin to your site domain.
 */

const ALLOWED_ORIGIN = "https://teameliteprimetn.com";

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
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
      return json({ ok: false }, 400);
    }

    const correct = env.PASSWORD && body.password === env.PASSWORD;

    return json({ ok: correct }, correct ? 200 : 401);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    },
  });
}
