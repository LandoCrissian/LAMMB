/**
 * LAMMB — Main Application Script v2.0
 * Refactored: Clean, performant, no duplicates
 */

(function() {
    'use strict';

    // ================================================
    // Constants
    // ================================================
    
    const CONTRACT_ADDRESS = '8bqLYi7wF179V8bGXEMyV4GfD2dFfoWLqafS8iZwpump';
    const DEV_WALLET = 'HQcgVnNacvvjK4ToX8Pcq2bKmD5s32XR6AarQ2EVrrpq';
    const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/';
    const STATS_REFRESH_INTERVAL = 30000; // 30 seconds

    // ================================================
    // DOM Elements (cached)
    // ================================================
    
    const elements = {
        nav: document.getElementById('nav'),
        navToggle: document.getElementById('navToggle'),
        navMenu: document.getElementById('navMenu'),
        navOverlay: document.getElementById('navOverlay'),
        toast: document.getElementById('toast'),
        refreshStatsBtn: document.getElementById('refreshStats'),
        retryStatsBtn: document.getElementById('retryStats'),
        statsError: document.getElementById('statsError'),
        statsUpdate: document.getElementById('statsUpdate')
    };

    // Stats timestamp for "Updated Xs ago"
    let lastStatsUpdate = null;
    let statsInterval = null;
    let updateTimeInterval = null;

    // ================================================
    // Initialization
    // ================================================
    
    function init() {
        initNavigation();
        initCopyButtons();
        initRevealAnimations();
        initSmoothScroll();
        initLiveStats();
        showPage();
    }

    /**
     * Show page after load (FOUC prevention)
     */
    function showPage() {
        document.body.classList.add('is-loaded');
    }

    // ================================================
    // Navigation
    // ================================================
    
    function initNavigation() {
        // Scroll-based nav styling
        handleNavScroll();
        window.addEventListener('scroll', handleNavScroll, { passive: true });

        // Mobile menu
        if (elements.navToggle && elements.navMenu) {
            elements.navToggle.addEventListener('click', toggleMobileMenu);
            
            // Close on overlay click
            if (elements.navOverlay) {
                elements.navOverlay.addEventListener('click', closeMobileMenu);
            }

            // Close on link click
            elements.navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', closeMobileMenu);
            });

            // Close on Escape key
            document.addEventListener('keydown', handleEscapeKey);
        }
    }

    function handleNavScroll() {
        if (!elements.nav) return;
        
        if (window.scrollY > 50) {
            elements.nav.classList.add('scrolled');
        } else {
            elements.nav.classList.remove('scrolled');
        }
    }

    function toggleMobileMenu() {
        const isOpen = elements.navMenu.classList.contains('open');
        
        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    function openMobileMenu() {
        elements.navToggle.classList.add('active');
        elements.navToggle.setAttribute('aria-expanded', 'true');
        elements.navMenu.classList.add('open');
        
        if (elements.navOverlay) {
            elements.navOverlay.classList.add('active');
        }
        
        // Prevent body scroll (iOS-safe)
        document.body.classList.add('menu-open');
        
        // Focus first link for accessibility
        const firstLink = elements.navMenu.querySelector('a');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }

    function closeMobileMenu() {
        elements.navToggle.classList.remove('active');
        elements.navToggle.setAttribute('aria-expanded', 'false');
        elements.navMenu.classList.remove('open');
        
        if (elements.navOverlay) {
            elements.navOverlay.classList.remove('active');
        }
        
        // Restore body scroll
        document.body.classList.remove('menu-open');
    }

    function handleEscapeKey(e) {
        if (e.key === 'Escape' && elements.navMenu.classList.contains('open')) {
            closeMobileMenu();
            elements.navToggle.focus();
        }
    }

    // ================================================
    // Copy to Clipboard
    // ================================================
    
    function initCopyButtons() {
        // Find all copy buttons with data-address attribute
        document.querySelectorAll('[data-address]').forEach(btn => {
            btn.addEventListener('click', handleCopyClick);
        });
    }

    async function handleCopyClick(e) {
        const button = e.currentTarget;
        const address = button.dataset.address;
        
        if (!address) return;
        
        const success = await copyToClipboard(address);
        
        if (success) {
            showCopyFeedback(button);
            showToast();
        }
    }

    async function copyToClipboard(text) {
        try {
            // Modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // Fallback for older browsers / iOS
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            
            // iOS-specific selection
            const range = document.createRange();
            range.selectNodeContents(textarea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textarea.setSelectionRange(0, text.length);
            
            const result = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            return result;
        } catch (err) {
            console.error('Copy failed:', err);
            
            // Last resort: prompt user
            try {
                window.prompt('Copy this address:', text);
                return true;
            } catch {
                return false;
            }
        }
    }

    function showCopyFeedback(button) {
        // Add copied state
        button.classList.add('copied');
        
        // Handle hero button differently (has text child)
        if (button.id === 'heroCopyCA') {
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Copied!
            `;
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } else {
            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        }
    }

    function showToast() {
        if (!elements.toast) return;
        
        elements.toast.classList.add('show');
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2500);
    }

    // ================================================
    // Live Stats from DexScreener
    // ================================================
    
    function initLiveStats() {
        // Initial fetch
        fetchLiveStats();

        // Auto-refresh
        statsInterval = setInterval(fetchLiveStats, STATS_REFRESH_INTERVAL);

        // Update "X seconds ago" display
        updateTimeInterval = setInterval(updateRelativeTime, 10000);

        // Manual refresh button
        if (elements.refreshStatsBtn) {
            elements.refreshStatsBtn.addEventListener('click', handleManualRefresh);
        }

        // Retry button
        if (elements.retryStatsBtn) {
            elements.retryStatsBtn.addEventListener('click', handleManualRefresh);
        }
    }

    function handleManualRefresh() {
        // Add refresh animation class
        if (elements.refreshStatsBtn) {
            elements.refreshStatsBtn.classList.add('refreshing');
            setTimeout(() => {
                elements.refreshStatsBtn.classList.remove('refreshing');
            }, 500);
        }
        
        fetchLiveStats();
    }

    async function fetchLiveStats() {
        const statElements = {
            price: document.getElementById('statPrice'),
            change: document.getElementById('statChange'),
            mcap: document.getElementById('statMcap'),
            volume: document.getElementById('statVolume'),
            liquidity: document.getElementById('statLiquidity')
        };

        // Check if stats section exists
        if (!statElements.price) return;

        try {
            // Hide error state
            if (elements.statsError) {
                elements.statsError.hidden = true;
            }

            const response = await fetch(DEXSCREENER_API + CONTRACT_ADDRESS);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.pairs || data.pairs.length === 0) {
                // Token might be new, show waiting state
                setPlaceholderState(statElements, 'Awaiting data...');
                updateStatsTimestamp('Waiting for trading data');
                return;
            }

            // Pick the best pair: Solana chain, highest liquidity
            const pair = selectBestPair(data.pairs);

            if (!pair) {
                setPlaceholderState(statElements, 'No Solana pair found');
                return;
            }

            // Update all stats
            updateStatElement(statElements.price, formatPrice(pair.priceUsd));
            updateChangeElement(statElements.change, pair.priceChange?.h24);
            updateStatElement(statElements.mcap, formatNumber(pair.fdv || pair.marketCap));
            updateStatElement(statElements.volume, formatNumber(pair.volume?.h24));
            updateStatElement(statElements.liquidity, formatNumber(pair.liquidity?.usd));

            // Update timestamp
            lastStatsUpdate = Date.now();
            updateStatsTimestamp('Updated just now');

        } catch (error) {
            console.error('Stats fetch failed:', error);
            
            // Show error state
            if (elements.statsError) {
                elements.statsError.hidden = false;
            }
            
            updateStatsTimestamp('Update failed');
        }
    }

    /**
     * Select the best pair from API response
     * Prefer: Solana chain + highest liquidity
     */
    function selectBestPair(pairs) {
        // Filter to Solana pairs only
        const solanaPairs = pairs.filter(p => 
            p.chainId === 'solana' || 
            p.dexId?.toLowerCase().includes('raydium') ||
            p.dexId?.toLowerCase().includes('orca')
        );

        const candidates = solanaPairs.length > 0 ? solanaPairs : pairs;

        // Sort by liquidity (highest first)
        candidates.sort((a, b) => {
            const liqA = a.liquidity?.usd || 0;
            const liqB = b.liquidity?.usd || 0;
            return liqB - liqA;
        });

        return candidates[0] || null;
    }

    function updateStatElement(el, value) {
        if (!el) return;
        
        el.textContent = value;
        el.classList.remove('stat-placeholder');
        el.classList.add('stat-loaded');
    }

    function updateChangeElement(el, change) {
        if (!el) return;

        const value = parseFloat(change);
        
        if (isNaN(value)) {
            el.textContent = '—';
            el.classList.remove('positive', 'negative', 'stat-placeholder');
            return;
        }

        const prefix = value >= 0 ? '+' : '';
        el.textContent = `${prefix}${value.toFixed(2)}%`;
        
        el.classList.remove('stat-placeholder', 'positive', 'negative');
        el.classList.add('stat-loaded');
        el.classList.add(value >= 0 ? 'positive' : 'negative');
    }

    function setPlaceholderState(statElements, message) {
        Object.values(statElements).forEach(el => {
            if (el) {
                el.textContent = message || '—';
                el.classList.add('stat-placeholder');
                el.classList.remove('stat-loaded', 'positive', 'negative');
            }
        });
    }

    function updateStatsTimestamp(message) {
        if (!elements.statsUpdate) return;
        elements.statsUpdate.textContent = message;
    }

    function updateRelativeTime() {
        if (!lastStatsUpdate || !elements.statsUpdate) return;

        const seconds = Math.floor((Date.now() - lastStatsUpdate) / 1000);

        if (seconds < 10) {
            elements.statsUpdate.textContent = 'Updated just now';
        } else if (seconds < 60) {
            elements.statsUpdate.textContent = `Updated ${seconds}s ago`;
        } else {
            const minutes = Math.floor(seconds / 60);
            elements.statsUpdate.textContent = `Updated ${minutes}m ago`;
        }
    }

    // ================================================
    // Number Formatting
    // ================================================
    
    function formatNumber(num, decimals = 2) {
        const value = parseFloat(num);
        
        if (isNaN(value) || value === null || value === undefined) {
            return '—';
        }

        if (value >= 1e9) {
            return '$' + (value / 1e9).toFixed(decimals) + 'B';
        } else if (value >= 1e6) {
            return '$' + (value / 1e6).toFixed(decimals) + 'M';
        } else if (value >= 1e3) {
            return '$' + (value / 1e3).toFixed(decimals) + 'K';
        } else {
            return '$' + value.toFixed(decimals);
        }
    }

    function formatPrice(price) {
        const value = parseFloat(price);
        
        if (isNaN(value) || value === null || value === undefined) {
            return '—';
        }

        if (value < 0.00001) {
            return '$' + value.toExponential(2);
        } else if (value < 0.01) {
            return '$' + value.toFixed(6);
        } else if (value < 1) {
            return '$' + value.toFixed(4);
        } else {
            return '$' + value.toFixed(2);
        }
    }

    // ================================================
    // Reveal Animations (IntersectionObserver)
    // ================================================
    
    function initRevealAnimations() {
        const revealElements = document.querySelectorAll('.reveal');

        if (!revealElements.length) return;

        // Fallback for unsupported browsers
        if (!('IntersectionObserver' in window)) {
            revealElements.forEach(el => el.classList.add('visible'));
            return;
        }

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));
    }

    // ================================================
    // Smooth Scroll
    // ================================================
    
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick);
        });
    }

    function handleAnchorClick(e) {
        const targetId = this.getAttribute('href');
        
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            e.preventDefault();
            
            const navHeight = elements.nav ? elements.nav.offsetHeight : 0;
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    // ================================================
    // Run on DOM Ready
    // ================================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ================================================
    // Console Easter Egg
    // ================================================
    
    console.log('%c🐑 LAMMB', 'font-size: 24px; font-weight: bold; color: #00d4ff;');
    console.log('%cLet\'s all make money.', 'font-size: 14px; color: #a0a0a0;');
    console.log('%cContract: ' + CONTRACT_ADDRESS, 'font-size: 12px; color: #666666;');
    console.log('%cDev Wallet: ' + DEV_WALLET, 'font-size: 12px; color: #666666;');

})();
