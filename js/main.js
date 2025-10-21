/**
 * Main Application Entry Point
 * Initializes and coordinates all application modules
 */

import { TimeController } from './controllers/TimeController.js';
import { NTPService } from './services/NTPService.js';
import { UIController } from './controllers/UIController.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { BackgroundManager } from './managers/BackgroundManager.js';
import { WorldClockManager } from './managers/WorldClockManager.js';
import { WorldClockUI } from './controllers/WorldClockUI.js';
import { TimezoneSelector } from './controllers/TimezoneSelector.js';

class App {
    constructor() {
        this.settingsManager = null;
        this.ntpService = null;
        this.uiController = null;
        this.backgroundManager = null;
        this.timeController = null;
        this.worldClockManager = null;
        this.worldClockUI = null;
        this.timezoneSelector = null;
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = null;
        this.errorQueue = [];
    }

    /**
     * Initialize the application with comprehensive error handling
     */
    async init() {
        try {
            console.log('Initializing Time Display App...');
            
            // Set up online/offline detection
            this.setupNetworkMonitoring();
            
            // Initialize core services with error handling
            await this.initializeCoreServices();
            
            // Initialize UI components with error handling
            await this.initializeUIComponents();
            
            // Initialize world clock functionality with error handling
            await this.initializeWorldClockComponents();
            
            // Initialize main time controller with error handling
            await this.initializeTimeController();
            
            // Set up component integrations
            this.setupComponentIntegrations();
            
            // Set up global error handlers
            this.setupGlobalErrorHandlers();
            
            // Set up reconnection logic
            this.setupReconnectionLogic();
            
            this.isInitialized = true;
            console.log('Time Display App initialized successfully');
            
            // Show success status
            if (this.uiController) {
                const isNTPSynced = this.timeController && this.timeController.isNTPSynced;
                this.uiController.showConnectionStatus(isNTPSynced || false);
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize core services with error handling
     */
    async initializeCoreServices() {
        try {
            // Initialize settings manager
            this.settingsManager = new SettingsManager();
            await this.settingsManager.loadAllSettings();
            console.log('Settings manager initialized');
            
            // Initialize NTP service
            this.ntpService = new NTPService();
            console.log('NTP service initialized');
            
            // Initialize background manager
            this.backgroundManager = new BackgroundManager(this.settingsManager);
            await this.backgroundManager.initializeBackground();
            console.log('Background manager initialized');
            
        } catch (error) {
            console.error('Failed to initialize core services:', error);
            this.queueError('Core services initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize UI components with error handling
     */
    async initializeUIComponents() {
        try {
            // Initialize UI controller
            this.uiController = new UIController(this.settingsManager, this.backgroundManager);
            console.log('UI controller initialized');
            
        } catch (error) {
            console.error('Failed to initialize UI components:', error);
            this.queueError('UI initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize world clock components with error handling
     */
    async initializeWorldClockComponents() {
        try {
            // Initialize world clock manager
            this.worldClockManager = new WorldClockManager(this.settingsManager);
            await this.worldClockManager.initialize();
            console.log('World clock manager initialized');
            
            // Initialize world clock UI
            this.worldClockUI = new WorldClockUI(this.worldClockManager, this.settingsManager);
            await this.worldClockUI.initialize();
            console.log('World clock UI initialized');
            
            // Initialize timezone selector
            this.timezoneSelector = new TimezoneSelector(this.worldClockManager, this.settingsManager);
            this.timezoneSelector.initialize();
            console.log('Timezone selector initialized');
            
        } catch (error) {
            console.error('Failed to initialize world clock components:', error);
            this.queueError('World clock initialization failed', error);
            // Don't throw - world clocks are not critical for basic functionality
        }
    }

    /**
     * Initialize time controller with error handling
     */
    async initializeTimeController() {
        try {
            // Initialize main time controller
            this.timeController = new TimeController(
                this.ntpService,
                this.uiController,
                this.settingsManager
            );
            
            await this.timeController.initialize();
            console.log('Time controller initialized');
            
        } catch (error) {
            console.error('Failed to initialize time controller:', error);
            this.queueError('Time controller initialization failed', error);
            
            // Try to initialize with local time only
            try {
                if (this.timeController) {
                    this.timeController.handleOfflineMode();
                    this.timeController.startTimeUpdates();
                    console.log('Fallback to local time mode successful');
                }
            } catch (fallbackError) {
                console.error('Fallback initialization failed:', fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * Set up component integrations with error handling
     */
    setupComponentIntegrations() {
        try {
            // Set up world clock integration with main time updates
            this.setupWorldClockIntegration();
            
            // Set up settings synchronization
            this.setupSettingsSynchronization();
            
            // Set up background manager integration
            this.setupBackgroundIntegration();
            
            console.log('Component integrations set up successfully');
            
        } catch (error) {
            console.error('Failed to set up component integrations:', error);
            this.queueError('Component integration setup failed', error);
        }
    }

    /**
     * Set up world clock integration with main time updates
     */
    setupWorldClockIntegration() {
        if (!this.worldClockUI || !this.timezoneSelector) {
            console.warn('World clock components not available for integration');
            return;
        }

        try {
            // Listen for world clock updates from timezone selector
            document.addEventListener('worldClockUpdate', () => {
                try {
                    this.worldClockUI.updateWorldClockDisplays();
                    this.timezoneSelector.updateWorldClockList();
                } catch (error) {
                    console.error('Error updating world clocks:', error);
                    this.handleWorldClockError(error);
                }
            });

            // Integrate world clock updates with main time controller
            if (this.timeController && this.worldClockUI) {
                // Override the time controller's update method to include world clocks
                const originalUpdate = this.timeController.updateTimeDisplay.bind(this.timeController);
                
                this.timeController.updateTimeDisplay = (timeData) => {
                    try {
                        // Update main time display
                        originalUpdate(timeData);
                        
                        // Update world clocks with error handling
                        this.worldClockUI.updateAllWorldClocks();
                    } catch (error) {
                        console.error('Error in integrated time update:', error);
                        // Continue with main time display even if world clocks fail
                        originalUpdate(timeData);
                    }
                };
            }
            
            console.log('World clock integration set up successfully');
            
        } catch (error) {
            console.error('Failed to set up world clock integration:', error);
            this.queueError('World clock integration failed', error);
        }
    }

    /**
     * Set up settings synchronization between components
     */
    setupSettingsSynchronization() {
        try {
            // Listen for settings changes and propagate to all components
            document.addEventListener('settingsChanged', (event) => {
                try {
                    const { key, value } = event.detail;
                    this.handleSettingsChange(key, value);
                } catch (error) {
                    console.error('Error handling settings change:', error);
                }
            });
            
            console.log('Settings synchronization set up successfully');
            
        } catch (error) {
            console.error('Failed to set up settings synchronization:', error);
        }
    }

    /**
     * Set up background manager integration
     */
    setupBackgroundIntegration() {
        try {
            if (this.backgroundManager && this.uiController) {
                // Listen for background upload errors
                document.addEventListener('backgroundUploadError', (event) => {
                    const { error } = event.detail;
                    this.uiController.showErrorMessage(`Background upload failed: ${error.message}`);
                });
                
                console.log('Background integration set up successfully');
            }
            
        } catch (error) {
            console.error('Failed to set up background integration:', error);
        }
    }

    /**
     * Set up network monitoring for online/offline detection
     */
    setupNetworkMonitoring() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.isOnline = true;
            this.handleOnlineStateChange(true);
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.isOnline = false;
            this.handleOnlineStateChange(false);
        });

        // Initial online state
        this.isOnline = navigator.onLine;
        console.log(`Initial network state: ${this.isOnline ? 'online' : 'offline'}`);
    }

    /**
     * Handle online/offline state changes
     */
    handleOnlineStateChange(isOnline) {
        try {
            // Update UI connection status
            if (this.uiController) {
                this.uiController.showConnectionStatus(isOnline && this.timeController?.isNTPSynced);
            }

            if (isOnline) {
                // Connection restored - attempt to reconnect NTP
                this.handleConnectionRestored();
            } else {
                // Connection lost - switch to offline mode
                this.handleConnectionLost();
            }
            
        } catch (error) {
            console.error('Error handling network state change:', error);
        }
    }

    /**
     * Handle connection restored
     */
    async handleConnectionRestored() {
        try {
            console.log('Attempting to restore NTP synchronization...');
            
            // Reset reconnect attempts
            this.reconnectAttempts = 0;
            
            // Clear any existing reconnect interval
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            
            // Attempt NTP sync
            if (this.timeController) {
                const success = await this.timeController.forceSyncNTP();
                if (success) {
                    console.log('NTP synchronization restored');
                    if (this.uiController) {
                        this.uiController.showConnectionStatus(true);
                    }
                } else {
                    console.warn('Failed to restore NTP synchronization');
                    this.startReconnectionAttempts();
                }
            }
            
        } catch (error) {
            console.error('Error restoring connection:', error);
            this.startReconnectionAttempts();
        }
    }

    /**
     * Handle connection lost
     */
    handleConnectionLost() {
        try {
            console.log('Switching to offline mode...');
            
            // Switch time controller to offline mode
            if (this.timeController) {
                this.timeController.handleOfflineMode();
            }
            
            // Update UI to show offline status
            if (this.uiController) {
                this.uiController.showConnectionStatus(false);
            }
            
            // Ensure all customization features still work
            this.ensureOfflineFunctionality();
            
        } catch (error) {
            console.error('Error handling connection loss:', error);
        }
    }

    /**
     * Start reconnection attempts with exponential backoff
     */
    startReconnectionAttempts() {
        if (this.reconnectInterval || !this.isOnline) {
            return; // Already attempting or offline
        }

        const baseDelay = 5000; // 5 seconds
        const maxDelay = 300000; // 5 minutes
        
        const attemptReconnect = async () => {
            if (!this.isOnline || this.reconnectAttempts >= this.maxReconnectAttempts) {
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
                return;
            }

            try {
                console.log(`Reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
                
                if (this.timeController) {
                    const success = await this.timeController.forceSyncNTP();
                    if (success) {
                        console.log('Reconnection successful');
                        if (this.reconnectInterval) {
                            clearInterval(this.reconnectInterval);
                            this.reconnectInterval = null;
                        }
                        this.reconnectAttempts = 0;
                        return;
                    }
                }
                
                this.reconnectAttempts++;
                
            } catch (error) {
                console.error('Reconnection attempt failed:', error);
                this.reconnectAttempts++;
            }
        };

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay);
        
        this.reconnectInterval = setInterval(attemptReconnect, delay);
    }

    /**
     * Ensure offline functionality works properly
     */
    ensureOfflineFunctionality() {
        try {
            console.log('Verifying offline functionality...');
            
            // Verify background customization works offline
            if (this.backgroundManager) {
                const backgroundStatus = this.backgroundManager.ensureOfflineFunctionality();
                if (backgroundStatus) {
                    console.log('✓ Background customization available offline');
                } else {
                    console.warn('⚠ Background customization limited offline');
                    if (this.uiController) {
                        this.uiController.handleFeatureUnavailable('backgroundUpload', 'Storage not available');
                    }
                }
            }
            
            // Verify settings persistence works offline
            if (this.settingsManager) {
                const storageAvailable = this.settingsManager.isStorageAvailable();
                if (storageAvailable) {
                    console.log('✓ Settings management available offline');
                } else {
                    console.warn('⚠ Settings will not persist offline');
                    if (this.uiController) {
                        this.uiController.handleFeatureUnavailable('localStorage', 'Browser storage not available');
                    }
                }
            }
            
            // Verify world clocks work in offline mode
            if (this.worldClockManager) {
                const worldClocks = this.settingsManager.getEnabledWorldClocks();
                let supportedCount = 0;
                
                worldClocks.forEach(wc => {
                    if (this.worldClockManager.isTimezoneSupported(wc.timezone)) {
                        supportedCount++;
                    } else {
                        console.warn(`World clock timezone ${wc.timezone} not supported offline`);
                        if (this.uiController) {
                            this.uiController.handleWorldClockError(wc.id, 
                                new Error(`Timezone ${wc.timezone} not available offline`));
                        }
                    }
                });
                
                if (supportedCount === worldClocks.length) {
                    console.log('✓ All world clocks available offline');
                } else {
                    console.warn(`⚠ ${worldClocks.length - supportedCount} world clocks unavailable offline`);
                }
            }
            
            // Verify time display works offline
            if (this.timeController) {
                console.log('✓ Local time display available offline');
            }
            
            console.log('Offline functionality verification complete');
            
        } catch (error) {
            console.error('Error ensuring offline functionality:', error);
            
            // Show user-friendly message about offline limitations
            if (this.uiController) {
                this.uiController.showWarningMessage(
                    'Some features may be limited in offline mode', 
                    5000
                );
            }
        }
    }

    /**
     * Create reconnection logic when internet is restored
     */
    setupReconnectionLogic() {
        // This is already handled in handleConnectionRestored and startReconnectionAttempts
        // But we can add additional logic here if needed
        
        // Listen for successful NTP sync to update UI
        document.addEventListener('ntpSyncSuccess', () => {
            if (this.uiController) {
                this.uiController.showSuccessMessage('Time synchronization restored');
            }
        });
        
        // Listen for NTP sync failures
        document.addEventListener('ntpSyncFailure', () => {
            if (this.uiController) {
                this.uiController.showWarningMessage('Using local time - sync unavailable');
            }
        });
    }

    /**
     * Set up global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle settings change errors
        document.addEventListener('settingsError', (event) => {
            const { error, context } = event.detail;
            this.handleSettingsError(error, context);
        });

        // Handle world clock errors
        document.addEventListener('worldClockError', (event) => {
            const { error, worldClockId } = event.detail;
            this.handleWorldClockError(error, worldClockId);
        });

        // Handle background upload errors
        document.addEventListener('backgroundError', (event) => {
            const { error, operation } = event.detail;
            this.handleBackgroundError(error, operation);
        });
    }

    /**
     * Handle settings-related errors
     */
    handleSettingsError(error, context) {
        console.error(`Settings error in ${context}:`, error);
        
        if (this.uiController) {
            this.uiController.showErrorMessage(`Settings error: ${error.message}`);
        }
        
        this.queueError('Settings operation failed', error);
    }

    /**
     * Handle world clock errors
     */
    handleWorldClockError(error, worldClockId = null) {
        console.error('World clock error:', error);
        
        if (this.uiController) {
            const message = worldClockId 
                ? `World clock error for ${worldClockId}: ${error.message}`
                : `World clock error: ${error.message}`;
            this.uiController.showErrorMessage(message);
        }
        
        this.queueError('World clock operation failed', error);
    }

    /**
     * Handle background-related errors
     */
    handleBackgroundError(error, operation) {
        console.error(`Background error during ${operation}:`, error);
        
        if (this.uiController) {
            this.uiController.showErrorMessage(`Background ${operation} failed: ${error.message}`);
        }
        
        this.queueError('Background operation failed', error);
    }

    /**
     * Handle settings changes across components
     */
    handleSettingsChange(key, value) {
        try {
            switch (key) {
                case 'showSeconds':
                case 'use24HourFormat':
                    // Time display settings changed
                    if (this.timeController) {
                        this.timeController.updateTimeDisplay();
                    }
                    break;
                    
                case 'showWorldClocks':
                    // World clock visibility changed
                    if (this.worldClockUI) {
                        this.worldClockUI.updateWorldClockDisplays();
                    }
                    break;
                    
                case 'backgroundOpacity':
                    // Background opacity changed
                    if (this.backgroundManager) {
                        this.backgroundManager.setBackgroundOpacity(value);
                    }
                    break;
                    
                case 'ntpSyncInterval':
                    // NTP sync interval changed
                    if (this.timeController) {
                        this.timeController.updateSyncInterval(value);
                    }
                    break;
            }
            
        } catch (error) {
            console.error('Error handling settings change:', error);
            this.handleSettingsError(error, 'settings synchronization');
        }
    }

    /**
     * Queue error for later processing
     */
    queueError(message, error) {
        this.errorQueue.push({
            message,
            error,
            timestamp: new Date(),
            context: 'App'
        });
        
        // Limit error queue size
        if (this.errorQueue.length > 50) {
            this.errorQueue.shift();
        }
    }

    /**
     * Handle initialization errors with graceful degradation
     */
    handleInitializationError(error) {
        console.error('Application initialization failed:', error);
        
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = 'Failed to initialize application. Some features may not work properly.';
            errorElement.hidden = false;
        }
        
        // Try to provide basic functionality even if initialization fails
        this.attemptBasicFunctionality();
    }

    /**
     * Attempt to provide basic time display functionality
     */
    attemptBasicFunctionality() {
        try {
            console.log('Attempting to provide basic functionality...');
            
            // Try to show local time at minimum
            const timeElement = document.getElementById('timeText');
            const dateElement = document.getElementById('dateText');
            
            if (timeElement || dateElement) {
                const updateBasicTime = () => {
                    const now = new Date();
                    
                    if (timeElement) {
                        const timeString = now.toLocaleTimeString();
                        timeElement.textContent = timeString;
                    }
                    
                    if (dateElement) {
                        const dateString = now.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        dateElement.textContent = dateString;
                    }
                };
                
                // Update immediately and then every second
                updateBasicTime();
                setInterval(updateBasicTime, 1000);
                
                console.log('Basic time functionality enabled');
            }
            
        } catch (error) {
            console.error('Failed to provide basic functionality:', error);
        }
    }

    /**
     * Cleanup resources when the application is closed
     */
    destroy() {
        try {
            console.log('Destroying application...');
            
            // Clear reconnection interval
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            
            // Destroy components in reverse order of initialization
            if (this.timeController) {
                this.timeController.destroy();
                this.timeController = null;
            }
            
            if (this.timezoneSelector) {
                this.timezoneSelector.destroy();
                this.timezoneSelector = null;
            }
            
            if (this.worldClockUI) {
                this.worldClockUI.destroy();
                this.worldClockUI = null;
            }
            
            if (this.worldClockManager) {
                this.worldClockManager.destroy();
                this.worldClockManager = null;
            }
            
            if (this.backgroundManager) {
                this.backgroundManager.destroy();
                this.backgroundManager = null;
            }
            
            if (this.uiController) {
                this.uiController.destroy();
                this.uiController = null;
            }
            
            if (this.settingsManager) {
                this.settingsManager.destroy();
                this.settingsManager = null;
            }
            
            if (this.ntpService) {
                this.ntpService.destroy();
                this.ntpService = null;
            }
            
            // Clear error queue
            this.errorQueue = [];
            
            this.isInitialized = false;
            console.log('Application destroyed successfully');
            
        } catch (error) {
            console.error('Error during application destruction:', error);
        }
    }

    /**
     * Get application status for debugging
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            reconnectAttempts: this.reconnectAttempts,
            errorQueueLength: this.errorQueue.length,
            components: {
                settingsManager: !!this.settingsManager,
                ntpService: !!this.ntpService,
                uiController: !!this.uiController,
                backgroundManager: !!this.backgroundManager,
                timeController: !!this.timeController,
                worldClockManager: !!this.worldClockManager,
                worldClockUI: !!this.worldClockUI,
                timezoneSelector: !!this.timezoneSelector
            },
            timeControllerStatus: this.timeController ? {
                isNTPSynced: this.timeController.isNTPSynced,
                lastSyncTime: this.timeController.lastSyncTime,
                timeOffset: this.timeController.timeOffset
            } : null
        };
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(count = 10) {
        return this.errorQueue.slice(-count);
    }
}

// Global app instance for debugging
let appInstance = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing application...');
        
        appInstance = new App();
        await appInstance.init();
        
        // Make app instance available globally for debugging
        window.timeDisplayApp = appInstance;
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (appInstance) {
                appInstance.destroy();
            }
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (appInstance && appInstance.timeController) {
                if (document.hidden) {
                    // Page is hidden, reduce update frequency
                    console.log('Page hidden, reducing update frequency');
                } else {
                    // Page is visible, resume normal updates
                    console.log('Page visible, resuming normal updates');
                    appInstance.timeController.updateTimeDisplay();
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize application on DOM load:', error);
        
        // Show error message to user
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = 'Failed to start the application. Please refresh the page.';
            errorElement.hidden = false;
        }
    }
});

// Enhanced global error handlers
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // Queue error in app instance if available
    if (appInstance) {
        appInstance.queueError('Uncaught JavaScript error', event.error);
    }
    
    // Show user-friendly error message
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorElement && errorText && !errorElement.hidden) {
        // Don't show multiple error messages
        return;
    }
    
    if (errorElement && errorText) {
        errorText.textContent = 'An unexpected error occurred. The application may not work properly.';
        errorElement.hidden = false;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorElement.hidden = true;
        }, 10000);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', {
        reason: event.reason,
        promise: event.promise
    });
    
    // Queue error in app instance if available
    if (appInstance) {
        appInstance.queueError('Unhandled promise rejection', event.reason);
    }
    
    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
    
    // Show user-friendly error message for critical promise rejections
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('fetch') || 
         event.reason.message.includes('network') ||
         event.reason.message.includes('NTP'))) {
        
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = 'Network error occurred. Switching to local time mode.';
            errorElement.hidden = false;
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.hidden = true;
            }, 5000);
        }
    }
});

// Handle resource loading errors
window.addEventListener('load', () => {
    console.log('All resources loaded');
});

// Debug functions for development
window.getAppStatus = () => {
    return appInstance ? appInstance.getStatus() : 'App not initialized';
};

window.getAppErrors = (count = 10) => {
    return appInstance ? appInstance.getRecentErrors(count) : 'App not initialized';
};

window.forceNTPSync = async () => {
    if (appInstance && appInstance.timeController) {
        return await appInstance.timeController.forceSyncNTP();
    }
    return 'App or TimeController not available';
};