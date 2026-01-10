/**
 * LAMMB — Main Application Script
 * Premium, minimal, fast
 */

(function() {
    'use strict';

    // Contract Address & Dev Wallet
    const CONTRACT_ADDRESS = '8bqLYi7wF179V8bGXEMyV4GfD2dFfoWLqafS8iZwpump';
    const DEV_WALLET = 'HQcgVnNacvvjK4ToX8Pcq2bKmD5s32XR6AarQ2EVrrpq';
    const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/';

    // DOM Elements
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const copyCABtn = document.getElementById('copyCABtn');
    const heroCopyCA = document.getElementById('heroCopyCA');
    const copyDevWalletBtn = document.getElementById('copyDevWallet');
    const refreshStatsBtn = document.getElementById('refreshStats');
    const toast = document.getElementById('toast');

    // ================================================
    // Navigation
    // ================================================

    // Scroll-based nav styling
    function handleNavScroll() {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll(); // Initial check

    // Mobile menu toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('open');
            document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu on link click
        navMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('open')) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    // ================================================
    // Copy to Clipboard
    // ================================================

    async function copyToClipboard(text, buttonElement) {
        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '-9999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                    throw new Error('Copy failed');
                }
                
                document.body.removeChild(textarea);
            }

            // Show success state
            if (buttonElement) {
                buttonElement.classList.add('copied');
                
                // For hero button, update text
                if (buttonElement.id === 'heroCopyCA') {
                    const originalHTML = buttonElement.innerHTML;
                    buttonElement.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Copied!
                    `;
                    
                    setTimeout(function() {
                        buttonElement.innerHTML = originalHTML;
                        buttonElement.classList.remove('copied');
                    }, 2000);
                } else {
                    setTimeout(function() {
                        buttonElement.classList.remove('copied');
                    }, 2000);
                }
            }

            // Show toast
            showToast();

            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            // Show error state
            alert('Failed to copy. Please copy manually: ' + text);
            return false;
        }
    }

    function showToast() {
        toast.classList.add('show');
        setTimeout(function() {
            toast.classList.remove('show');
        }, 2500);
    }

    // Main CA copy button
    if (copyCABtn) {
        copyCABtn.addEventListener('click', function() {
            copyToClipboard(CONTRACT_ADDRESS, copyCABtn);
        });
    }

    // Hero CA copy button
    if (heroCopyCA) {
        heroCopyCA.addEventListener('click', function() {
            copyToClipboard(CONTRACT_ADDRESS, heroCopyCA);
        });
    }

    // Dev wallet copy button
    if (copyDevWalletBtn) {
        copyDevWalletBtn.addEventListener('click', function() {
            copyToClipboard(DEV_WALLET, copyDevWalletBtn);
        });
    }

    // ================================================
    // Live Stats from DexScreener
    // ================================================

    let statsRefreshInterval = null;

    function formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '—';
        
        if (num >= 1e9) {
            return '$' + (num / 1e9).toFixed(decimals) + 'B';
        } else if (num >= 1e6) {
            return '$' + (num / 1e6).toFixed(decimals) + 'M';
        } else if (num >= 1e3) {
            return '$' + (num / 1e3).toFixed(decimals) + 'K';
        } else {
            return '$' + num.toFixed(decimals);
        }
    }

    function formatPrice(price) {
        if (price === null || price === undefined || isNaN(price)) return '—';
        
        if (price < 0.00001) {
            return '$' + price.toExponential(2);
        } else if (price < 0.01) {
            return '$' + price.toFixed(6);
        } else if (price < 1) {
            return '$' + price.toFixed(4);
        } else {
            return '$' + price.toFixed(2);
        }
    }

    function formatChange(change) {
        if (change === null || change === undefined || isNaN(change)) return '—';
        
        const prefix = change >= 0 ? '+' : '';
        return prefix + change.toFixed(2) + '%';
    }

    async function fetchLiveStats() {
        const priceEl = document.getElementById('statPrice');
        const changeEl = document.getElementById('statChange');
        const mcapEl = document.getElementById('statMcap');
        const volumeEl = document.getElementById('statVolume');
        const liquidityEl = document.getElementById('statLiquidity');
        const updateEl = document.getElementById('statsUpdate');

        if (!priceEl) return; // Stats section not present

        try {
            const response = await fetch(DEXSCREENER_API + CONTRACT_ADDRESS);
            
            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            if (data.pairs && data.pairs.length > 0) {
                // Get the first pair (usually the main one)
                const pair = data.pairs[0];

                // Update price
                if (priceEl && pair.priceUsd) {
                    priceEl.textContent = formatPrice(parseFloat(pair.priceUsd));
                }

                // Update 24h change
                if (changeEl && pair.priceChange) {
                    const change24h = pair.priceChange.h24 || 0;
                    changeEl.textContent = formatChange(change24h);
                    changeEl.classList.remove('positive', 'negative');
                    if (change24h >= 0) {
                        changeEl.classList.add('positive');
                    } else {
                        changeEl.classList.add('negative');
                    }
                }

                // Update market cap (FDV)
                if (mcapEl && pair.fdv) {
                    mcapEl.textContent = formatNumber(pair.fdv);
                } else if (mcapEl && pair.marketCap) {
                    mcapEl.textContent = formatNumber(pair.marketCap);
                }

                // Update 24h volume
                if (volumeEl && pair.volume) {
                    volumeEl.textContent = formatNumber(pair.volume.h24 || 0);
                }

                // Update liquidity
                if (liquidityEl && pair.liquidity) {
                    liquidityEl.textContent = formatNumber(pair.liquidity.usd || 0);
                }

                // Update timestamp
                if (updateEl) {
                    const now = new Date();
                    updateEl.textContent = 'Last updated: ' + now.toLocaleTimeString();
                }
            } else {
                // No pairs found - token might be new
                if (priceEl) priceEl.textContent = 'Awaiting data...';
                if (changeEl) changeEl.textContent = '—';
                if (mcapEl) mcapEl.textContent = '—';
                if (volumeEl) volumeEl.textContent = '—';
                if (liquidityEl) liquidityEl.textContent = '—';
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            
            // Show error state gracefully
            if (updateEl) {
                updateEl.textContent = 'Update failed — retrying...';
            }
        }
    }

    function initLiveStats() {
        // Initial fetch
        fetchLiveStats();

        // Auto-refresh every 30 seconds
        statsRefreshInterval = setInterval(fetchLiveStats, 30000);

        // Manual refresh button
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', function() {
                // Add spinning animation
                const icon = this.querySelector('svg');
                if (icon) {
                    icon.style.animation = 'spin 0.5s linear';
                    setTimeout(function() {
                        icon.style.animation = '';
                    }, 500);
                }
                fetchLiveStats();
            });
        }
    }

    // ================================================
    // Reveal on Scroll (IntersectionObserver)
    // ================================================

    function initRevealAnimations() {
        const revealElements = document.querySelectorAll('.reveal');

        if (!revealElements.length) return;

        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            // Fallback: just show all elements
            revealElements.forEach(function(el) {
                el.classList.add('visible');
            });
            return;
        }

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(function(el) {
            observer.observe(el);
        });
    }

    // ================================================
    // Smooth Scroll for Anchor Links
    // ================================================

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    
                    const navHeight = nav ? nav.offsetHeight : 0;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ================================================
    // Logo Glitch Effect (Subtle)
    // ================================================

    function initLogoEffect() {
        const logoWrapper = document.querySelector('.hero-logo-wrapper');
        
        if (!logoWrapper) return;

        // Subtle hover effect
        logoWrapper.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
        });

        logoWrapper.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }

    // ================================================
    // Prevent FOUC (Flash of Unstyled Content)
    // ================================================

    function showPage() {
        document.body.style.opacity = '1';
    }

    // ================================================
    // Initialize Everything
    // ================================================

    function init() {
        initRevealAnimations();
        initSmoothScroll();
        initLogoEffect();
        initLiveStats();
        showPage();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ================================================
    // Performance: Debounce scroll events
    // ================================================

    function debounce(func, wait) {
        let timeout;
        return function executedFunction() {
            const context = this;
            const args = arguments;
            const later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ================================================
    // Easter Egg: Console Message
    // ================================================

    console.log('%c🐑 LAMMB', 'font-size: 24px; font-weight: bold; color: #00d4ff;');
    console.log('%cLet\'s all make money.', 'font-size: 14px; color: #a0a0a0;');
    console.log('%cContract: ' + CONTRACT_ADDRESS, 'font-size: 12px; color: #666666;');
    console.log('%cDev Wallet: ' + DEV_WALLET, 'font-size: 12px; color: #666666;');

})();
