// Cloudflare Worker + KV Backend for "CHRISTMAS FROM YUAN" Real-Time Wish Cards Wall
// Routes:
//   GET  /api/cards  -> returns latest wish cards hung on Yuan's Christmas tree
//   POST /api/cards  -> validates & saves a new customized card into KV

const ALLOWED_STYLES = new Set(['parchment', 'aurora', 'crimson', 'ice', 'emerald']);
const CARDS_KV_KEY = 'wish_cards_list_v1';
const MAX_CARDS = 120;

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request)
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === '/api/cards' && request.method === 'GET') {
      const stored = await env.CARDS_KV.get(CARDS_KV_KEY, { type: 'json' });
      const cards = Array.isArray(stored) ? stored : [];
      return jsonResponse(request, { ok: true, count: cards.length, cards });
    }

    if (url.pathname === '/api/cards' && request.method === 'POST') {
      // Gentle anti-spam rate limit (max 6 cards per IP per 10 minutes)
      const ip = request.headers.get('CF-Connecting-IP') || 'anon';
      const rlKey = `rl:${ip}`;
      const rlCount = Number((await env.CARDS_KV.get(rlKey)) || '0');
      if (rlCount >= 6) {
        return jsonResponse(request, { ok: false, error: '你已经送出好多祝福啦，稍等几分钟再投递哦' }, 429);
      }

      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse(request, { ok: false, error: '无效的贺卡数据' }, 400);
      }

      const style = ALLOWED_STYLES.has(body.style) ? body.style : 'parchment';
      const message = String(body.message || '').trim().slice(0, 280);
      const signature = String(body.signature || '').trim().slice(0, 28);
      if (!message) {
        return jsonResponse(request, { ok: false, error: '请填写祝福内容' }, 400);
      }
      if (!signature) {
        return jsonResponse(request, { ok: false, error: '请填写你的署名' }, 400);
      }

      const stickers = Array.isArray(body.stickers)
        ? body.stickers.slice(0, 12).map((st) => ({
            id: String(st.id || 'star').slice(0, 24),
            x: Math.max(8, Math.min(92, Number(st.x) || 50)),
            y: Math.max(8, Math.min(92, Number(st.y) || 50)),
            scale: Math.max(0.55, Math.min(1.65, Number(st.scale) || 1.0)),
            rot: Math.max(-45, Math.min(45, Number(st.rot) || 0))
          }))
        : [];

      const card = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        style,
        message,
        signature,
        stickers,
        createdAt: new Date().toISOString()
      };

      const stored = await env.CARDS_KV.get(CARDS_KV_KEY, { type: 'json' });
      const cards = Array.isArray(stored) ? stored : [];
      cards.unshift(card);
      if (cards.length > MAX_CARDS) cards.length = MAX_CARDS;

      await env.CARDS_KV.put(CARDS_KV_KEY, JSON.stringify(cards));
      await env.CARDS_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 600 });

      return jsonResponse(request, { ok: true, card }, 201);
    }

    return jsonResponse(request, { ok: true, service: 'christmas-from-yuan-cards-api' });
  }
};
