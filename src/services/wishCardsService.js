import { WISH_CARDS_API_URL, WISH_CARDS_FALLBACK_API_URL } from '../config/cardsApi.js';
import { CARD_STYLE_MAP, DEFAULT_SEED_CARDS } from '../data/wishCardsConfig.js';

const LOCAL_STORAGE_KEY = 'christmas_from_yuan_wish_cards_v1';
const ADMIN_TOKEN_KEY = 'christmas_from_yuan_admin_session_v1';

// Discover a reachable, verified API before sending any card or admin request.
// Only the health check is retried across hosts. A write whose response is lost
// must never be replayed automatically, since the Worker generates a new card ID.
const API_BASES = [...new Set([WISH_CARDS_API_URL, WISH_CARDS_FALLBACK_API_URL]
  .filter(url => typeof url === 'string' && /^https:\/\//i.test(url.trim()))
  .map(url => url.trim().replace(/\/+$/, '')))];
const PRIMARY_TTL_MS = 60_000;
const FALLBACK_TTL_MS = 12_000;
let selectedApi = null;
let selectingApi = null;

async function probeApi(base) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${base}/`, {
      method: 'GET', mode: 'cors', cache: 'no-store', signal: controller.signal, redirect: 'error'
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.ok === true && data.service === 'christmas-from-yuan-cards-api';
  } catch (_) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveApiBase() {
  if (selectedApi && selectedApi.expires > Date.now()) return selectedApi.base;
  if (selectingApi) return selectingApi;
  selectingApi = (async () => {
    for (const base of API_BASES) {
      if (await probeApi(base)) {
        const ttl = base === API_BASES[0] ? PRIMARY_TTL_MS : FALLBACK_TTL_MS;
        selectedApi = { base, expires: Date.now() + ttl };
        return base;
      }
    }
    selectedApi = null;
    throw new Error('暂时无法连接贺卡服务器，请检查网络后重试');
  })();
  try {
    return await selectingApi;
  } finally {
    selectingApi = null;
  }
}

async function cloudFetch(path, options) {
  const base = await resolveApiBase();
  try {
    return await fetch(`${base}${path}`, { ...options, redirect: 'error' });
  } catch (_) {
    // On the next request, re-check both endpoints rather than caching a failure.
    selectedApi = null;
    throw new Error('贺卡服务器连接中断，请刷新确认结果后再重试');
  }
}

function sanitizeCard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const style = CARD_STYLE_MAP[raw.style] ? raw.style : 'parchment';
  const message = String(raw.message || '').trim().slice(0, 280);
  const signature = String(raw.signature || '').trim().slice(0, 28) || '神秘冬日来客';
  if (!message) return null;

  const stickers = Array.isArray(raw.stickers)
    ? raw.stickers.slice(0, 12).map((st) => ({
        id: String(st.id || 'star'),
        x: Math.max(8, Math.min(92, Number(st.x) || 50)),
        y: Math.max(8, Math.min(92, Number(st.y) || 50)),
        scale: Math.max(0.55, Math.min(1.65, Number(st.scale) || 1.0)),
        rot: Math.max(-45, Math.min(45, Number(st.rot) || 0))
      }))
    : [];

  return {
    id: String(raw.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    style,
    message,
    signature,
    stickers,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function readLocalCards() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeCard).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function writeLocalCards(cards) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards.slice(0, 100)));
  } catch (_) {
    // Storage full or restricted
  }
}

export function isCloudBackendEnabled() {
  return API_BASES.length > 0;
}

export function getAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch (_) {
    return '';
  }
}

export function setAdminToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch (_) {
    // ignore storage restriction
  }
}

export function clearAdminToken() {
  setAdminToken('');
}

export async function verifyAdminPassword(password) {
  const pwd = String(password || '').trim();
  if (!pwd) throw new Error('请输入管理密码');

  if (!isCloudBackendEnabled()) {
    throw new Error('尚未配置云端后端地址');
  }

  const res = await cloudFetch(`/api/admin/verify`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      Authorization: `Bearer ${pwd}`
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || '管理密码不正确');
  }

  setAdminToken(pwd);
  return true;
}

export async function fetchWishCards() {
  const localCards = readLocalCards();

  if (isCloudBackendEnabled()) {
    try {

      const res = await cloudFetch(`/api/cards`, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const remote = (Array.isArray(data.cards) ? data.cards : [])
          .map(sanitizeCard)
          .filter(Boolean);
        if (remote.length > 0) {
          writeLocalCards(remote);
          return remote;
        }
        return [...DEFAULT_SEED_CARDS];
      }
    } catch (_) {
      // Graceful fallback to cached/seed cards if offline
    }
  }

  const merged = [...localCards];
  const seen = new Set(merged.map((c) => c.id));
  for (const seed of DEFAULT_SEED_CARDS) {
    if (!seen.has(seed.id)) merged.push(seed);
  }
  return merged;
}

export async function submitWishCard(draft) {
  const clean = sanitizeCard(draft);
  if (!clean) {
    throw new Error('请先写下你想对 Yuan 说的圣诞祝福哦');
  }

  let savedCard = clean;
  let allCards = null;
  let syncedToCloud = false;

  if (isCloudBackendEnabled()) {

    const headers = { 'Content-Type': 'application/json' };
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await cloudFetch(`/api/cards`, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify(clean)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || '云端投递稍忙，请稍后再试');
    }
    const data = await res.json();
    if (data.card) savedCard = sanitizeCard(data.card) || clean;
    if (Array.isArray(data.cards)) {
      allCards = data.cards.map(sanitizeCard).filter(Boolean);
    }
    syncedToCloud = true;
  }

  if (allCards) {
    writeLocalCards(allCards);
  } else {
    const existing = readLocalCards().filter((c) => c.id !== savedCard.id);
    writeLocalCards([savedCard, ...existing]);
  }

  return { card: savedCard, cards: allCards, syncedToCloud };
}

export async function updateWishCard(cardId, updates) {
  const token = getAdminToken();
  if (!token) throw new Error('请先解锁 Yuan 管理模式');

  if (String(cardId).startsWith('seed-')) {
    throw new Error('预设示例贺卡会在收到第一张真实贺卡后自动替换哦');
  }

  if (isCloudBackendEnabled()) {

    const res = await cloudFetch(`/api/cards/${encodeURIComponent(cardId)}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    if (res.status === 401) {
      clearAdminToken();
      throw new Error('管理登录已失效，请重新验证密码');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || '更新失败，请稍后重试');
    }
    const data = await res.json();
    const cards = (Array.isArray(data.cards) ? data.cards : []).map(sanitizeCard).filter(Boolean);
    writeLocalCards(cards);
    return { card: sanitizeCard(data.card), cards };
  }

  const local = readLocalCards();
  const idx = local.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error('未找到该贺卡');
  const next = sanitizeCard({ ...local[idx], ...updates });
  if (updates.pin) {
    local.splice(idx, 1);
    local.unshift(next);
  } else {
    local[idx] = next;
  }
  writeLocalCards(local);
  return { card: next, cards: local };
}

export async function deleteWishCard(cardId) {
  const token = getAdminToken();
  if (!token) throw new Error('请先解锁 Yuan 管理模式');

  if (String(cardId).startsWith('seed-')) {
    throw new Error('预设示例贺卡无需删除，收到第一张真实贺卡后会自动消失');
  }

  if (isCloudBackendEnabled()) {

    const res = await cloudFetch(`/api/cards/${encodeURIComponent(cardId)}`, {
      method: 'DELETE',
      mode: 'cors',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      clearAdminToken();
      throw new Error('管理登录已失效，请重新验证密码');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || '删除失败，请稍后重试');
    }
    const data = await res.json();
    const cards = (Array.isArray(data.cards) ? data.cards : []).map(sanitizeCard).filter(Boolean);
    writeLocalCards(cards);
    return { deletedId: cardId, cards: cards.length > 0 ? cards : [...DEFAULT_SEED_CARDS] };
  }

  const local = readLocalCards().filter((c) => c.id !== cardId);
  writeLocalCards(local);
  return { deletedId: cardId, cards: local.length > 0 ? local : [...DEFAULT_SEED_CARDS] };
}
