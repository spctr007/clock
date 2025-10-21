/**
 * SettingsManager - Manages user preferences and persistent storage using LocalStorage
 */

export class SettingsManager {
    constructor() {
        this.storageKey = 'timeDisplayApp';
        this.settings = {};
        this.defaultSettings = {
            showSeconds: true,
            use24HourFormat: false,
            backgroundOpacity: 0.5,
            backgroundImage: null,
            ntpSyncInterval: 15, // minutes
            theme: 'dark',
            showDate: true,
            showWorldClocks: false,
            worldClocks: [] // Array of world clock configurations
        };
    }

    /**
     * Save a setting to localStorage
     */
    saveSetting(key, value) {
        try {
            this.settings[key] = value;
            
            // Save to localStorage
            const settingsJson = JSON.stringify(this.settings);
            localStorage.setItem(this.storageKey, settingsJson);
            
            console.log(`Setting saved: ${key} = ${value}`);
            
        } catch (error) {
            console.error('Failed to save setting:', error);
            
            // Handle localStorage quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
        }
    }

    /**
     * Get a setting from memory or localStorage
     */
    getSetting(key, defaultValue = null) {
        // First check if setting exists in memory
        if (this.settings.hasOwnProperty(key)) {
            return this.settings[key];
        }
        
        // Check default settings
        if (this.defaultSettings.hasOwnProperty(key)) {
            return this.defaultSettings[key];
        }
        
        // Return provided default value
        return defaultValue;
    }

    /**
     * Load all settings from localStorage
     */
    async loadAllSettings() {
        try {
            const settingsJson = localStorage.getItem(this.storageKey);
            
            if (settingsJson) {
                const loadedSettings = JSON.parse(settingsJson);
                
                // Validate and merge with defaults
                this.settings = this.validateAndMergeSettings(loadedSettings);
            } else {
                // No saved settings, use defaults
                this.settings = { ...this.defaultSettings };
            }
            
            console.log('Settings loaded:', this.settings);
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            
            // Fall back to default settings
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * Validate and merge loaded settings with defaults
     */
    validateAndMergeSettings(loadedSettings) {
        const mergedSettings = { ...this.defaultSettings };
        
        // Validate each setting
        for (const [key, value] of Object.entries(loadedSettings)) {
            if (this.isValidSetting(key, value)) {
                mergedSettings[key] = value;
            } else {
                console.warn(`Invalid setting ignored: ${key} = ${value}`);
            }
        }
        
        return mergedSettings;
    }

    /**
     * Validate a world clock configuration
     */
    isValidWorldClock(worldClock) {
        return worldClock &&
               typeof worldClock === 'object' &&
               typeof worldClock.id === 'string' &&
               typeof worldClock.cityName === 'string' &&
               typeof worldClock.timezone === 'string' &&
               typeof worldClock.isEnabled === 'boolean';
    }

    /**
     * Validate a setting key and value
     */
    isValidSetting(key, value) {
        const validations = {
            showSeconds: (val) => typeof val === 'boolean',
            use24HourFormat: (val) => typeof val === 'boolean',
            backgroundOpacity: (val) => typeof val === 'number' && val >= 0 && val <= 1,
            backgroundImage: (val) => val === null || typeof val === 'string',
            ntpSyncInterval: (val) => typeof val === 'number' && val > 0 && val <= 1440, // max 24 hours
            theme: (val) => ['light', 'dark'].includes(val),
            showDate: (val) => typeof val === 'boolean',
            showWorldClocks: (val) => typeof val === 'boolean',
            worldClocks: (val) => Array.isArray(val) && val.length <= 3 && val.every(this.isValidWorldClock)
        };
        
        const validator = validations[key];
        return validator ? validator(value) : false;
    }

    /**
     * Clear all settings
     */
    clearAllSettings() {
        try {
            localStorage.removeItem(this.storageKey);
            this.settings = { ...this.defaultSettings };
            console.log('All settings cleared');
        } catch (error) {
            console.error('Failed to clear settings:', error);
        }
    }

    /**
     * Export settings as JSON
     */
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from JSON
     */
    importSettings(settingsJson) {
        try {
            const importedSettings = JSON.parse(settingsJson);
            const validatedSettings = this.validateAndMergeSettings(importedSettings);
            
            this.settings = validatedSettings;
            
            // Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            
            console.log('Settings imported successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Get all current settings
     */
    getAllSettings() {
        return { ...this.settings };
    }

    /**
     * Update multiple settings at once
     */
    updateSettings(newSettings) {
        let hasChanges = false;
        
        for (const [key, value] of Object.entries(newSettings)) {
            if (this.isValidSetting(key, value) && this.settings[key] !== value) {
                this.settings[key] = value;
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
                console.log('Multiple settings updated');
            } catch (error) {
                console.error('Failed to save updated settings:', error);
            }
        }
    }

    /**
     * Reset a specific setting to default
     */
    resetSetting(key) {
        if (this.defaultSettings.hasOwnProperty(key)) {
            this.saveSetting(key, this.defaultSettings[key]);
        }
    }

    /**
     * Reset all settings to defaults
     */
    resetAllSettings() {
        this.settings = { ...this.defaultSettings };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            console.log('All settings reset to defaults');
        } catch (error) {
            console.error('Failed to reset settings:', error);
        }
    }

    /**
     * Handle localStorage quota exceeded error
     */
    handleStorageQuotaExceeded() {
        console.warn('LocalStorage quota exceeded, attempting to free space');
        
        // Try to remove background image if it exists
        if (this.settings.backgroundImage) {
            console.log('Removing background image to free storage space');
            this.settings.backgroundImage = null;
            
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            } catch (error) {
                console.error('Still unable to save after removing background image');
                // Clear all localStorage as last resort
                this.clearAllSettings();
            }
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo() {
        try {
            const settingsJson = JSON.stringify(this.settings);
            const sizeInBytes = new Blob([settingsJson]).size;
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            
            return {
                sizeBytes: sizeInBytes,
                sizeKB: sizeInKB,
                hasBackgroundImage: !!this.settings.backgroundImage
            };
        } catch (error) {
            console.error('Failed to calculate storage info:', error);
            return null;
        }
    }

    /**
     * Check if localStorage is available
     */
    isStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Add a world clock configuration
     */
    addWorldClock(worldClockConfig) {
        const worldClocks = this.getSetting('worldClocks', []);
        
        // Check if we already have 3 world clocks
        if (worldClocks.length >= 3) {
            console.warn('Maximum of 3 world clocks allowed');
            return false;
        }
        
        // Check if this timezone is already added
        if (worldClocks.some(wc => wc.timezone === worldClockConfig.timezone)) {
            console.warn('World clock for this timezone already exists');
            return false;
        }
        
        // Validate the world clock configuration
        if (!this.isValidWorldClock(worldClockConfig)) {
            console.error('Invalid world clock configuration');
            return false;
        }
        
        worldClocks.push(worldClockConfig);
        this.saveSetting('worldClocks', worldClocks);
        return true;
    }

    /**
     * Remove a world clock by ID
     */
    removeWorldClock(worldClockId) {
        const worldClocks = this.getSetting('worldClocks', []);
        const filteredClocks = worldClocks.filter(wc => wc.id !== worldClockId);
        
        if (filteredClocks.length !== worldClocks.length) {
            this.saveSetting('worldClocks', filteredClocks);
            return true;
        }
        
        return false;
    }

    /**
     * Update a world clock configuration
     */
    updateWorldClock(worldClockId, updates) {
        const worldClocks = this.getSetting('worldClocks', []);
        const clockIndex = worldClocks.findIndex(wc => wc.id === worldClockId);
        
        if (clockIndex === -1) {
            return false;
        }
        
        // Merge updates with existing configuration
        const updatedClock = { ...worldClocks[clockIndex], ...updates };
        
        // Validate the updated configuration
        if (!this.isValidWorldClock(updatedClock)) {
            console.error('Invalid world clock update');
            return false;
        }
        
        worldClocks[clockIndex] = updatedClock;
        this.saveSetting('worldClocks', worldClocks);
        return true;
    }

    /**
     * Get all world clock configurations
     */
    getWorldClocks() {
        return this.getSetting('worldClocks', []);
    }

    /**
     * Get enabled world clocks only
     */
    getEnabledWorldClocks() {
        return this.getWorldClocks().filter(wc => wc.isEnabled);
    }

    /**
     * Toggle world clock enabled state
     */
    toggleWorldClock(worldClockId) {
        const worldClocks = this.getSetting('worldClocks', []);
        const clockIndex = worldClocks.findIndex(wc => wc.id === worldClockId);
        
        if (clockIndex === -1) {
            return false;
        }
        
        worldClocks[clockIndex].isEnabled = !worldClocks[clockIndex].isEnabled;
        this.saveSetting('worldClocks', worldClocks);
        return true;
    }

    /**
     * Clear all world clocks
     */
    clearWorldClocks() {
        this.saveSetting('worldClocks', []);
    }

    /**
     * Clean up resources
     */
    destroy() {
        try {
            // Settings manager doesn't have active resources to clean up
            // but we can clear the in-memory settings if needed
            console.log('SettingsManager destroyed');
            
        } catch (error) {
            console.error('Error destroying SettingsManager:', error);
        }
    }
}