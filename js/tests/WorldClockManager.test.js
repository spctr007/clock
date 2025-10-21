/**
 * WorldClockManager Tests
 */

import { WorldClockManager } from '../managers/WorldClockManager.js';
import { SettingsManager } from '../managers/SettingsManager.js';

// Mock SettingsManager for testing
class MockSettingsManager {
    constructor() {
        this.settings = {
            worldClocks: []
        };
    }

    getSetting(key, defaultValue) {
        return this.settings[key] || defaultValue;
    }

    saveSetting(key, value) {
        this.settings[key] = value;
    }

    addWorldClock(config) {
        if (this.settings.worldClocks.length >= 3) return false;
        this.settings.worldClocks.push(config);
        return true;
    }

    removeWorldClock(id) {
        const initialLength = this.settings.worldClocks.length;
        this.settings.worldClocks = this.settings.worldClocks.filter(wc => wc.id !== id);
        return this.settings.worldClocks.length < initialLength;
    }

    getWorldClocks() {
        return this.settings.worldClocks;
    }

    getEnabledWorldClocks() {
        return this.settings.worldClocks.filter(wc => wc.isEnabled);
    }

    toggleWorldClock(id) {
        const clock = this.settings.worldClocks.find(wc => wc.id === id);
        if (clock) {
            clock.isEnabled = !clock.isEnabled;
            return true;
        }
        return false;
    }

    updateWorldClock(id, updates) {
        const clockIndex = this.settings.worldClocks.findIndex(wc => wc.id === id);
        if (clockIndex !== -1) {
            this.settings.worldClocks[clockIndex] = { ...this.settings.worldClocks[clockIndex], ...updates };
            return true;
        }
        return false;
    }

    clearWorldClocks() {
        this.settings.worldClocks = [];
    }
}

// Test functions
function testWorldClockManager() {
    console.log('Testing WorldClockManager...');
    
    const settingsManager = new MockSettingsManager();
    const worldClockManager = new WorldClockManager(settingsManager);
    
    // Test 1: Add world clock
    console.log('Test 1: Adding world clock');
    const result1 = worldClockManager.addWorldClock('America/New_York', 'New York');
    console.log('Add result:', result1 ? 'SUCCESS' : 'FAILED');
    
    // Test 2: Get available timezones
    console.log('Test 2: Getting available timezones');
    const timezones = worldClockManager.getAvailableTimezones();
    console.log('Available timezones count:', timezones.length);
    console.log('First timezone:', timezones[0]);
    
    // Test 3: Get time for timezone
    console.log('Test 3: Getting time for timezone');
    try {
        const timeData = worldClockManager.getTimeForTimezone(new Date(), 'America/New_York');
        console.log('Time data:', timeData);
        console.log('Time for timezone: SUCCESS');
    } catch (error) {
        console.log('Time for timezone: FAILED', error.message);
    }
    
    // Test 4: Format date for timezone
    console.log('Test 4: Formatting date for timezone');
    try {
        const dateData = worldClockManager.formatDateForTimezone(new Date(), 'Europe/London');
        console.log('Date data:', dateData);
        console.log('Format date: SUCCESS');
    } catch (error) {
        console.log('Format date: FAILED', error.message);
    }
    
    // Test 5: Search timezones
    console.log('Test 5: Searching timezones');
    const searchResults = worldClockManager.searchTimezones('New');
    console.log('Search results for "New":', searchResults.length, 'results');
    
    // Test 6: Validate timezone
    console.log('Test 6: Validating timezones');
    const validTimezone = worldClockManager.isValidTimezone('America/New_York');
    const invalidTimezone = worldClockManager.isValidTimezone('Invalid/Timezone');
    console.log('Valid timezone check:', validTimezone ? 'SUCCESS' : 'FAILED');
    console.log('Invalid timezone check:', !invalidTimezone ? 'SUCCESS' : 'FAILED');
    
    // Test 7: Get formatted time string
    console.log('Test 7: Getting formatted time string');
    const worldClock = worldClockManager.getWorldClocks()[0];
    if (worldClock) {
        worldClockManager.updateWorldClockTime(worldClock);
        const timeString = worldClockManager.getFormattedTimeString(worldClock, false, true);
        console.log('Formatted time string:', timeString);
    }
    
    console.log('WorldClockManager tests completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    testWorldClockManager();
} else {
    // Browser environment
    window.testWorldClockManager = testWorldClockManager;
}

export { testWorldClockManager };