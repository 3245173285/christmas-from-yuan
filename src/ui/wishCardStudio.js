import { CARD_STICKER_MAP, CARD_STICKERS, CARD_STYLE_MAP, CARD_STYLES } from '../data/wishCardsConfig.js';
import {
  clearAdminToken,
  deleteWishCard,
  getAdminToken,
  submitWishCard,
  updateWishCard,
  verifyAdminPassword
} from '../services/wishCardsService.js';

// Interactive 5-Style 3D Tilt & Material-Reflective Christmas Card Studio + Tree Card Viewer + Secret Yuan Admin Manager

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatShortDate(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  } catch (_) {
    return '2026.12.25';
  }
}

export class WishCardStudio {
  constructor({ onCardSubmitted, onCardsMutated, onOpenChange } = {}) {
    this.onCardSubmitted = onCardSubmitted;
    this.onCardsMutated = onCardsMutated;
    this.onOpenChange = onOpenChange;

    this.cards = [];
    this.isOpen = false;
    this.mode = 'create'; // 'create' | 'preview' | 'gallery' | 'viewer'
    this.viewingCard = null;

    // Yuan Admin state (authenticated via Cloudflare Worker encrypted ADMIN_PASSWORD secret)
    this.isAdmin = Boolean(getAdminToken());
    this.editingCardId = null;
    this.confirmDeleteId = null;

    this.draft = {
      style: 'parchment',
      message: '',
      signature: '',
      stickers: [
        { uid: 'init-1', id: 'star', x: 82, y: 16, scale: 0.95, rot: 10 },
        { uid: 'init-2', id: 'tree', x: 18, y: 80, scale: 1.0, rot: -6 }
      ]
    };
    this.selectedStickerUid = null;
    this.draggingSticker = null;
    this.submitting = false;

    this.tiltTarget = { rx: 0, ry: 0, gx: 50, gy: 35, px: 0, py: 0 };
    this.tiltCur = { rx: 0, ry: 0, gx: 50, gy: 35, px: 0, py: 0 };
    this.tiltRaf = null;
    this.isPointerTilting = false;

    this.cacheDom();
    this.renderStylePicker();
    this.renderStickerTray();
    this.bindEvents();
    this.syncAdminUI();
    this.renderLiveCard();
  }

  cacheDom() {
    this.backdrop = document.getElementById('wish-studio-modal');
    this.shell = document.getElementById('wish-studio-shell');
    this.btnClose = document.getElementById('btn-close-studio');
    this.tabCreate = document.getElementById('tab-studio-create');
    this.tabGallery = document.getElementById('tab-studio-gallery');
    this.galleryCountBadge = document.getElementById('studio-gallery-count');

    this.adminModeBar = document.getElementById('admin-mode-bar');
    this.btnAdminLogout = document.getElementById('btn-admin-logout');

    this.paneCreate = document.getElementById('studio-pane-create');
    this.paneGallery = document.getElementById('studio-pane-gallery');
    this.paneViewer = document.getElementById('studio-pane-viewer');

    this.previewStage = document.getElementById('studio-card-stage');
    this.cardEl = document.getElementById('studio-reflective-card');
    this.stylePicker = document.getElementById('studio-style-picker');
    this.styleMetaTag = document.getElementById('studio-style-meta');
    this.stickerTray = document.getElementById('studio-sticker-tray');
    this.stickerToolbar = document.getElementById('studio-sticker-toolbar');
    this.inputMessage = document.getElementById('studio-input-message');
    this.inputSignature = document.getElementById('studio-input-signature');
    this.charCountEl = document.getElementById('studio-char-count');
    this.btnTogglePreview = document.getElementById('btn-toggle-3d-preview');
    this.btnCancelEdit = document.getElementById('btn-cancel-edit-card');
    this.btnSubmit = document.getElementById('btn-submit-wish-card');
    this.statusMsg = document.getElementById('studio-status-msg');

    this.galleryGrid = document.getElementById('studio-gallery-grid');
    this.galleryStatusMsg = document.getElementById('gallery-status-msg');
    this.viewerStage = document.getElementById('viewer-card-stage');
    this.viewerCardEl = document.getElementById('viewer-reflective-card');
    this.viewerMeta = document.getElementById('viewer-card-meta');
    this.viewerStatusMsg = document.getElementById('viewer-status-msg');
    this.viewerAdminActions = document.getElementById('viewer-admin-actions');
    this.btnViewerPin = document.getElementById('btn-viewer-pin');
    this.btnViewerEdit = document.getElementById('btn-viewer-edit');
    this.btnViewerDelete = document.getElementById('btn-viewer-delete');
    this.btnViewerBack = document.getElementById('btn-viewer-back');
    this.btnViewerWrite = document.getElementById('btn-viewer-write');

    // Secret Admin Unlock Modal
    this.unlockModal = document.getElementById('admin-unlock-modal');
    this.unlockForm = document.getElementById('admin-unlock-form');
    this.unlockInput = document.getElementById('admin-password-input');
    this.unlockError = document.getElementById('admin-unlock-error');
    this.btnUnlockCancel = document.getElementById('btn-admin-cancel');
    this.btnUnlockSubmit = document.getElementById('btn-admin-unlock');
  }

  setCards(cards = []) {
    this.cards = [...cards];
    if (this.galleryCountBadge) {
      this.galleryCountBadge.textContent = String(this.cards.length);
    }
    if (this.mode === 'gallery') {
      this.renderGallery();
    }
  }

  syncAdminUI() {
    if (this.adminModeBar) {
      this.adminModeBar.hidden = !this.isAdmin;
    }
    if (this.viewerAdminActions) {
      const isSeed = this.viewingCard && String(this.viewingCard.id).startsWith('seed-');
      this.viewerAdminActions.hidden = !(this.isAdmin && this.viewingCard && !isSeed);
    }
    if (this.btnCancelEdit) {
      this.btnCancelEdit.hidden = !this.editingCardId;
    }
    if (this.btnSubmit && !this.submitting) {
      this.btnSubmit.textContent = this.editingCardId
        ? '💾 保存修改并同步圣诞树'
        : '🎄 送给 Yuan 并挂上圣诞树';
    }
    if (this.mode === 'gallery') {
      this.renderGallery();
    }
  }

  openAdminUnlock() {
    if (this.isAdmin) {
      this.openGallery();
      return;
    }
    if (!this.unlockModal) return;
    if (this.unlockError) {
      this.unlockError.textContent = '';
      this.unlockError.classList.remove('is-visible');
    }
    if (this.unlockInput) this.unlockInput.value = '';
    this.unlockModal.classList.add('is-open');
    this.unlockModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      if (this.unlockInput) this.unlockInput.focus();
    }, 60);
  }

  closeAdminUnlock() {
    if (!this.unlockModal) return;
    this.unlockModal.classList.remove('is-open');
    this.unlockModal.setAttribute('aria-hidden', 'true');
  }

  resetToCreateMode() {
    this.editingCardId = null;
    this.draft.message = '';
    this.draft.signature = '';
    if (this.inputMessage) this.inputMessage.value = '';
    if (this.inputSignature) this.inputSignature.value = '';
    if (this.charCountEl) this.charCountEl.textContent = '0 / 280';
    this.syncAdminUI();
  }

  startEditCard(card) {
    if (!card || !this.isAdmin) return;
    if (String(card.id).startsWith('seed-')) {
      this.showGalleryStatus('预设示例卡无需编辑，收到第一张真实贺卡后会自动替换哦', true);
      return;
    }
    this.editingCardId = card.id;
    this.draft = {
      style: card.style || 'parchment',
      message: card.message || '',
      signature: card.signature || '',
      stickers: (card.stickers || []).map((s, idx) => ({
        uid: `ed-${idx}-${Date.now()}`,
        id: s.id,
        x: s.x,
        y: s.y,
        scale: s.scale,
        rot: s.rot
      }))
    };
    this.selectedStickerUid = null;
    if (this.inputMessage) this.inputMessage.value = this.draft.message;
    if (this.inputSignature) this.inputSignature.value = this.draft.signature;
    if (this.charCountEl) this.charCountEl.textContent = `${this.draft.message.length} / 280`;

    this.mode = 'create';
    this.showStatus('正在编辑云端贺卡，修改后点击保存即可同步圣诞树', false);
    this.syncModeView();
    this.syncAdminUI();
    this.renderLiveCard();
  }

  openCreate() {
    if (this.editingCardId) {
      this.resetToCreateMode();
    }
    this.mode = 'create';
    this.selectedStickerUid = null;
    this.showStatus('');
    this.openModal();
    this.syncModeView();
    this.syncAdminUI();
    this.renderLiveCard();
  }

  openGallery() {
    this.mode = 'gallery';
    this.confirmDeleteId = null;
    this.showGalleryStatus('');
    this.openModal();
    this.syncModeView();
    this.syncAdminUI();
    this.renderGallery();
  }

  openViewer(card) {
    if (!card) return;
    this.viewingCard = card;
    this.confirmDeleteId = null;
    this.mode = 'viewer';
    this.showViewerStatus('');
    this.openModal();
    this.syncModeView();
    this.syncAdminUI();
    this.renderCardSurface(this.viewerCardEl, card, false);
    if (this.viewerMeta) {
      const st = CARD_STYLE_MAP[card.style] || CARD_STYLE_MAP.parchment;
      this.viewerMeta.textContent = `${st.name} · ${st.materialTag} · ${formatShortDate(card.createdAt)}`;
    }
    if (this.btnViewerDelete) {
      this.btnViewerDelete.textContent = '🗑️ 删除贺卡';
    }
  }

  openModal() {
    if (!this.backdrop) return;
    this.isOpen = true;
    this.backdrop.classList.add('is-open');
    this.backdrop.setAttribute('aria-hidden', 'false');
    this.startTiltLoop();
    if (this.onOpenChange) this.onOpenChange(true);
  }

  close() {
    if (!this.isOpen || !this.backdrop) return;
    this.isOpen = false;
    this.draggingSticker = null;
    this.confirmDeleteId = null;
    this.backdrop.classList.remove('is-open');
    this.backdrop.setAttribute('aria-hidden', 'true');
    this.stopTiltLoop();
    if (this.onOpenChange) this.onOpenChange(false);
  }

  syncModeView() {
    const isCreate = this.mode === 'create' || this.mode === 'preview';
    const isPreviewOnly = this.mode === 'preview';
    const isGallery = this.mode === 'gallery';
    const isViewer = this.mode === 'viewer';

    if (this.shell) {
      this.shell.classList.toggle('is-preview-immersive', isPreviewOnly);
      this.shell.classList.toggle('is-viewer-mode', isViewer);
    }
    if (this.tabCreate) this.tabCreate.classList.toggle('is-active', isCreate);
    if (this.tabGallery) this.tabGallery.classList.toggle('is-active', isGallery || isViewer);

    if (this.paneCreate) this.paneCreate.hidden = !isCreate;
    if (this.paneGallery) this.paneGallery.hidden = !isGallery;
    if (this.paneViewer) this.paneViewer.hidden = !isViewer;

    if (this.btnTogglePreview) {
      this.btnTogglePreview.textContent = isPreviewOnly ? '✏️ 返回编辑' : '✨ 3D 倾斜预览';
      this.btnTogglePreview.classList.toggle('is-active', isPreviewOnly);
    }

    this.tiltTarget = { rx: 0, ry: 0, gx: 50, gy: 35, px: 0, py: 0 };
  }

  renderStylePicker() {
    if (!this.stylePicker) return;
    this.stylePicker.innerHTML = CARD_STYLES.map((st) => `
      <button type="button" class="style-chip ${st.id === this.draft.style ? 'is-active' : ''}" data-style-id="${st.id}" title="${st.materialTag}">
        <span class="style-swatch" style="background: ${st.swatch};"></span>
        <span class="style-name">${st.name}</span>
      </button>
    `).join('');
  }

  renderStickerTray() {
    if (!this.stickerTray) return;
    this.stickerTray.innerHTML = CARD_STICKERS.map((stk) => `
      <button type="button" class="sticker-tray-btn" data-sticker-id="${stk.id}" title="贴上「${stk.label}」">
        <span class="sticker-tray-icon">${stk.svg}</span>
        <span class="sticker-tray-label">${stk.label}</span>
      </button>
    `).join('');
  }

  renderLiveCard() {
    const st = CARD_STYLE_MAP[this.draft.style] || CARD_STYLE_MAP.parchment;
    if (this.styleMetaTag) {
      this.styleMetaTag.textContent = `${st.name} · ${st.materialTag}`;
    }
    if (this.stylePicker) {
      this.stylePicker.querySelectorAll('.style-chip').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.styleId === this.draft.style);
      });
    }

    const previewData = {
      style: this.draft.style,
      message: this.draft.message || '在这片北极光与冬雪之间，把最温暖的圣诞祝福挂上 Yuan 的圣诞树……',
      isPlaceholderMsg: !this.draft.message.trim(),
      signature: this.draft.signature || '你的名字',
      isPlaceholderSig: !this.draft.signature.trim(),
      stickers: this.draft.stickers,
      createdAt: new Date().toISOString()
    };

    this.renderCardSurface(this.cardEl, previewData, this.mode === 'create');
    this.updateStickerToolbar();
  }

  renderCardSurface(targetCardEl, data, editable) {
    if (!targetCardEl) return;
    const st = CARD_STYLE_MAP[data.style] || CARD_STYLE_MAP.parchment;
    targetCardEl.dataset.style = st.id;

    const stickersHtml = (data.stickers || []).map((item, idx) => {
      const def = CARD_STICKER_MAP[item.id] || CARD_STICKERS[0];
      const uid = item.uid || `v-${idx}`;
      const isSel = editable && this.selectedStickerUid === uid;
      return `
        <div
          class="rc-sticker ${editable ? 'is-editable' : ''} ${isSel ? 'is-selected' : ''}"
          data-uid="${uid}"
          style="left: ${item.x}%; top: ${item.y}%; --st-scale: ${item.scale}; --st-rot: ${item.rot}deg;"
        >
          <div class="rc-sticker-art">${def.svg}</div>
          <div class="rc-sticker-gloss"></div>
        </div>
      `;
    }).join('');

    const msgHtml = escapeHtml(data.message).replace(/\n/g, '<br>');
    const sigHtml = escapeHtml(data.signature);

    targetCardEl.innerHTML = `
      <div class="rc-material-base"></div>
      <div class="rc-foil-border"></div>
      <div class="rc-material-sheen"></div>
      <div class="rc-specular-sweep"></div>
      <div class="rc-frame-inner">
        <span class="rc-corner rc-tl">✦</span>
        <span class="rc-corner rc-tr">✦</span>
        <span class="rc-corner rc-bl">✦</span>
        <span class="rc-corner rc-br">✦</span>

        <div class="rc-top-meta">
          <span class="rc-style-en">${st.nameEn}</span>
          <div class="rc-to-line">To <strong>Yuan</strong></div>
        </div>

        <div class="rc-message ${data.isPlaceholderMsg ? 'is-placeholder' : ''}">${msgHtml}</div>

        <div class="rc-bottom-row">
          <div class="rc-seal" aria-hidden="true"><span>Y</span></div>
          <div class="rc-sign-block">
            <span class="rc-from-label">WITH LOVE FROM</span>
            <span class="rc-signature ${data.isPlaceholderSig ? 'is-placeholder' : ''}">${sigHtml}</span>
            <span class="rc-date">${formatShortDate(data.createdAt)}</span>
          </div>
        </div>
      </div>
      <div class="rc-sticker-layer">${stickersHtml}</div>
    `;
  }

  updateStickerToolbar() {
    if (!this.stickerToolbar) return;
    const active = this.mode === 'create' && this.draft.stickers.find((s) => s.uid === this.selectedStickerUid);
    this.stickerToolbar.classList.toggle('is-visible', Boolean(active));
  }

  renderGallery() {
    if (!this.galleryGrid) return;
    if (this.cards.length === 0) {
      this.galleryGrid.innerHTML = `
        <div class="gallery-empty">
          <p>圣诞树上还在等待第一张来自朋友的祝福贺卡 ✨</p>
        </div>
      `;
      return;
    }

    this.galleryGrid.innerHTML = this.cards.map((c) => {
      const st = CARD_STYLE_MAP[c.style] || CARD_STYLE_MAP.parchment;
      const snippet = escapeHtml(c.message.slice(0, 48) + (c.message.length > 48 ? '…' : ''));
      const sig = escapeHtml(c.signature);
      const count = (c.stickers || []).length;
      const isSeed = String(c.id).startsWith('seed-');
      const confirming = this.confirmDeleteId === c.id;

      const adminControls = this.isAdmin
        ? (isSeed
            ? `<div class="gci-admin-bar"><span class="gci-seed-note">预设示例卡（收到真实卡后自动替换）</span></div>`
            : `<div class="gci-admin-bar">
                <button type="button" class="ws-admin-btn is-sm" data-admin-act="pin" data-card-id="${escapeHtml(c.id)}">📌 置顶</button>
                <button type="button" class="ws-admin-btn is-sm" data-admin-act="edit" data-card-id="${escapeHtml(c.id)}">✏️ 编辑</button>
                <button type="button" class="ws-admin-btn is-sm is-danger" data-admin-act="delete" data-card-id="${escapeHtml(c.id)}">${confirming ? '确认删除？' : '🗑️ 删除'}</button>
              </div>`)
        : '';

      return `
        <div class="gallery-card-wrap">
          <button type="button" class="gallery-card-item" data-card-id="${escapeHtml(c.id)}" data-style="${st.id}">
            <div class="gci-top">
              <span class="gci-dot" style="background: ${st.swatch};"></span>
              <span class="gci-style">${st.name}</span>
              <span class="gci-date">${formatShortDate(c.createdAt)}</span>
            </div>
            <p class="gci-msg">${snippet}</p>
            <div class="gci-foot">
              <span class="gci-stickers">${count > 0 ? `✨ ${count} 枚贴纸` : '经典纯文字'}</span>
              <span class="gci-sig">— ${sig}</span>
            </div>
          </button>
          ${adminControls}
        </div>
      `;
    }).join('');
  }

  showStatus(text, isError = false) {
    if (!this.statusMsg) return;
    this.statusMsg.textContent = text;
    this.statusMsg.classList.toggle('is-error', isError);
    this.statusMsg.classList.toggle('is-visible', Boolean(text));
  }

  showGalleryStatus(text, isError = false) {
    if (!this.galleryStatusMsg) return;
    this.galleryStatusMsg.textContent = text;
    this.galleryStatusMsg.classList.toggle('is-error', isError);
    this.galleryStatusMsg.classList.toggle('is-visible', Boolean(text));
  }

  showViewerStatus(text, isError = false) {
    if (!this.viewerStatusMsg) return;
    this.viewerStatusMsg.textContent = text;
    this.viewerStatusMsg.classList.toggle('is-error', isError);
    this.viewerStatusMsg.classList.toggle('is-visible', Boolean(text));
  }

  addSticker(stickerId) {
    if (this.draft.stickers.length >= 12) {
      this.showStatus('每张贺卡最多可以贴 12 枚贴纸哦 ✨', true);
      return;
    }
    this.showStatus('');
    const uid = `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const spots = [
      [18, 22], [82, 22], [18, 78], [82, 74],
      [50, 14], [15, 50], [85, 48], [50, 84]
    ];
    const [sx, sy] = spots[this.draft.stickers.length % spots.length];
    const jitterX = (Math.random() - 0.5) * 10;
    const jitterY = (Math.random() - 0.5) * 8;
    const rot = Math.round((Math.random() - 0.5) * 24);

    this.draft.stickers.push({
      uid,
      id: stickerId,
      x: Math.max(12, Math.min(88, Math.round(sx + jitterX))),
      y: Math.max(12, Math.min(88, Math.round(sy + jitterY))),
      scale: 0.96,
      rot
    });
    this.selectedStickerUid = uid;
    if (this.mode === 'preview') {
      this.mode = 'create';
      this.syncModeView();
    }
    this.renderLiveCard();
  }

  adjustSelectedSticker(action) {
    const idx = this.draft.stickers.findIndex((s) => s.uid === this.selectedStickerUid);
    if (idx === -1) return;
    const st = this.draft.stickers[idx];
    if (action === 'scale-up') st.scale = Math.min(1.6, +(st.scale + 0.14).toFixed(2));
    if (action === 'scale-down') st.scale = Math.max(0.55, +(st.scale - 0.14).toFixed(2));
    if (action === 'rot-left') st.rot = Math.max(-45, st.rot - 10);
    if (action === 'rot-right') st.rot = Math.min(45, st.rot + 10);
    if (action === 'delete') {
      this.draft.stickers.splice(idx, 1);
      this.selectedStickerUid = null;
    }
    this.renderLiveCard();
  }

  updateTiltFromPointer(clientX, clientY, stageEl) {
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));
    const maxTilt = this.mode === 'create' ? 11 : 17;

    this.tiltTarget.ry = nx * maxTilt;
    this.tiltTarget.rx = -ny * maxTilt;
    this.tiltTarget.gx = 50 + nx * 44;
    this.tiltTarget.gy = 50 + ny * 44;
    this.tiltTarget.px = nx;
    this.tiltTarget.py = ny;
  }

  applyTiltVars(el) {
    if (!el) return;
    const c = this.tiltCur;
    el.style.setProperty('--tilt-rx', `${c.rx.toFixed(2)}deg`);
    el.style.setProperty('--tilt-ry', `${c.ry.toFixed(2)}deg`);
    el.style.setProperty('--glare-x', `${c.gx.toFixed(1)}%`);
    el.style.setProperty('--glare-y', `${c.gy.toFixed(1)}%`);
    el.style.setProperty('--foil-pos', `${(50 + c.px * 38 + c.py * 18).toFixed(1)}%`);
    el.style.setProperty('--px', c.px.toFixed(3));
    el.style.setProperty('--py', c.py.toFixed(3));
  }

  startTiltLoop() {
    if (this.tiltRaf) return;
    const tick = (now) => {
      if (!this.isOpen) {
        this.tiltRaf = null;
        return;
      }
      if (!this.isPointerTilting && (this.mode === 'preview' || this.mode === 'viewer')) {
        const t = now * 0.0012;
        this.tiltTarget.ry = Math.sin(t) * 6.5;
        this.tiltTarget.rx = Math.cos(t * 0.85) * 4.2;
        this.tiltTarget.gx = 50 + Math.sin(t) * 26;
        this.tiltTarget.gy = 45 + Math.cos(t * 0.85) * 22;
        this.tiltTarget.px = Math.sin(t) * 0.55;
        this.tiltTarget.py = Math.cos(t * 0.85) * 0.4;
      }

      const ease = 0.14;
      this.tiltCur.rx += (this.tiltTarget.rx - this.tiltCur.rx) * ease;
      this.tiltCur.ry += (this.tiltTarget.ry - this.tiltCur.ry) * ease;
      this.tiltCur.gx += (this.tiltTarget.gx - this.tiltCur.gx) * ease;
      this.tiltCur.gy += (this.tiltTarget.gy - this.tiltCur.gy) * ease;
      this.tiltCur.px += (this.tiltTarget.px - this.tiltCur.px) * ease;
      this.tiltCur.py += (this.tiltTarget.py - this.tiltCur.py) * ease;

      if (this.mode === 'viewer') {
        this.applyTiltVars(this.viewerCardEl);
      } else if (this.mode === 'create' || this.mode === 'preview') {
        this.applyTiltVars(this.cardEl);
      }

      this.tiltRaf = requestAnimationFrame(tick);
    };
    this.tiltRaf = requestAnimationFrame(tick);
  }

  stopTiltLoop() {
    if (this.tiltRaf) {
      cancelAnimationFrame(this.tiltRaf);
      this.tiltRaf = null;
    }
  }

  bindStageTiltAndDrag(stageEl, allowStickerDrag) {
    if (!stageEl) return;

    stageEl.addEventListener('pointerdown', (e) => {
      if (allowStickerDrag && this.mode === 'create') {
        const stickerNode = e.target.closest('.rc-sticker');
        if (stickerNode) {
          e.stopPropagation();
          const uid = stickerNode.dataset.uid;
          this.selectedStickerUid = uid;
          const stObj = this.draft.stickers.find((s) => s.uid === uid);
          if (stObj) {
            this.draggingSticker = { uid, pointerId: e.pointerId };
            try { stickerNode.setPointerCapture(e.pointerId); } catch (_) {}
            this.renderLiveCard();
          }
          return;
        }
        if (this.selectedStickerUid) {
          this.selectedStickerUid = null;
          this.renderLiveCard();
        }
      }

      this.isPointerTilting = true;
      this.updateTiltFromPointer(e.clientX, e.clientY, stageEl);
    });

    stageEl.addEventListener('pointermove', (e) => {
      if (allowStickerDrag && this.draggingSticker && this.mode === 'create') {
        const cardRect = this.cardEl.getBoundingClientRect();
        const stObj = this.draft.stickers.find((s) => s.uid === this.draggingSticker.uid);
        if (stObj && cardRect.width > 10 && cardRect.height > 10) {
          stObj.x = Math.max(8, Math.min(92, ((e.clientX - cardRect.left) / cardRect.width) * 100));
          stObj.y = Math.max(8, Math.min(92, ((e.clientY - cardRect.top) / cardRect.height) * 100));
          const el = this.cardEl.querySelector(`.rc-sticker[data-uid="${stObj.uid}"]`);
          if (el) {
            el.style.left = `${stObj.x}%`;
            el.style.top = `${stObj.y}%`;
          }
        }
        return;
      }

      if (e.pointerType === 'mouse' || this.isPointerTilting) {
        this.isPointerTilting = true;
        this.updateTiltFromPointer(e.clientX, e.clientY, stageEl);
      }
    });

    const endTilt = () => {
      this.draggingSticker = null;
      this.isPointerTilting = false;
      if (this.mode === 'create') {
        this.tiltTarget = { rx: 0, ry: 0, gx: 50, gy: 35, px: 0, py: 0 };
      }
    };

    stageEl.addEventListener('pointerup', endTilt);
    stageEl.addEventListener('pointercancel', endTilt);
    stageEl.addEventListener('pointerleave', endTilt);
  }

  async handleAdminPin(cardId, fromViewer = false) {
    try {
      const { cards } = await updateWishCard(cardId, { pin: true });
      this.setCards(cards);
      if (this.onCardsMutated) this.onCardsMutated(cards);
      if (fromViewer) {
        this.showViewerStatus('📌 已置顶到圣诞树最前排枝桠！', false);
      } else {
        this.showGalleryStatus('📌 已置顶到圣诞树最前排枝桠！', false);
      }
    } catch (err) {
      if (!getAdminToken()) {
        this.isAdmin = false;
        this.syncAdminUI();
      }
      if (fromViewer) this.showViewerStatus(err.message, true);
      else this.showGalleryStatus(err.message, true);
    }
  }

  async handleAdminDelete(cardId, fromViewer = false) {
    if (this.confirmDeleteId !== cardId) {
      this.confirmDeleteId = cardId;
      if (fromViewer && this.btnViewerDelete) {
        this.btnViewerDelete.textContent = '再点一次确认删除';
      } else {
        this.renderGallery();
      }
      return;
    }

    this.confirmDeleteId = null;
    try {
      const { cards } = await deleteWishCard(cardId);
      this.setCards(cards);
      if (this.onCardsMutated) this.onCardsMutated(cards);
      if (fromViewer) {
        this.viewingCard = null;
        this.mode = 'gallery';
        this.syncModeView();
        this.syncAdminUI();
        this.renderGallery();
        this.showGalleryStatus('🗑️ 贺卡已从云端和圣诞树上移除', false);
      } else {
        this.showGalleryStatus('🗑️ 贺卡已从云端和圣诞树上移除', false);
      }
    } catch (err) {
      if (!getAdminToken()) {
        this.isAdmin = false;
        this.syncAdminUI();
      }
      if (fromViewer) this.showViewerStatus(err.message, true);
      else this.showGalleryStatus(err.message, true);
    }
  }

  bindEvents() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.unlockModal && this.unlockModal.classList.contains('is-open')) {
          this.closeAdminUnlock();
        } else if (this.isOpen) {
          this.close();
        }
      }
    });

    // Secret Admin Unlock Modal Events
    if (this.btnUnlockCancel) {
      this.btnUnlockCancel.addEventListener('click', () => this.closeAdminUnlock());
    }
    if (this.unlockModal) {
      this.unlockModal.addEventListener('click', (e) => {
        if (e.target === this.unlockModal) this.closeAdminUnlock();
      });
    }
    if (this.unlockForm) {
      this.unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = this.unlockInput ? this.unlockInput.value : '';
        if (this.btnUnlockSubmit) {
          this.btnUnlockSubmit.disabled = true;
          this.btnUnlockSubmit.textContent = '验证中…';
        }
        try {
          await verifyAdminPassword(pwd);
          this.isAdmin = true;
          this.closeAdminUnlock();
          this.openGallery();
          this.showGalleryStatus('👑 已进入 Yuan 贺卡管理模式，可编辑、置顶或删除云端贺卡', false);
        } catch (err) {
          if (this.unlockError) {
            this.unlockError.textContent = err.message || '管理密码不正确';
            this.unlockError.classList.add('is-visible');
          }
        } finally {
          if (this.btnUnlockSubmit) {
            this.btnUnlockSubmit.disabled = false;
            this.btnUnlockSubmit.textContent = '解锁管理';
          }
        }
      });
    }

    if (this.btnAdminLogout) {
      this.btnAdminLogout.addEventListener('click', () => {
        clearAdminToken();
        this.isAdmin = false;
        this.confirmDeleteId = null;
        if (this.editingCardId) this.resetToCreateMode();
        this.syncAdminUI();
        this.showGalleryStatus('已退出管理员模式', false);
      });
    }

    if (this.btnCancelEdit) {
      this.btnCancelEdit.addEventListener('click', () => {
        this.resetToCreateMode();
        this.showStatus('');
        this.renderLiveCard();
      });
    }

    if (this.tabCreate) {
      this.tabCreate.addEventListener('click', () => {
        this.mode = 'create';
        this.syncModeView();
        this.syncAdminUI();
        this.renderLiveCard();
      });
    }
    if (this.tabGallery) {
      this.tabGallery.addEventListener('click', () => {
        this.mode = 'gallery';
        this.confirmDeleteId = null;
        this.syncModeView();
        this.syncAdminUI();
        this.renderGallery();
      });
    }

    if (this.stylePicker) {
      this.stylePicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.style-chip');
        if (!btn) return;
        this.draft.style = btn.dataset.styleId;
        this.renderLiveCard();
      });
    }

    if (this.stickerTray) {
      this.stickerTray.addEventListener('click', (e) => {
        const btn = e.target.closest('.sticker-tray-btn');
        if (!btn) return;
        this.addSticker(btn.dataset.stickerId);
      });
    }

    if (this.stickerToolbar) {
      this.stickerToolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-st-action]');
        if (!btn) return;
        this.adjustSelectedSticker(btn.dataset.stAction);
      });
    }

    if (this.inputMessage) {
      this.inputMessage.addEventListener('input', () => {
        this.draft.message = this.inputMessage.value.slice(0, 280);
        if (this.charCountEl) {
          this.charCountEl.textContent = `${this.draft.message.length} / 280`;
        }
        this.renderLiveCard();
      });
    }

    if (this.inputSignature) {
      this.inputSignature.addEventListener('input', () => {
        this.draft.signature = this.inputSignature.value.slice(0, 28);
        this.renderLiveCard();
      });
    }

    if (this.btnTogglePreview) {
      this.btnTogglePreview.addEventListener('click', () => {
        this.selectedStickerUid = null;
        this.mode = this.mode === 'preview' ? 'create' : 'preview';
        this.syncModeView();
        this.renderLiveCard();
      });
    }

    if (this.btnSubmit) {
      this.btnSubmit.addEventListener('click', () => this.handleSubmit());
    }

    if (this.galleryGrid) {
      this.galleryGrid.addEventListener('click', (e) => {
        const adminBtn = e.target.closest('[data-admin-act]');
        if (adminBtn) {
          e.stopPropagation();
          const act = adminBtn.dataset.adminAct;
          const cardId = adminBtn.dataset.cardId;
          const card = this.cards.find((c) => c.id === cardId);
          if (act === 'pin') this.handleAdminPin(cardId, false);
          else if (act === 'edit' && card) this.startEditCard(card);
          else if (act === 'delete') this.handleAdminDelete(cardId, false);
          return;
        }

        const item = e.target.closest('.gallery-card-item');
        if (!item) return;
        const card = this.cards.find((c) => c.id === item.dataset.cardId);
        if (card) this.openViewer(card);
      });
    }

    if (this.btnViewerPin) {
      this.btnViewerPin.addEventListener('click', () => {
        if (this.viewingCard) this.handleAdminPin(this.viewingCard.id, true);
      });
    }
    if (this.btnViewerEdit) {
      this.btnViewerEdit.addEventListener('click', () => {
        if (this.viewingCard) this.startEditCard(this.viewingCard);
      });
    }
    if (this.btnViewerDelete) {
      this.btnViewerDelete.addEventListener('click', () => {
        if (this.viewingCard) this.handleAdminDelete(this.viewingCard.id, true);
      });
    }

    if (this.btnViewerBack) {
      this.btnViewerBack.addEventListener('click', () => {
        this.mode = 'gallery';
        this.syncModeView();
        this.syncAdminUI();
        this.renderGallery();
      });
    }

    if (this.btnViewerWrite) {
      this.btnViewerWrite.addEventListener('click', () => this.openCreate());
    }

    this.bindStageTiltAndDrag(this.previewStage, true);
    this.bindStageTiltAndDrag(this.viewerStage, false);
  }

  async handleSubmit() {
    if (this.submitting) return;
    const message = this.draft.message.trim();
    const signature = this.draft.signature.trim();

    if (!message) {
      this.showStatus('请先写下送给 Yuan 的圣诞祝福内容 ✨', true);
      if (this.inputMessage) this.inputMessage.focus();
      return;
    }
    if (!signature) {
      this.showStatus('别忘了在署名栏写下你的名字哦 ✍️', true);
      if (this.inputSignature) this.inputSignature.focus();
      return;
    }

    this.submitting = true;
    this.btnSubmit.disabled = true;
    const payload = {
      style: this.draft.style,
      message,
      signature,
      stickers: this.draft.stickers.map(({ id, x, y, scale, rot }) => ({ id, x, y, scale, rot }))
    };

    try {
      if (this.editingCardId) {
        this.btnSubmit.textContent = '正在保存修改…';
        const { cards } = await updateWishCard(this.editingCardId, payload);
        this.setCards(cards);
        if (this.onCardsMutated) this.onCardsMutated(cards);
        this.resetToCreateMode();
        this.mode = 'gallery';
        this.syncModeView();
        this.syncAdminUI();
        this.renderGallery();
        this.showGalleryStatus('✅ 修改已同步至云端并刷新圣诞树挂卡！', false);
        return;
      }

      this.btnSubmit.textContent = '正在挂上圣诞树…';
      this.showStatus('');
      const { card, cards, syncedToCloud } = await submitWishCard(payload);
      const nextCards = Array.isArray(cards) && cards.length > 0
        ? cards
        : [card, ...this.cards.filter((c) => c.id !== card.id && !String(c.id).startsWith('seed-'))];

      this.setCards(nextCards);
      this.resetToCreateMode();

      const okMsg = syncedToCloud
        ? '✨ 贺卡已同步至云端并挂上 Yuan 的圣诞树！'
        : '✨ 贺卡已挂上 Yuan 的圣诞树！';
      this.showStatus(okMsg, false);

      if (this.onCardSubmitted) {
        this.onCardSubmitted(card, nextCards);
      }

      setTimeout(() => {
        this.close();
      }, 880);
    } catch (err) {
      if (!getAdminToken() && this.editingCardId) {
        this.isAdmin = false;
        this.syncAdminUI();
      }
      this.showStatus(err.message || '操作失败，请稍后重试', true);
    } finally {
      this.submitting = false;
      this.btnSubmit.disabled = false;
      this.syncAdminUI();
    }
  }
}
