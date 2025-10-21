/**
 * Node.js version of TimeController tests
 * Run with: npm test
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Mock dependencies
class MockNTPService {
    async fetchNTPTime() {
        return new Date();
    }
    
    calculateOffset(ntpTime, localTime) {
        return 0;
    }
}

class MockUIController {
    updateTimeDisplay(timeData) {
        this.lastTimeData = timeData;
    }
    
    updateDateDisplay(dateData) {
        this.lastDateData = dateData;
    }
    
    showConnectionStatus(isConnected) {
        this.lastConnectionStatus = isConnected;
    }
}

class MockSettingsManager {
    constructor() {
        this.settings = {
            showSeconds: true,
            use24HourFormat: false,
            ntpSyncInterval: 15
        };
    }
    
    getSetting(key, defaultValue) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }
    
    saveSetting(key, value) {
        this.settings[key] = value;
    }
}

// Simplified TimeController for testing
class TimeController {
    constructor(ntpService, uiController, settingsManager) {
        this.ntpService = ntpService;
        this.uiController = uiController;
        this.settingsManager = settingsManager;
        this.timeOffset = 0;
        this.isNTPSynced = false;
        this.lastSyncTime = null;
    }
    
    formatTime(date) {
        const showSeconds = this.settingsManager.getSetting('showSeconds', true);
        const use24Hour = this.settingsManager.getSetting('use24HourFormat', false);
        
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        let ampm = '';
        
        if (!use24Hour) {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
        }
        
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        let timeString = `${formattedHours}:${formattedMinutes}`;
        if (showSeconds) {
            timeString += `:${formattedSeconds}`;
        }
        
        return {
            timeString,
            ampm,
            showSeconds,
            use24Hour,
            isNTPSynced: this.isNTPSynced,
            lastSync: this.lastSyncTime
        };
    }
    
    formatTime12Hour(date, showSeconds = true) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        let timeString = `${formattedHours}:${formattedMinutes}`;
        if (showSeconds) {
            timeString += `:${formattedSeconds}`;
        }
        
        return {
            timeString,
            ampm,
            hours,
            minutes,
            seconds
        };
    }
    
    formatTime24Hour(date, showSeconds = true) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        let timeString = `${formattedHours}:${formattedMinutes}`;
        if (showSeconds) {
            timeString += `:${formattedSeconds}`;
        }
        
        return {
            timeString,
            ampm: '',
            hours,
            minutes,
            seconds
        };
    }
    
    toggleSecondsDisplay() {
        const currentSetting = this.settingsManager.getSetting('showSeconds', true);
        const newSetting = !currentSetting;
        this.settingsManager.saveSetting('showSeconds', newSetting);
        return newSetting;
    }
    
    toggleTimeFormat() {
        const currentSetting = this.settingsManager.getSetting('use24HourFormat', false);
        const newSetting = !currentSetting;
        this.settingsManager.saveSetting('use24HourFormat', newSetting);
        return newSetting;
    }
    
    formatDate(date) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const dayName = dayNames[date.getDay()];
        const day = date.getDate();
        const monthName = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const weekNumber = this.getWeekNumber(date);
        
        const dateString = `${dayName}, ${day} ${monthName}, ${year}, week ${weekNumber}`;
        
        return {
            dateString,
            dayName,
            day,
            monthName,
            year,
            weekNumber,
            fullDate: date
        };
    }
    
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }
    
    getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }
    
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }
    
    destroy() {
        // Cleanup
    }
}

describe('TimeController', () => {
    let timeController;
    let mockNTPService;
    let mockUIController;
    let mockSettingsManager;
    
    beforeEach(() => {
        mockNTPService = new MockNTPService();
        mockUIController = new MockUIController();
        mockSettingsManager = new MockSettingsManager();
        
        timeController = new TimeController(
            mockNTPService,
            mockUIController,
            mockSettingsManager
        );
    });
    
    afterEach(() => {
        if (timeController) {
            timeController.destroy();
        }
    });

    describe('Time Formatting', () => {
        test('should format time in 12-hour format correctly', () => {
            const testDate = new Date('2025-10-14T14:30:45');
            mockSettingsManager.settings.use24HourFormat = false;
            mockSettingsManager.settings.showSeconds = true;
            
            const result = timeController.formatTime(testDate);
            
            assert.strictEqual(result.timeString, '02:30:45');
            assert.strictEqual(result.ampm, 'PM');
            assert.strictEqual(result.use24Hour, false);
            assert.strictEqual(result.showSeconds, true);
        });
        
        test('should format time in 24-hour format correctly', () => {
            const testDate = new Date('2025-10-14T14:30:45');
            mockSettingsManager.settings.use24HourFormat = true;
            mockSettingsManager.settings.showSeconds = true;
            
            const result = timeController.formatTime(testDate);
            
            assert.strictEqual(result.timeString, '14:30:45');
            assert.strictEqual(result.ampm, '');
            assert.strictEqual(result.use24Hour, true);
            assert.strictEqual(result.showSeconds, true);
        });
        
        test('should handle midnight in 12-hour format', () => {
            const testDate = new Date('2025-10-14T00:00:00');
            mockSettingsManager.settings.use24HourFormat = false;
            
            const result = timeController.formatTime(testDate);
            
            assert(result.timeString.includes('12:00'));
            assert.strictEqual(result.ampm, 'AM');
        });
        
        test('should handle noon in 12-hour format', () => {
            const testDate = new Date('2025-10-14T12:00:00');
            mockSettingsManager.settings.use24HourFormat = false;
            
            const result = timeController.formatTime(testDate);
            
            assert(result.timeString.includes('12:00'));
            assert.strictEqual(result.ampm, 'PM');
        });
        
        test('should format time without seconds when disabled', () => {
            const testDate = new Date('2025-10-14T14:30:45');
            mockSettingsManager.settings.showSeconds = false;
            
            const result = timeController.formatTime(testDate);
            
            assert.strictEqual(result.timeString, '02:30');
            assert.strictEqual(result.showSeconds, false);
        });
    });

    describe('Seconds Visibility Toggle', () => {
        test('should toggle seconds display setting', () => {
            mockSettingsManager.settings.showSeconds = true;
            
            const result = timeController.toggleSecondsDisplay();
            
            assert.strictEqual(result, false);
            assert.strictEqual(mockSettingsManager.settings.showSeconds, false);
        });
        
        test('should toggle from false to true', () => {
            mockSettingsManager.settings.showSeconds = false;
            
            const result = timeController.toggleSecondsDisplay();
            
            assert.strictEqual(result, true);
            assert.strictEqual(mockSettingsManager.settings.showSeconds, true);
        });
    });

    describe('Time Format Toggle', () => {
        test('should toggle between 12-hour and 24-hour format', () => {
            mockSettingsManager.settings.use24HourFormat = false;
            
            const result = timeController.toggleTimeFormat();
            
            assert.strictEqual(result, true);
            assert.strictEqual(mockSettingsManager.settings.use24HourFormat, true);
        });
    });

    describe('Date Formatting', () => {
        test('should format date in correct format', () => {
            const testDate = new Date('2025-10-14T15:30:00');
            
            const result = timeController.formatDate(testDate);
            
            assert.strictEqual(result.dateString, 'Tuesday, 14 October, 2025, week 42');
            assert.strictEqual(result.dayName, 'Tuesday');
            assert.strictEqual(result.day, 14);
            assert.strictEqual(result.monthName, 'October');
            assert.strictEqual(result.year, 2025);
            assert.strictEqual(result.weekNumber, 42);
        });
        
        test('should calculate week number correctly', () => {
            const testCases = [
                { date: new Date('2025-01-01'), expectedWeek: 1 },
                { date: new Date('2025-01-06'), expectedWeek: 2 },
                { date: new Date('2025-10-14'), expectedWeek: 42 }
            ];
            
            testCases.forEach(({ date, expectedWeek }) => {
                const weekNumber = timeController.getWeekNumber(date);
                assert.strictEqual(weekNumber, expectedWeek);
            });
        });
    });

    describe('Date Calculations', () => {
        test('should calculate leap year correctly', () => {
            assert.strictEqual(timeController.isLeapYear(2024), true);
            assert.strictEqual(timeController.isLeapYear(2025), false);
            assert.strictEqual(timeController.isLeapYear(2000), true);
            assert.strictEqual(timeController.isLeapYear(1900), false);
        });
        
        test('should calculate days in month correctly', () => {
            assert.strictEqual(timeController.getDaysInMonth(new Date('2025-01-15')), 31);
            assert.strictEqual(timeController.getDaysInMonth(new Date('2025-02-15')), 28);
            assert.strictEqual(timeController.getDaysInMonth(new Date('2024-02-15')), 29); // Leap year
            assert.strictEqual(timeController.getDaysInMonth(new Date('2025-04-15')), 30);
        });
    });
});