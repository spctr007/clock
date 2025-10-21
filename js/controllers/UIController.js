/**
 * UIController - Manages all user interface interactions and visual updates
 */

export class UIController {
    constructor(settingsManager, backgroundManager) {
        this.settingsManager = settingsManager;
        this.backgroundManager = backgroundManager;
        
        // DOM elements
        this.timeText = null;
        this.ampmText = null;
        this.dateText = null;
        this.worldClocksSection = null;
        this.worldClocksContainer = null;
        this.statusIndicator = null;
        this.statusText = null;
        this.settingsToggle = null;
        this.settingsContent = null;
        this.errorMessage = null;
        this.errorText = null;
        this.errorClose = null;
        
        // Settings controls
        this.showSecondsCheckbox = null;
        this.use24HourCheckbox = null;
        this.showWorldClocksCheckbox = null;
        this.worldClockSettings = null;
        this.worldClockList = null;
        this.timezoneSelect = null;
        this.addWorldClockBtn = null;
        this.backgroundUpload = null;
        this.opacitySlider = null;
        this.opacityValue = null;
        this.resetButton = null;
        
        this.isSettingsOpen = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadInitialSettings();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Time display elements
        this.timeText = document.getElementById('timeText');
        this.ampmText = document.getElementById('ampmText');
        this.dateText = document.getElementById('dateText');
        this.worldClocksSection = document.getElementById('worldClocksSection');
        this.worldClocksContainer = document.getElementById('worldClocksContainer');
        
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        
        // Settings panel elements
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsContent = document.getElementById('settingsContent');
        
        // Settings controls
        this.showSecondsCheckbox = document.getElementById('showSeconds');
        this.use24HourCheckbox = document.getElementById('use24Hour');
        this.showWorldClocksCheckbox = document.getElementById('showWorldClocks');
        this.worldClockSettings = document.getElementById('worldClockSettings');
        this.worldClockList = document.getElementById('worldClockList');
        this.timezoneSelect = document.getElementById('timezoneSelect');
        this.addWorldClockBtn = document.getElementById('addWorldClockBtn');
        this.backgroundUpload = document.getElementById('backgroundUpload');
        this.opacitySlider = document.getElementById('opacitySlider');
        this.opacityValue = document.getElementById('opacityValue');
        this.resetButton = document.getElementById('resetBackground');
        
        // Error message elements
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.errorClose = document.getElementById('errorClose');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Settings panel toggle
        if (this.settingsToggle) {
            this.settingsToggle.addEventListener('click', () => {
                this.toggleSettingsPanel();
            });
        }

        // Display settings
        if (this.showSecondsCheckbox) {
            this.showSecondsCheckbox.addEventListener('change', (e) => {
                this.settingsManager.saveSetting('showSeconds', e.target.checked);
            });
        }

        if (this.use24HourCheckbox) {
            this.use24HourCheckbox.addEventListener('change', (e) => {
                this.settingsManager.saveSetting('use24HourFormat', e.target.checked);
            });
        }

        // World clock settings
        if (this.showWorldClocksCheckbox) {
            this.showWorldClocksCheckbox.addEventListener('change', (e) => {
                this.settingsManager.saveSetting('showWorldClocks', e.target.checked);
                this.toggleWorldClockSettings(e.target.checked);
                this.updateWorldClockDisplays();
            });
        }

        if (this.timezoneSelect) {
            this.timezoneSelect.addEventListener('change', (e) => {
                this.addWorldClockBtn.disabled = !e.target.value;
            });
        }

        if (this.addWorldClockBtn) {
            this.addWorldClockBtn.addEventListener('click', () => {
                this.addWorldClock();
            });
        }

        // Background upload with comprehensive error handling
        if (this.backgroundUpload) {
            this.backgroundUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        // Validate file before upload
                        const validation = this.validateUploadFile(file);
                        if (!validation.isValid) {
                            this.showErrorMessage(validation.error, 'warning');
                            e.target.value = ''; // Clear the input
                            return;
                        }
                        
                        // Show upload progress
                        this.showUploadProgress(0);
                        
                        // Attempt upload with progress tracking
                        await this.backgroundManager.uploadBackground(file, (progress) => {
                            this.showUploadProgress(progress);
                        });
                        
                        // Success feedback
                        this.showSuccessMessage('Background uploaded successfully');
                        
                    } catch (error) {
                        console.error('Background upload failed:', error);
                        
                        // Provide specific error messages based on error type
                        let errorMessage = 'Failed to upload background';
                        
                        if (error.name === 'QuotaExceededError') {
                            errorMessage = 'Background image too large for storage. Try a smaller image.';
                        } else if (error.message.includes('format')) {
                            errorMessage = 'Unsupported image format. Please use JPG, PNG, or GIF.';
                        } else if (error.message.includes('size')) {
                            errorMessage = 'Image file is too large. Maximum size is 5MB.';
                        } else if (error.message.includes('network')) {
                            errorMessage = 'Network error during upload. Please try again.';
                        } else {
                            errorMessage += `: ${error.message}`;
                        }
                        
                        this.showErrorMessage(errorMessage, 'error');
                        
                        // Clear the file input
                        e.target.value = '';
                        
                        // Dispatch error event for app-level handling
                        document.dispatchEvent(new CustomEvent('backgroundUploadError', {
                            detail: { error, operation: 'upload' }
                        }));
                    }
                }
            });
        }

        // Opacity slider
        if (this.opacitySlider) {
            this.opacitySlider.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value) / 100;
                this.backgroundManager.setBackgroundOpacity(opacity);
                this.updateOpacityDisplay(e.target.value);
                this.settingsManager.saveSetting('backgroundOpacity', opacity);
            });
        }

        // Reset background button
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.backgroundManager.resetToDefault();
                this.opacitySlider.value = 50;
                this.updateOpacityDisplay(50);
            });
        }

        // Error message close
        if (this.errorClose) {
            this.errorClose.addEventListener('click', () => {
                this.hideErrorMessage();
            });
        }

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isSettingsOpen && 
                !this.settingsToggle.contains(e.target) && 
                !this.settingsContent.contains(e.target)) {
                this.closeSettingsPanel();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSettingsOpen) {
                this.closeSettingsPanel();
            }
        });
    }

    /**
     * Load initial settings into UI
     */
    loadInitialSettings() {
        // Load display preferences
        const showSeconds = this.settingsManager.getSetting('showSeconds', true);
        const use24Hour = this.settingsManager.getSetting('use24HourFormat', false);
        const showWorldClocks = this.settingsManager.getSetting('showWorldClocks', false);
        const opacity = this.settingsManager.getSetting('backgroundOpacity', 0.5);

        if (this.showSecondsCheckbox) {
            this.showSecondsCheckbox.checked = showSeconds;
        }

        if (this.use24HourCheckbox) {
            this.use24HourCheckbox.checked = use24Hour;
        }

        if (this.showWorldClocksCheckbox) {
            this.showWorldClocksCheckbox.checked = showWorldClocks;
            this.toggleWorldClockSettings(showWorldClocks);
        }

        if (this.opacitySlider) {
            this.opacitySlider.value = Math.round(opacity * 100);
            this.updateOpacityDisplay(Math.round(opacity * 100));
        }

        // Initialize timezone options and world clock list
        this.initializeTimezoneOptions();
        this.updateWorldClockList();
    }

    /**
     * Update the time display with smooth transitions
     */
    updateTimeDisplay(timeData) {
        if (this.timeText) {
            // Add smooth transition for time changes
            if (this.timeText.textContent !== timeData.timeString) {
                this.timeText.style.opacity = '0.7';
                
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(() => {
                    this.timeText.textContent = timeData.timeString;
                    this.timeText.style.opacity = '1';
                });
            }
        }

        if (this.ampmText) {
            const shouldShow = !timeData.use24Hour && timeData.ampm;
            
            if (shouldShow) {
                this.ampmText.textContent = timeData.ampm;
                this.ampmText.style.display = 'inline';
                this.ampmText.style.opacity = '1';
            } else {
                this.ampmText.style.opacity = '0.5';
                this.ampmText.style.display = 'none';
            }
        }
    }

    /**
     * Update time display without page refresh using real-time JavaScript
     */
    updateTimeDisplayRealtime(timeData) {
        // Ensure updates happen without causing page refresh
        if (this.timeText && this.timeText.textContent !== timeData.timeString) {
            // Use smooth transition for time changes
            this.timeText.classList.add('updating');
            
            setTimeout(() => {
                this.timeText.textContent = timeData.timeString;
                this.timeText.classList.remove('updating');
            }, 50);
        }

        // Update AM/PM indicator smoothly
        if (this.ampmText) {
            const shouldShow = !timeData.use24Hour && timeData.ampm;
            
            if (shouldShow && this.ampmText.textContent !== timeData.ampm) {
                this.ampmText.textContent = timeData.ampm;
            }
            
            this.ampmText.style.display = shouldShow ? 'inline' : 'none';
        }
    }

    /**
     * Update the date display with automatic midnight updates
     */
    updateDateDisplay(dateData) {
        if (this.dateText) {
            // Add smooth transition for date changes
            if (this.dateText.textContent !== dateData.dateString) {
                this.dateText.style.opacity = '0.7';
                
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(() => {
                    this.dateText.textContent = dateData.dateString;
                    this.dateText.style.opacity = '1';
                });
            }
        }
    }

    /**
     * Show connection status with detailed feedback
     */
    showConnectionStatus(isConnected, details = {}) {
        if (this.statusIndicator) {
            // Remove existing status classes
            this.statusIndicator.className = 'status-indicator';
            
            if (isConnected) {
                this.statusIndicator.classList.add('connected');
                this.statusIndicator.setAttribute('aria-label', 'Connected to time server');
            } else {
                this.statusIndicator.classList.add('disconnected');
                this.statusIndicator.setAttribute('aria-label', 'Using local time');
            }
        }

        if (this.statusText) {
            let statusText = isConnected ? 'Synchronized' : 'Local time';
            
            // Add additional status information
            if (details.lastSync) {
                const syncTime = new Date(details.lastSync);
                const now = new Date();
                const minutesAgo = Math.floor((now - syncTime) / (1000 * 60));
                
                if (minutesAgo < 1) {
                    statusText += ' (just now)';
                } else if (minutesAgo < 60) {
                    statusText += ` (${minutesAgo}m ago)';
                } else {
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    statusText += ` (${hoursAgo}h ago)`;
                }
            }
            
            if (details.isReconnecting) {
                statusText = 'Reconnecting...';
                this.statusIndicator?.classList.add('reconnecting');
            }
            
            this.statusText.textContent = statusText;
        }
    }

    /**
     * Show connection status with reconnection attempts
     */
    showReconnectionStatus(attempt, maxAttempts) {
        if (this.statusText) {
            this.statusText.textContent = `Reconnecting... (${attempt}/${maxAttempts})`;
        }
        
        if (this.statusIndicator) {
            this.statusIndicator.className = 'status-indicator reconnecting';
        }
    }

    /**
     * Show NTP sync progress
     */
    showSyncProgress(isInProgress) {
        if (this.statusIndicator) {
            if (isInProgress) {
                this.statusIndicator.classList.add('syncing');
            } else {
                this.statusIndicator.classList.remove('syncing');
            }
        }
        
        if (this.statusText && isInProgress) {
            this.statusText.textContent = 'Synchronizing...';
        }
    }

    /**
     * Toggle settings panel
     */
    toggleSettingsPanel() {
        if (this.isSettingsOpen) {
            this.closeSettingsPanel();
        } else {
            this.openSettingsPanel();
        }
    }

    /**
     * Open settings panel
     */
    openSettingsPanel() {
        if (this.settingsContent) {
            this.settingsContent.hidden = false;
            this.isSettingsOpen = true;
            
            if (this.settingsToggle) {
                this.settingsToggle.setAttribute('aria-expanded', 'true');
            }
        }
    }

    /**
     * Close settings panel
     */
    closeSettingsPanel() {
        if (this.settingsContent) {
            this.settingsContent.hidden = true;
            this.isSettingsOpen = false;
            
            if (this.settingsToggle) {
                this.settingsToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * Update opacity display value
     */
    updateOpacityDisplay(value) {
        if (this.opacityValue) {
            this.opacityValue.textContent = `${value}%`;
        }
    }

    /**
     * Show error message with enhanced feedback
     */
    showErrorMessage(message, type = 'error', duration = 5000) {
        if (this.errorMessage && this.errorText) {
            // Clear existing classes and add new type
            this.errorMessage.className = 'error-message';
            this.errorMessage.classList.add(`error-${type}`);
            
            this.errorText.textContent = message;
            this.errorMessage.hidden = false;
            
            // Add appropriate ARIA attributes
            this.errorMessage.setAttribute('role', type === 'warning' ? 'alert' : 'alertdialog');
            
            // Auto-hide after duration (unless it's a critical error)
            if (duration > 0 && type !== 'critical') {
                setTimeout(() => {
                    this.hideErrorMessage();
                }, duration);
            }
            
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Show warning message
     */
    showWarningMessage(message, duration = 3000) {
        this.showErrorMessage(message, 'warning', duration);
    }

    /**
     * Show info message
     */
    showInfoMessage(message, duration = 2000) {
        this.showErrorMessage(message, 'info', duration);
    }

    /**
     * Show success message
     */
    showSuccessMessage(message, duration = 2000) {
        this.showErrorMessage(message, 'success', duration);
    }

    /**
     * Show upload progress
     */
    showUploadProgress(progress) {
        if (this.errorMessage && this.errorText) {
            this.errorMessage.className = 'error-message error-info';
            this.errorText.textContent = `Uploading background... ${Math.round(progress)}%`;
            this.errorMessage.hidden = false;
            
            if (progress >= 100) {
                setTimeout(() => {
                    this.showSuccessMessage('Background uploaded successfully');
                }, 500);
            }
        }
    }

    /**
     * Show network status message
     */
    showNetworkStatus(isOnline) {
        const message = isOnline 
            ? 'Network connection restored' 
            : 'Network connection lost - using local time';
        const type = isOnline ? 'success' : 'warning';
        
        this.showErrorMessage(message, type, isOnline ? 2000 : 5000);
    }

    /**
     * Hide error message
     */
    hideErrorMessage() {
        if (this.errorMessage) {
            this.errorMessage.hidden = true;
        }
    }

    /**
     * Update background opacity in real-time
     */
    updateBackgroundOpacity(opacity) {
        this.backgroundManager.setBackgroundOpacity(opacity);
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.timeText) {
            this.timeText.textContent = '--:--';
        }
        
        if (this.statusText) {
            this.statusText.textContent = 'Loading...';
        }
    }

    /**
     * Get current settings from UI
     */
    getCurrentSettings() {
        return {
            showSeconds: this.showSecondsCheckbox?.checked || false,
            use24HourFormat: this.use24HourCheckbox?.checked || false,
            backgroundOpacity: (this.opacitySlider?.value || 50) / 100
        };
    }

    /**
     * Validate uploaded file
     */
    validateUploadFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!file) {
            return { isValid: false, error: 'No file selected' };
        }
        
        if (!allowedTypes.includes(file.type)) {
            return { 
                isValid: false, 
                error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP images.' 
            };
        }
        
        if (file.size > maxSize) {
            return { 
                isValid: false, 
                error: `File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.` 
            };
        }
        
        return { isValid: true };
    }

    /**
     * Handle graceful degradation when features are unavailable
     */
    handleFeatureUnavailable(featureName, reason) {
        console.warn(`Feature '${featureName}' unavailable: ${reason}`);
        
        switch (featureName) {
            case 'ntp':
                this.showWarningMessage('Time synchronization unavailable - using local time');
                this.disableNTPFeatures();
                break;
                
            case 'worldClocks':
                this.showWarningMessage('World clocks unavailable');
                this.disableWorldClockFeatures();
                break;
                
            case 'backgroundUpload':
                this.showWarningMessage('Background upload unavailable');
                this.disableBackgroundFeatures();
                break;
                
            case 'localStorage':
                this.showWarningMessage('Settings cannot be saved - browser storage unavailable');
                this.disableSettingsPersistence();
                break;
                
            default:
                this.showWarningMessage(`Feature '${featureName}' is currently unavailable`);
        }
    }

    /**
     * Disable NTP-related features
     */
    disableNTPFeatures() {
        // Hide sync status or show as disabled
        if (this.statusIndicator) {
            this.statusIndicator.classList.add('disabled');
        }
        
        if (this.statusText) {
            this.statusText.textContent = 'Local time only';
        }
    }

    /**
     * Disable world clock features
     */
    disableWorldClockFeatures() {
        if (this.showWorldClocksCheckbox) {
            this.showWorldClocksCheckbox.disabled = true;
            this.showWorldClocksCheckbox.checked = false;
        }
        
        if (this.worldClockSettings) {
            this.worldClockSettings.style.opacity = '0.5';
            this.worldClockSettings.style.pointerEvents = 'none';
        }
        
        if (this.timezoneSelect) {
            this.timezoneSelect.disabled = true;
        }
        
        if (this.addWorldClockBtn) {
            this.addWorldClockBtn.disabled = true;
        }
    }

    /**
     * Disable background upload features
     */
    disableBackgroundFeatures() {
        if (this.backgroundUpload) {
            this.backgroundUpload.disabled = true;
        }
        
        // Keep opacity slider functional as it doesn't require upload
    }

    /**
     * Disable settings persistence
     */
    disableSettingsPersistence() {
        // Settings will still work but won't persist
        // Add visual indicator that settings won't be saved
        const settingsTitle = document.querySelector('.settings-title');
        if (settingsTitle) {
            settingsTitle.textContent += ' (Not Saved)';
            settingsTitle.style.color = '#ff9800';
        }
    }

    /**
     * Update settings in UI with error handling
     */
    updateSettings(settings) {
        try {
            if (settings.showSeconds !== undefined && this.showSecondsCheckbox) {
                this.showSecondsCheckbox.checked = settings.showSeconds;
            }

            if (settings.use24HourFormat !== undefined && this.use24HourCheckbox) {
                this.use24HourCheckbox.checked = settings.use24HourFormat;
            }

            if (settings.showWorldClocks !== undefined && this.showWorldClocksCheckbox) {
                this.showWorldClocksCheckbox.checked = settings.showWorldClocks;
                this.toggleWorldClockSettings(settings.showWorldClocks);
            }

            if (settings.backgroundOpacity !== undefined && this.opacitySlider) {
                const opacityPercent = Math.round(settings.backgroundOpacity * 100);
                this.opacitySlider.value = opacityPercent;
                this.updateOpacityDisplay(opacityPercent);
            }
            
        } catch (error) {
            console.error('Error updating UI settings:', error);
            this.showErrorMessage('Failed to update display settings');
            
            // Dispatch error event
            document.dispatchEvent(new CustomEvent('settingsError', {
                detail: { error, context: 'UI update' }
            }));
        }
    }

    /**
     * Handle world clock timezone failures
     */
    handleWorldClockError(worldClockId, error) {
        console.error(`World clock error for ${worldClockId}:`, error);
        
        // Find and mark the problematic world clock
        const worldClockElement = document.querySelector(`[data-timezone="${worldClockId}"]`);
        if (worldClockElement) {
            worldClockElement.classList.add('error');
            
            const timeElement = worldClockElement.querySelector('.world-clock-time');
            if (timeElement) {
                timeElement.textContent = 'Error';
            }
            
            const dateElement = worldClockElement.querySelector('.world-clock-date');
            if (dateElement) {
                dateElement.textContent = 'Timezone unavailable';
            }
        }
        
        // Show user-friendly error message
        this.showErrorMessage(`World clock error: Unable to display time for ${worldClockId}`, 'warning');
        
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('worldClockError', {
            detail: { error, worldClockId }
        }));
    }

    /**
     * Cleanup resources
     */
    destroy() {
        try {
            // Remove event listeners
            if (this.settingsToggle) {
                this.settingsToggle.removeEventListener('click', this.toggleSettingsPanel);
            }
            
            // Clear any pending timeouts
            // (Add timeout tracking if needed)
            
            console.log('UIController destroyed');
            
        } catch (error) {
            console.error('Error destroying UIController:', error);
        }
    }

    /**
     * Initialize timezone options in the select dropdown
     */
    initializeTimezoneOptions() {
        if (!this.timezoneSelect) return;

        // Popular timezones with their display names
        const timezones = [
            { value: 'America/New_York', label: 'New York (EST/EDT)' },
            { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
            { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
            { value: 'America/Denver', label: 'Denver (MST/MDT)' },
            { value: 'Europe/London', label: 'London (GMT/BST)' },
            { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
            { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
            { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
            { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
            { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
            { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
            { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
            { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
            { value: 'Asia/Dubai', label: 'Dubai (GST)' },
            { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
            { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
            { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
            { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
            { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
            { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)' }
        ];

        // Clear existing options except the first one
        this.timezoneSelect.innerHTML = '<option value="">Select a timezone...</option>';

        // Add timezone options
        timezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.value;
            option.textContent = tz.label;
            this.timezoneSelect.appendChild(option);
        });
    }

    /**
     * Toggle world clock settings visibility
     */
    toggleWorldClockSettings(show) {
        if (this.worldClockSettings) {
            this.worldClockSettings.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Add a new world clock
     */
    addWorldClock() {
        const selectedTimezone = this.timezoneSelect.value;
        if (!selectedTimezone) return;

        const worldClocks = this.settingsManager.getWorldClocks();
        if (worldClocks.length >= 3) {
            this.showErrorMessage('Maximum of 3 world clocks allowed');
            return;
        }

        // Check if timezone already exists
        if (worldClocks.some(wc => wc.timezone === selectedTimezone)) {
            this.showErrorMessage('This timezone is already added');
            return;
        }

        // Get city name from the selected option
        const selectedOption = this.timezoneSelect.options[this.timezoneSelect.selectedIndex];
        const cityName = selectedOption.textContent.split(' (')[0];

        // Create world clock configuration
        const worldClockConfig = {
            id: `wc_${Date.now()}`,
            cityName: cityName,
            timezone: selectedTimezone,
            isEnabled: true
        };

        // Add to settings
        if (this.settingsManager.addWorldClock(worldClockConfig)) {
            this.updateWorldClockList();
            this.updateWorldClockDisplays();
            this.timezoneSelect.value = '';
            this.addWorldClockBtn.disabled = true;
        }
    }

    /**
     * Update the world clock list display
     */
    updateWorldClockList() {
        if (!this.worldClockList) return;

        const worldClocks = this.settingsManager.getWorldClocks();
        this.worldClockList.innerHTML = '';

        worldClocks.forEach(worldClock => {
            const item = this.createWorldClockItem(worldClock);
            this.worldClockList.appendChild(item);
        });

        // Update add button state
        if (this.addWorldClockBtn) {
            const canAddMore = worldClocks.length < 3;
            if (!canAddMore) {
                this.addWorldClockBtn.disabled = true;
                this.timezoneSelect.disabled = true;
            } else {
                this.timezoneSelect.disabled = false;
                this.addWorldClockBtn.disabled = !this.timezoneSelect.value;
            }
        }
    }

    /**
     * Create a world clock item element
     */
    createWorldClockItem(worldClock) {
        const item = document.createElement('div');
        item.className = 'world-clock-item';
        item.innerHTML = `
            <div class="world-clock-info">
                <div class="world-clock-city">${worldClock.cityName}</div>
                <div class="world-clock-timezone">${worldClock.timezone}</div>
            </div>
            <div class="world-clock-controls">
                <button class="world-clock-toggle ${worldClock.isEnabled ? 'enabled' : ''}" 
                        data-id="${worldClock.id}" 
                        aria-label="Toggle ${worldClock.cityName} world clock">
                </button>
                <button class="world-clock-remove" 
                        data-id="${worldClock.id}"
                        aria-label="Remove ${worldClock.cityName} world clock">
                    ×
                </button>
            </div>
        `;

        // Add event listeners
        const toggleBtn = item.querySelector('.world-clock-toggle');
        const removeBtn = item.querySelector('.world-clock-remove');

        toggleBtn.addEventListener('click', () => {
            this.toggleWorldClock(worldClock.id);
        });

        removeBtn.addEventListener('click', () => {
            this.removeWorldClock(worldClock.id);
        });

        return item;
    }

    /**
     * Toggle a world clock enabled state
     */
    toggleWorldClock(worldClockId) {
        if (this.settingsManager.toggleWorldClock(worldClockId)) {
            this.updateWorldClockList();
            this.updateWorldClockDisplays();
        }
    }

    /**
     * Remove a world clock
     */
    removeWorldClock(worldClockId) {
        if (this.settingsManager.removeWorldClock(worldClockId)) {
            this.updateWorldClockList();
            this.updateWorldClockDisplays();
        }
    }

    /**
     * Update world clock displays in the main view
     */
    updateWorldClockDisplays(worldClockData = null) {
        if (!this.worldClocksContainer || !this.worldClocksSection) return;

        const showWorldClocks = this.settingsManager.getSetting('showWorldClocks', false);
        const enabledWorldClocks = this.settingsManager.getEnabledWorldClocks();

        // Show/hide the world clocks section
        if (showWorldClocks && enabledWorldClocks.length > 0) {
            this.worldClocksSection.hidden = false;
        } else {
            this.worldClocksSection.hidden = true;
            return;
        }

        // Clear existing displays
        this.worldClocksContainer.innerHTML = '';

        // Create displays for enabled world clocks
        enabledWorldClocks.forEach(worldClock => {
            const display = this.createWorldClockDisplay(worldClock, worldClockData);
            this.worldClocksContainer.appendChild(display);
        });
    }

    /**
     * Create a world clock display element
     */
    createWorldClockDisplay(worldClock, timeData = null) {
        const display = document.createElement('div');
        display.className = 'world-clock-display';
        display.setAttribute('data-timezone', worldClock.timezone);
        
        display.innerHTML = `
            <div class="world-clock-city-name">${worldClock.cityName}</div>
            <div class="world-clock-time" id="worldClock_${worldClock.id}_time">--:--</div>
            <div class="world-clock-date" id="worldClock_${worldClock.id}_date">Loading...</div>
        `;

        return display;
    }

    /**
     * Update a specific world clock display with time data
     */
    updateWorldClockTime(worldClockId, timeData) {
        const timeElement = document.getElementById(`worldClock_${worldClockId}_time`);
        const dateElement = document.getElementById(`worldClock_${worldClockId}_date`);

        if (timeElement && timeData.timeString) {
            timeElement.textContent = timeData.timeString;
        }

        if (dateElement && timeData.dateString) {
            dateElement.textContent = timeData.dateString;
        }
    }
}