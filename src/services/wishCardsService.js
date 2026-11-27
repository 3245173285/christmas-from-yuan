import { WISH_CARDS_API_URL } from '../config/cardsApi.js';
import { CARD_STYLE_MAP, DEFAULT_SEED_CARDS } from '../data/wishCardsConfig.js';

const LOCAL_STORAGE_KEY = 'christmas_from_yuan_wish_cards_v1';

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
  return Boolean(WISH_CARDS_API_URL && WISH_CARDS_API_URL.trim().startsWith('http'));
}

export async function fetchWishCards() {
  const localCards = readLocalCards();

  if (isCloudBackendEnabled()) {
    try {
      const base = WISH_CARDS_API_URL.replace(/\/+$/, '');
      const res = await fetch(`${base}/api/cards`, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const remote = (Array.isArray(data.cards) ? data.cards : [])
          .map(sanitizeCard)
          .filter(Boolean);
        // Merge seed cards only if cloud has fewer than 1 card so tree is always festive
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

  // Merge user local cards on top of starter cards without duplicates
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
  let syncedToCloud = false;

  if (isCloudBackendEnabled()) {
    const base = WISH_CARDS_API_URL.replace(/\/+$/, '');
    const res = await fetch(`${base}/api/cards`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || '云端投递稍忙，请稍后再试');
    }
    const data = await res.json();
    if (data.card) {
      savedCard = sanitizeCard(data.card) || clean;
    }
    syncedToCloud = true;
  }

  // Always update local cache immediately for instant feedback
  const existing = readLocalCards().filter((c) => c.id !== savedCard.id);
  writeLocalCards([savedCard, ...existing]);

  return { card: savedCard, syncedToCloud };
}
