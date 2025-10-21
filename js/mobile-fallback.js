/**
 * Mobile Fallback Script
 * Provides basic functionality for mobile browsers that don't support ES6 modules
 */

(function() {
    'use strict';
    
    console.log('Loading mobile fallback script...');
    
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isOldBrowser = !window.fetch || !window.Promise || !window.Map;
    
    if (!isMobile && !isOldBrowser) {
        console.log('Modern browser detected, skipping fallback');
        return;
    }
    
    console.log('Mobile/legacy browser detected, initializing fallback functionality');
    
    // Basic settings management
    const settings = {
        showSeconds: true,
        use24Hour: false,
        showWorldClocks: false,
        worldClocks: [],
        backgroundOpacity: 0.5
    };
    
    // Load settings from localStorage
    function loadSettings() {
        try {
            const saved = localStorage.getItem('timeDisplaySettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(settings, parsed);
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
    
    // Save settings to localStorage
    function saveSettings() {
        try {
            localStorage.setItem('timeDisplaySettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    // Get week number
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    // Update Christmas countdown
    function updateChristmasCountdown() {
        const countdownElement = document.getElementById('countdownText');
        if (!countdownElement) return;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        let christmas = new Date(currentYear, 11, 25); // December 25th
        
        // If Christmas has passed this year, calculate for next year
        if (now > christmas) {
            christmas = new Date(currentYear + 1, 11, 25);
        }
        
        const timeDiff = christmas.getTime() - now.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysUntil === 0) {
            countdownElement.innerHTML = '🎄 Merry Christmas! 🎄';
            countdownElement.className = 'countdown-text christmas-day';
        } else if (daysUntil === 1) {
            countdownElement.innerHTML = '🎄 Christmas is tomorrow! 🎄';
        } else {
            countdownElement.innerHTML = '🎄 <span class="countdown-number">' + daysUntil + '</span> days until Christmas 🎄';
        }
    }
    
    // Main time update function
    function updateTime() {
        const timeElement = document.getElementById('timeText');
        const dateElement = document.getElementById('dateText');
        const ampmElement = document.getElementById('ampmText');
        
        if (!timeElement || !dateElement) return;
        
        const now = new Date();
        
        // Format time
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        let ampm = '';
        
        if (!settings.use24Hour) {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
        }
        
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        let timeString = formattedHours + ':' + formattedMinutes;
        if (settings.showSeconds) {
            timeString += ':' + formattedSeconds;
        }
        
        timeElement.textContent = timeString;
        
        // Update AM/PM
        if (ampmElement) {
            if (!settings.use24Hour && ampm) {
                ampmElement.textContent = ampm;
                ampmElement.style.display = 'inline';
            } else {
                ampmElement.style.display = 'none';
            }
        }
        
        // Format date with week number
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const baseDateString = now.toLocaleDateString('en-US', options);
        const weekNumber = getWeekNumber(now);
        const dateString = baseDateString + ', week ' + weekNumber;
        dateElement.textContent = dateString;
        
        // Update Christmas countdown
        updateChristmasCountdown();
    }
    
    // Settings panel functionality
    function setupSettings() {
        const settingsToggle = document.getElementById('settingsToggle');
        const settingsContent = document.getElementById('settingsContent');
        const showSecondsCheckbox = document.getElementById('showSeconds');
        const use24HourCheckbox = document.getElementById('use24Hour');
        
        // Load initial settings
        if (showSecondsCheckbox) {
            showSecondsCheckbox.checked = settings.showSeconds;
        }
        if (use24HourCheckbox) {
            use24HourCheckbox.checked = settings.use24Hour;
        }
        
        // Settings panel toggle
        if (settingsToggle && settingsContent) {
            settingsToggle.addEventListener('click', function() {
                const isHidden = settingsContent.hidden;
                settingsContent.hidden = !isHidden;
                settingsToggle.setAttribute('aria-expanded', !isHidden);
            });
        }
        
        // Show seconds checkbox
        if (showSecondsCheckbox) {
            showSecondsCheckbox.addEventListener('change', function() {
                settings.showSeconds = this.checked;
                saveSettings();
            });
        }
        
        // 24-hour format checkbox
        if (use24HourCheckbox) {
            use24HourCheckbox.addEventListener('change', function() {
                settings.use24Hour = this.checked;
                saveSettings();
            });
        }
        
        // Close settings when clicking outside
        document.addEventListener('click', function(e) {
            if (settingsContent && !settingsContent.hidden &&
                !settingsToggle.contains(e.target) &&
                !settingsContent.contains(e.target)) {
                settingsContent.hidden = true;
                settingsToggle.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Touch event handling for mobile
        if (isMobile) {
            // For mobile, we'll use a simple modal-like approach if Bootstrap isn't available
            if (!window.bootstrap) {
                settingsToggle.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    this.click();
                });
                
                // Create a simple mobile settings overlay
                if (settingsContent) {
                    settingsContent.style.position = 'fixed';
                    settingsContent.style.top = '2rem';
                    settingsContent.style.left = '1rem';
                    settingsContent.style.right = '1rem';
                    settingsContent.style.bottom = '2rem';
                    settingsContent.style.width = 'auto';
                    settingsContent.style.maxHeight = 'none';
                    settingsContent.style.zIndex = '9999';
                    settingsContent.style.borderRadius = '12px';
                    settingsContent.style.overflow = 'auto';
                }
            }
        }
    }
    
    // Error handling
    function setupErrorHandling() {
        const errorClose = document.getElementById('errorClose');
        
        if (errorClose) {
            errorClose.addEventListener('click', function() {
                const errorMessage = document.getElementById('errorMessage');
                if (errorMessage) {
                    errorMessage.hidden = true;
                }
            });
        }
        
        // Global error handler
        window.addEventListener('error', function(e) {
            console.error('Global error:', e.error);
        });
    }
    
    // Show connection status
    function updateConnectionStatus() {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');
        
        if (statusText) {
            statusText.textContent = 'Local time';
        }
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator disconnected';
        }
    }
    
    // Show error message using Bootstrap toast if available
    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = message;
            
            // Try to use Bootstrap toast if available
            if (window.bootstrap && bootstrap.Toast) {
                const toast = new bootstrap.Toast(errorElement);
                toast.show();
            } else {
                // Fallback to simple show/hide
                errorElement.hidden = false;
                setTimeout(() => {
                    errorElement.hidden = true;
                }, 5000);
            }
        }
    }
    
    // Initialize the application
    function init() {
        console.log('Initializing mobile fallback app...');
        
        try {
            loadSettings();
            setupSettings();
            setupErrorHandling();
            updateConnectionStatus();
            
            // Start time updates
            updateTime();
            setInterval(updateTime, 1000);
            
            console.log('Mobile fallback app initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize mobile fallback:', error);
            
            // Show basic error message
            const errorElement = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            
            if (errorElement && errorText) {
                errorText.textContent = 'App initialization failed. Basic time display only.';
                errorElement.hidden = false;
            }
            
            // Still try to show time
            try {
                updateTime();
                setInterval(updateTime, 1000);
            } catch (timeError) {
                console.error('Even basic time display failed:', timeError);
            }
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();