/**
 * Clean Main Application Entry Point
 * Simplified version with essential functionality
 */

import { TimeController } from './controllers/TimeController.js';
import { NTPService } from './services/NTPService.js';
import { UIController } from './controllers/UIController.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { BackgroundManager } from './managers/BackgroundManager.js';

class App {
    constructor() {
        this.settingsManager = null;
        this.ntpService = null;
        this.uiController = null;
        this.backgroundManager = null;
        this.timeController = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Initializing Time Display App...');
            
            // Initialize core services
            this.settingsManager = new SettingsManager();
            await this.settingsManager.loadAllSettings();
            console.log('Settings manager initialized');
            
            this.ntpService = new NTPService();
            console.log('NTP service initialized');
            
            this.backgroundManager = new BackgroundManager(this.settingsManager);
            await this.backgroundManager.initializeBackground();
            console.log('Background manager initialized');
            
            this.uiController = new UIController(this.settingsManager, this.backgroundManager);
            console.log('UI controller initialized');
            
            this.timeController = new TimeController(this.ntpService, this.uiController, this.settingsManager);
            await this.timeController.initialize();
            console.log('Time controller initialized');
            
            this.isInitialized = true;
            console.log('Time Display App initialized successfully');
            
            // Show connection status
            if (this.uiController && this.timeController) {
                this.uiController.showConnectionStatus(this.timeController.isNTPSynced || false);
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    handleInitializationError(error) {
        console.error('Application initialization failed:', error);
        
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = 'Failed to initialize application. Some features may not work properly.';
            errorElement.hidden = false;
        }
        
        // Try to provide basic functionality
        this.attemptBasicFunctionality();
    }

    attemptBasicFunctionality() {
        try {
            console.log('Attempting to provide basic functionality...');
            
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
                
                updateBasicTime();
                setInterval(updateBasicTime, 1000);
                
                console.log('Basic time functionality enabled');
            }
            
        } catch (error) {
            console.error('Failed to provide basic functionality:', error);
        }
    }

    destroy() {
        try {
            if (this.timeController) {
                this.timeController.destroy();
            }
            if (this.backgroundManager) {
                this.backgroundManager.destroy();
            }
            if (this.uiController) {
                this.uiController.destroy();
            }
            if (this.settingsManager) {
                this.settingsManager.destroy();
            }
            if (this.ntpService) {
                this.ntpService.destroy();
            }
            
            this.isInitialized = false;
            console.log('Application destroyed successfully');
            
        } catch (error) {
            console.error('Error during application destruction:', error);
        }
    }
}

// Global app instance
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

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});