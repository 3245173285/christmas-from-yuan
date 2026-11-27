// Heirloom Vintage Christmas Greeting Card Modal Controller & Unboxing Tracker

export class GiftCardModal {
  constructor() {
    this.backdrop = document.getElementById('vintage-card-modal');
    this.cardEl = document.getElementById('vintage-card-paper');
    this.numberEl = document.getElementById('card-number');
    this.tagEl = document.getElementById('card-tag');
    this.titleEl = document.getElementById('card-title');
    this.zhEl = document.getElementById('card-zh');
    this.enEl = document.getElementById('card-en');
    this.closeBtn = document.getElementById('btn-close-card');
    this.counterEl = document.getElementById('gift-counter-text');
    this.counterBadge = document.getElementById('gift-counter-badge');
    this.hintToast = document.getElementById('magic-hint-toast');

    this.openedSet = new Set();
    this.isOpen = false;
    this.onCloseCallback = null;

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Clicking the little gift-progress pill gently displays the interactive guide toast
    if (this.counterBadge && this.hintToast) {
      this.counterBadge.addEventListener('click', () => {
        this.hintToast.classList.toggle('is-visible');
      });
    }
  }

  open(cardData, onClose) {
    if (!this.backdrop || !cardData) return;

    this.isOpen = true;
    this.onCloseCallback = onClose;
    this.openedSet.add(cardData.id);
    this.updateCounter();

    if (this.cardEl) {
      this.cardEl.dataset.theme = cardData.theme || 'gold';
    }
    if (this.numberEl) this.numberEl.textContent = `${cardData.number} / 10`;
    if (this.tagEl) this.tagEl.textContent = cardData.tag;
    if (this.titleEl) this.titleEl.textContent = cardData.title;
    if (this.zhEl) this.zhEl.textContent = cardData.zh;
    if (this.enEl) this.enEl.textContent = cardData.en;

    this.backdrop.classList.add('is-open');
    this.backdrop.setAttribute('aria-hidden', 'false');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('is-open');
    this.backdrop.setAttribute('aria-hidden', 'true');

    if (this.onCloseCallback) {
      const cb = this.onCloseCallback;
      this.onCloseCallback = null;
      cb();
    }
  }

  updateCounter() {
    if (this.counterEl) {
      this.counterEl.textContent = `${this.openedSet.size} / 10`;
    }
    if (this.counterBadge) {
      this.counterBadge.classList.remove('is-pulse');
      void this.counterBadge.offsetWidth;
      this.counterBadge.classList.add('is-pulse');
    }
  }
}
