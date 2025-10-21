/**
 * Simple Main Application - Fallback version with basic functionality
 */

// Simple time display function
function updateBasicTime() {
    try {
        const now = new Date();
        const timeElement = document.getElementById('timeText');
        const dateElement = document.getElementById('dateText');
        
        if (timeElement) {
            const timeString = now.toLocaleTimeString();
            timeElement.textContent = timeString;
            console.log('Time updated:', timeString);
        }
        
        if (dateElement) {
            const dateString = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateElement.textContent = dateString;
            console.log('Date updated:', dateString);
        }
    } catch (error) {
        console.error('Error updating basic time:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Simple main: DOM loaded');
    
    // Start basic time display immediately
    updateBasicTime();
    setInterval(updateBasicTime, 1000);
    
    // Try to load the full app
    loadFullApp();
});

async function loadFullApp() {
    try {
        console.log('Attempting to load full application...');
        
        // Import modules one by one to see which one fails
        const { SettingsManager } = await import('./managers/SettingsManager.js');
        console.log('✓ SettingsManager imported');
        
        const { NTPService } = await import('./services/NTPService.js');
        console.log('✓ NTPService imported');
        
        const { BackgroundManager } = await import('./managers/BackgroundManager.js');
        console.log('✓ BackgroundManager imported');
        
        const { UIController } = await import('./controllers/UIController.js');
        console.log('✓ UIController imported');
        
        const { TimeController } = await import('./controllers/TimeController.js');
        console.log('✓ TimeController imported');
        
        // Initialize components
        console.log('Initializing components...');
        
        const settingsManager = new SettingsManager();
        await settingsManager.loadAllSettings();
        console.log('✓ SettingsManager initialized');
        
        const ntpService = new NTPService();
        console.log('✓ NTPService initialized');
        
        const backgroundManager = new BackgroundManager(settingsManager);
        await backgroundManager.initializeBackground();
        console.log('✓ BackgroundManager initialized');
        
        const uiController = new UIController(settingsManager, backgroundManager);
        console.log('✓ UIController initialized');
        
        const timeController = new TimeController(ntpService, uiController, settingsManager);
        await timeController.initialize();
        console.log('✓ TimeController initialized');
        
        console.log('Full application loaded successfully!');
        
        // Update connection status
        uiController.showConnectionStatus(navigator.onLine);
        
    } catch (error) {
        console.error('Failed to load full application:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Show error to user
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = `Failed to load application: ${error.message}`;
            errorElement.hidden = false;
        }
    }
}