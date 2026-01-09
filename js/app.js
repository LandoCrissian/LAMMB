// ========================================
// LAMMB Single Page App
// ========================================

document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  initCopyButtons();
  initContinueGate();
  initSmoothScroll();
  initAnimations();
});

// Navigation scroll effect
function initNavigation() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  window.addEventListener('scroll', function () {
    if (window.pageYOffset > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// Copy buttons
function initCopyButtons() {
  const copyBtns = document.querySelectorAll('.copy-btn');

  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const textToCopy =
        btn.getAttribute('data-copy') ||
        '8bqLYi7wF179V8bGXEMyV4GfD2dFfoWLqafS8iZwpump';

      navigator.clipboard.writeText(textToCopy).then(function () {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');

        setTimeout(function () {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

// Continue gate for buy section
function initContinueGate() {
  const continueLink = document.querySelector('.continue-link');
  const buyInfo = document.querySelector('.buy-info');

  if (!continueLink || !buyInfo) return;

  continueLink.addEventListener('click', function (e) {
    e.preventDefault();
    buyInfo.classList.add('visible');
    continueLink.style.opacity = '0';

    setTimeout(function () {
      continueLink.style.display = 'none';
    }, 300);

    setTimeout(function () {
      buyInfo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        const navEl = document.querySelector('.nav');
        const navHeight = navEl ? navEl.offsetHeight : 0;
        const targetPosition =
          target.getBoundingClientRect().top + window.pageYOffset - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
}

// Scroll animations
function initAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document
    .querySelectorAll('.flow-card, .community-card, .future-item, .stat-item')
    .forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
}
