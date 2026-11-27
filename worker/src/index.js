// Cloudflare Worker + KV Backend for "CHRISTMAS FROM YUAN" Real-Time Wish Cards Wall
// Public Routes:
//   GET    /api/cards         -> returns latest wish cards hung on Yuan's Christmas tree
//   POST   /api/cards         -> validates & saves a new customized card into KV
// Admin Routes (require `Authorization: Bearer <ADMIN_PASSWORD>` verified against encrypted Worker secret):
//   POST   /api/admin/verify  -> verifies admin password
//   PATCH  /api/cards/:id     -> edits a card's style/message/signature/stickers or pins it to front (`pin: true`)
//   DELETE /api/cards/:id     -> deletes a card by id

const ALLOWED_STYLES = new Set(['parchment', 'aurora', 'crimson', 'ice', 'emerald']);
const CARDS_KV_KEY = 'wish_cards_list_v1';
const MAX_CARDS = 120;

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  const maxLen = Math.max(sa.length, sb.length);
  let diff = sa.length ^ sb.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0 && sa.length > 0;
}

function isAdminAuthorized(request, env) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return constantTimeEqual(match[1].trim(), expected);
}

function sanitizeStickers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((st) => ({
    id: String(st.id || 'star').slice(0, 24),
    x: Math.max(8, Math.min(92, Number(st.x) || 50)),
    y: Math.max(8, Math.min(92, Number(st.y) || 50)),
    scale: Math.max(0.55, Math.min(1.65, Number(st.scale) || 1.0)),
    rot: Math.max(-45, Math.min(45, Number(st.rot) || 0))
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // 1. Public: List all wish cards
    if (path === '/api/cards' && request.method === 'GET') {
      const stored = await env.CARDS_KV.get(CARDS_KV_KEY, { type: 'json' });
      const cards = Array.isArray(stored) ? stored : [];
      return jsonResponse(request, { ok: true, count: cards.length, cards });
    }

    // 2. Public: Submit a new wish card
    if (path === '/api/cards' && request.method === 'POST') {
      const isAdmin = isAdminAuthorized(request, env);
      const ip = request.headers.get('CF-Connecting-IP') || 'anon';
      const rlKey = `rl:${ip}`;

      if (!isAdmin) {
        const rlCount = Number((await env.CARDS_KV.get(rlKey)) || '0');
        if (rlCount >= 6) {
          return jsonResponse(request, { ok: false, error: '你已经送出好多祝福啦，稍等几分钟再投递哦' }, 429);
        }
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

      const card = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        style,
        message,
        signature,
        stickers: sanitizeStickers(body.stickers),
        createdAt: new Date().toISOString()
      };

      const stored = await env.CARDS_KV.get(CARDS_KV_KEY, { type: 'json' });
      const cards = Array.isArray(stored) ? stored : [];
      cards.unshift(card);
      if (cards.length > MAX_CARDS) cards.length = MAX_CARDS;

      await env.CARDS_KV.put(CARDS_KV_KEY, JSON.stringify(cards));
      if (!isAdmin) {
        const rlCount = Number((await env.CARDS_KV.get(rlKey)) || '0');
        await env.CARDS_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 600 });
      }

      return jsonResponse(request, { ok: true, card, cards }, 201);
    }

    // 3. Admin: Verify password
    if (path === '/api/admin/verify' && request.method === 'POST') {
      if (!isAdminAuthorized(request, env)) {
        return jsonResponse(request, { ok: false, error: '管理密码不正确' }, 401);
      }
      return jsonResponse(request, { ok: true, admin: true });
    }

    // 4. Admin: Edit / Pin / Delete a specific card by ID (/api/cards/:id)
    const cardIdMatch = path.match(/^\/api\/cards\/([^/]+)$/);
    if (cardIdMatch) {
      if (!isAdminAuthorized(request, env)) {
        return jsonResponse(request, { ok: false, error: '未授权的操作，请先验证管理员密码' }, 401);
      }

      const targetId = decodeURIComponent(cardIdMatch[1]);
      const stored = await env.CARDS_KV.get(CARDS_KV_KEY, { type: 'json' });
      const cards = Array.isArray(stored) ? stored : [];
      const idx = cards.findIndex((c) => c.id === targetId);

      if (idx === -1) {
        return jsonResponse(request, { ok: false, error: '未找到该贺卡（可能已被删除）' }, 404);
      }

      if (request.method === 'DELETE') {
        cards.splice(idx, 1);
        await env.CARDS_KV.put(CARDS_KV_KEY, JSON.stringify(cards));
        return jsonResponse(request, { ok: true, deletedId: targetId, cards });
      }

      if (request.method === 'PATCH') {
        let body;
        try {
          body = await request.json();
        } catch (_) {
          return jsonResponse(request, { ok: false, error: '无效的更新数据' }, 400);
        }

        const existing = cards[idx];
        const updated = {
          ...existing,
          style: body.style && ALLOWED_STYLES.has(body.style) ? body.style : existing.style,
          message: typeof body.message === 'string' && body.message.trim()
            ? body.message.trim().slice(0, 280)
            : existing.message,
          signature: typeof body.signature === 'string' && body.signature.trim()
            ? body.signature.trim().slice(0, 28)
            : existing.signature,
          stickers: Array.isArray(body.stickers) ? sanitizeStickers(body.stickers) : (existing.stickers || []),
          updatedAt: new Date().toISOString()
        };

        if (body.pin === true) {
          cards.splice(idx, 1);
          cards.unshift(updated);
        } else {
          cards[idx] = updated;
        }

        await env.CARDS_KV.put(CARDS_KV_KEY, JSON.stringify(cards));
        return jsonResponse(request, { ok: true, card: updated, cards });
      }
    }

    return jsonResponse(request, { ok: true, service: 'christmas-from-yuan-cards-api' });
  }
};
