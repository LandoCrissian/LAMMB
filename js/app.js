/**
 * LAMMB App
 * ═══════════════════════════════════════════════════════════
 * Site logic, view switching, and rendering.
 * ═══════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  const config = window.LAMMB;

  // ─────────────────────────────────────────────────────────
  // DOM ELEMENTS
  // ─────────────────────────────────────────────────────────

  const views = document.querySelectorAll('.view');
  const navLinks = document.querySelectorAll('[data-view]');
  const taglineEl = document.getElementById('tagline');
  const communityLinkEl = document.getElementById('community-link');
  const buyGateEl = document.getElementById('buy-gate');
  const buyInfoEl = document.getElementById('buy-info');
  const tokenDetailsEl = document.getElementById('token-details');
  const continueBtn = document.getElementById('btn-continue');

  // ─────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────

  let currentView = 'home';

  // ─────────────────────────────────────────────────────────
  // VIEW SWITCHING
  // ─────────────────────────────────────────────────────────

  function showView(viewId) {
    // Reset buy view state when navigating away
    if (currentView === 'buy' && viewId !== 'buy') {
      resetBuyView();
    }

    views.forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
      currentView = viewId;
      
      // Update URL hash without triggering scroll
      history.replaceState(null, '', `#${viewId}`);
    }
  }

  function resetBuyView() {
    buyGateEl.classList.remove('hidden');
    buyInfoEl.classList.add('hidden');
  }

  // ─────────────────────────────────────────────────────────
  // BUY VIEW LOGIC
  // ─────────────────────────────────────────────────────────

  function handleContinue() {
    buyGateEl.classList.add('hidden');
    buyInfoEl.classList.remove('hidden');
    renderTokenInfo();
  }

  function renderTokenInfo() {
    const isLive = config.launchMode === 'live' && config.token.mint;

    if (!isLive) {
      tokenDetailsEl.innerHTML = `
        <p class="prelaunch-notice">Not live yet.</p>
      `;
      return;
    }

    // Build links HTML
    const linkNames = {
      dexscreener: 'DEXScreener',
      jupiter: 'Jupiter',
      raydium: 'Raydium',
      pumpfun: 'Pump.fun',
      birdeye: 'Birdeye'
    };

    const links = Object.entries(config.token.links)
      .filter(([_, url]) => url)
      .map(([key, url]) => `
        <a href="${escapeHtml(url)}" class="token-link" target="_blank" rel="noopener noreferrer">
          ${linkNames[key] || key}
        </a>
      `)
      .join('');

    tokenDetailsEl.innerHTML = `
      <div class="token-header">
        <p class="token-name">${escapeHtml(config.name)}</p>
        <p class="token-ticker">$${escapeHtml(config.ticker)}</p>
      </div>
      <div class="token-ca">
        <p class="ca-label">Contract Address</p>
        <div class="ca-row">
          <span class="ca-value" id="ca-value">${escapeHtml(config.token.mint)}</span>
          <button type="button" class="copy-btn" id="copy-btn">[ Copy ]</button>
        </div>
      </div>
      ${links ? `
        <div class="token-links">
          <p class="links-label">Trade</p>
          <div class="links-list">
            ${links}
          </div>
        </div>
      ` : ''}
    `;

    // Attach copy handler
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', handleCopy);
    }
  }

  function handleCopy() {
    const caValue = config.token.mint;
    const copyBtn = document.getElementById('copy-btn');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(caValue).then(() => {
        showCopied(copyBtn);
      }).catch(() => {
        fallbackCopy(caValue, copyBtn);
      });
    } else {
      fallbackCopy(caValue, copyBtn);
    }
  }

  function fallbackCopy(text, btn) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      showCopied(btn);
    } catch (err) {
      console.error('Copy failed:', err);
    }
    
    document.body.removeChild(textarea);
  }

  function showCopied(btn) {
    const originalText = btn.textContent;
    btn.textContent = '[ Copied ]';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 1500);
  }

  // ─────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────

  function init() {
    // Populate dynamic content
    if (taglineEl) {
      taglineEl.textContent = config.tagline;
    }

    if (communityLinkEl) {
      communityLinkEl.href = config.communityUrl;
    }

    // Attach navigation handlers
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = link.getAttribute('data-view');
        showView(viewId);
      });
    });

    // Continue button handler
    if (continueBtn) {
      continueBtn.addEventListener('click', handleContinue);
    }

    // Handle initial hash
    const hash = window.location.hash.slice(1);
    const validViews = ['home', 'join', 'buy', 'fees'];
    
    if (hash && validViews.includes(hash)) {
      showView(hash);
    } else {
      showView('home');
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const hash = window.location.hash.slice(1);
      if (hash && validViews.includes(hash)) {
        showView(hash);
      } else {
        showView('home');
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
