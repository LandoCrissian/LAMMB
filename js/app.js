/**
 * LAMMB App
 * ═══════════════════════════════════════════════════════════
 * Vanilla JS - No frameworks
 * ═══════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // Contract Address
  const CA = '8bqLYi7wF179V8bGXEMyV4GfD2dFfoWLqafS8iZwpump';

  // ─────────────────────────────────────────────────────────
  // NAV SCROLL EFFECT
  // ─────────────────────────────────────────────────────────

  const nav = document.getElementById('nav');
  let lastScroll = 0;
  let ticking = false;

  function updateNav() {
    const scrollY = window.scrollY;
    
    if (scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    
    lastScroll = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });

  // ─────────────────────────────────────────────────────────
  // SMOOTH SCROLL FOR NAV LINKS
  // ─────────────────────────────────────────────────────────

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = nav.offsetHeight;
        const targetPosition = target.offsetTop - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ─────────────────────────────────────────────────────────
  // COPY TO CLIPBOARD
  // ─────────────────────────────────────────────────────────

  function copyToClipboard(text, button) {
    const originalText = button.textContent || button.innerText;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopied(button, originalText);
      }).catch(() => {
        fallbackCopy(text, button, originalText);
      });
    } else {
      fallbackCopy(text, button, originalText);
    }
  }

  function fallbackCopy(text, button, originalText) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      showCopied(button, originalText);
    } catch (err) {
      console.error('Copy failed:', err);
    }
    
    document.body.removeChild(textarea);
  }

  function showCopied(button, originalText) {
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  }

  // Main copy button
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const ca = this.getAttribute('data-ca') || CA;
      copyToClipboard(ca, this.querySelector('.copy-text') || this);
    });
  }

  // Footer copy button
  const footerCopyBtn = document.querySelector('.footer-copy-btn');
  if (footerCopyBtn) {
    footerCopyBtn.addEventListener('click', function() {
      const ca = this.getAttribute('data-ca') || CA;
      copyToClipboard(ca, this);
    });
  }

  // ─────────────────────────────────────────────────────────
  // INTERSECTION OBSERVER FOR ANIMATIONS
  // ─────────────────────────────────────────────────────────

  if ('IntersectionObserver' in window) {
    const sections = document.querySelectorAll('.section');
    
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    sections.forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(section);
    });

    // Make hero visible immediately
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.style.opacity = '1';
      hero.style.transform = 'translateY(0)';
    }
  }

  // ─────────────────────────────────────────────────────────
  // KEYBOARD ACCESSIBILITY
  // ─────────────────────────────────────────────────────────

  document.addEventListener('keydown', function(e) {
    // ESC to scroll to top
    if (e.key === 'Escape') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────

  function init() {
    // Initial nav state
    updateNav();
    
    console.log('%c LAMMB ', 'background: linear-gradient(135deg, #00d4ff, #ff2d7a); color: #000; font-weight: bold; padding: 4px 8px;');
    console.log("Let's All Make Money");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
