/**
 * Unit tests for TimeController time formatting and display logic
 */

import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { TimeController } from '../controllers/TimeController.js';

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
            
            expect(result.timeString).toBe('02:30:45');
            expect(result.ampm).toBe('PM');
            expect(result.use24Hour).toBe(false);
            expect(result.showSeconds).toBe(true);
        });
        
        test('should format time in 24-hour format correctly', () => {
            const testDate = new Date('2025-10-14T14:30:45');
            mockSettingsManager.settings.use24HourFormat = true;
            mockSettingsManager.settings.showSeconds = true;
            
            const result = timeController.formatTime(testDate);
            
            expect(result.timeString).toBe('14:30:45');
            expect(result.ampm).toBe('');
            expect(result.use24Hour).toBe(true);
            expect(result.showSeconds).toBe(true);
        });
        
        test('should handle midnight in 12-hour format', () => {
            const testDate = new Date('2025-10-14T00:00:00');
            mockSettingsManager.settings.use24HourFormat = false;
            
            const result = timeController.formatTime(testDate);
            
            expect(result.timeString).toContain('12:00');
            expect(result.ampm).toBe('AM');
        });
        
        test('should handle noon in 12-hour format', () => {
            const testDate = new Date('2025-10-14T12:00:00');
            mockSettingsManager.settings.use24HourFormat = false;
            
            const result = timeController.formatTime(testDate);
            
            expect(result.timeString).toContain('12:00');
            expect(result.ampm).toBe('PM');
        });
        
        test('should format time without seconds when disabled', () => {
            const testDate = new Date('2025-10-14T14:30:45');
            mockSettingsManager.settings.showSeconds = false;
            
            const result = timeController.formatTime(testDate);
            
            expect(result.timeString).toBe('02:30');
            expect(result.showSeconds).toBe(false);
        });
    });

    describe('12-Hour Format Conversion', () => {
        test('should convert 24-hour to 12-hour format correctly', () => {
            const testCases = [
                { input: new Date('2025-10-14T00:30:00'), expected: { hours: 12, ampm: 'AM' } },
                { input: new Date('2025-10-14T01:30:00'), expected: { hours: 1, ampm: 'AM' } },
                { input: new Date('2025-10-14T11:30:00'), expected: { hours: 11, ampm: 'AM' } },
                { input: new Date('2025-10-14T12:30:00'), expected: { hours: 12, ampm: 'PM' } },
                { input: new Date('2025-10-14T13:30:00'), expected: { hours: 1, ampm: 'PM' } },
                { input: new Date('2025-10-14T23:30:00'), expected: { hours: 11, ampm: 'PM' } }
            ];
            
            testCases.forEach(({ input, expected }) => {
                const result = timeController.formatTime12Hour(input);
                expect(result.hours).toBe(expected.hours);
                expect(result.ampm).toBe(expected.ampm);
            });
        });
        
        test('should format 12-hour time with and without seconds', () => {
            const testDate = new Date('2025-10-14T15:45:30');
            
            const withSeconds = timeController.formatTime12Hour(testDate, true);
            expect(withSeconds.timeString).toBe('03:45:30');
            
            const withoutSeconds = timeController.formatTime12Hour(testDate, false);
            expect(withoutSeconds.timeString).toBe('03:45');
        });
    });

    describe('24-Hour Format', () => {
        test('should format 24-hour time correctly', () => {
            const testDate = new Date('2025-10-14T15:45:30');
            
            const result = timeController.formatTime24Hour(testDate, true);
            
            expect(result.timeString).toBe('15:45:30');
            expect(result.ampm).toBe('');
            expect(result.hours).toBe(15);
            expect(result.minutes).toBe(45);
            expect(result.seconds).toBe(30);
        });
        
        test('should format 24-hour time without seconds', () => {
            const testDate = new Date('2025-10-14T09:15:45');
            
            const result = timeController.formatTime24Hour(testDate, false);
            
            expect(result.timeString).toBe('09:15');
        });
    });

    describe('Seconds Visibility Toggle', () => {
        test('should toggle seconds display setting', () => {
            mockSettingsManager.settings.showSeconds = true;
            
            const result = timeController.toggleSecondsDisplay();
            
            expect(result).toBe(false);
            expect(mockSettingsManager.settings.showSeconds).toBe(false);
        });
        
        test('should toggle from false to true', () => {
            mockSettingsManager.settings.showSeconds = false;
            
            const result = timeController.toggleSecondsDisplay();
            
            expect(result).toBe(true);
            expect(mockSettingsManager.settings.showSeconds).toBe(true);
        });
    });

    describe('Time Format Toggle', () => {
        test('should toggle between 12-hour and 24-hour format', () => {
            mockSettingsManager.settings.use24HourFormat = false;
            
            const result = timeController.toggleTimeFormat();
            
            expect(result).toBe(true);
            expect(mockSettingsManager.settings.use24HourFormat).toBe(true);
        });
    });

    describe('Date Formatting', () => {
        test('should format date in correct format', () => {
            const testDate = new Date('2025-10-14T15:30:00');
            
            const result = timeController.formatDate(testDate);
            
            expect(result.dateString).toBe('Tuesday, 14 October, 2025, week 42');
            expect(result.dayName).toBe('Tuesday');
            expect(result.day).toBe(14);
            expect(result.monthName).toBe('October');
            expect(result.year).toBe(2025);
            expect(result.weekNumber).toBe(42);
        });
        
        test('should calculate week number correctly', () => {
            const testCases = [
                { date: new Date('2025-01-01'), expectedWeek: 1 },
                { date: new Date('2025-01-06'), expectedWeek: 2 },
                { date: new Date('2025-12-29'), expectedWeek: 1 }, // Week 1 of next year
                { date: new Date('2025-10-14'), expectedWeek: 42 }
            ];
            
            testCases.forEach(({ date, expectedWeek }) => {
                const weekNumber = timeController.getWeekNumber(date);
                expect(weekNumber).toBe(expectedWeek);
            });
        });
        
        test('should handle different months correctly', () => {
            const testCases = [
                { date: new Date('2025-01-15'), month: 'January' },
                { date: new Date('2025-02-15'), month: 'February' },
                { date: new Date('2025-12-15'), month: 'December' }
            ];
            
            testCases.forEach(({ date, month }) => {
                const result = timeController.formatDate(date);
                expect(result.monthName).toBe(month);
            });
        });
        
        test('should handle different days of week correctly', () => {
            const testCases = [
                { date: new Date('2025-10-12'), day: 'Sunday' },
                { date: new Date('2025-10-13'), day: 'Monday' },
                { date: new Date('2025-10-14'), day: 'Tuesday' },
                { date: new Date('2025-10-18'), day: 'Saturday' }
            ];
            
            testCases.forEach(({ date, day }) => {
                const result = timeController.formatDate(date);
                expect(result.dayName).toBe(day);
            });
        });
    });

    describe('Date Calculations', () => {
        test('should calculate leap year correctly', () => {
            expect(timeController.isLeapYear(2024)).toBe(true);
            expect(timeController.isLeapYear(2025)).toBe(false);
            expect(timeController.isLeapYear(2000)).toBe(true);
            expect(timeController.isLeapYear(1900)).toBe(false);
        });
        
        test('should calculate days in month correctly', () => {
            expect(timeController.getDaysInMonth(new Date('2025-01-15'))).toBe(31);
            expect(timeController.getDaysInMonth(new Date('2025-02-15'))).toBe(28);
            expect(timeController.getDaysInMonth(new Date('2024-02-15'))).toBe(29); // Leap year
            expect(timeController.getDaysInMonth(new Date('2025-04-15'))).toBe(30);
        });
        
        test('should calculate day of year correctly', () => {
            expect(timeController.getDayOfYear(new Date('2025-01-01'))).toBe(1);
            expect(timeController.getDayOfYear(new Date('2025-12-31'))).toBe(365);
            expect(timeController.getDayOfYear(new Date('2024-12-31'))).toBe(366); // Leap year
        });
    });

    describe('Edge Cases', () => {
        test('should handle single digit hours, minutes, and seconds', () => {
            const testDate = new Date('2025-10-14T09:05:03');
            
            const result = timeController.formatTime(testDate);
            
            expect(result.timeString).toBe('09:05:03');
        });
        
        test('should handle year boundaries for week calculation', () => {
            // Test dates around year boundaries
            const dec31_2024 = new Date('2024-12-31');
            const jan1_2025 = new Date('2025-01-01');
            
            const week2024 = timeController.getWeekNumber(dec31_2024);
            const week2025 = timeController.getWeekNumber(jan1_2025);
            
            expect(typeof week2024).toBe('number');
            expect(typeof week2025).toBe('number');
            expect(week2025).toBeGreaterThan(0);
        });
        
        test('should handle invalid dates gracefully', () => {
            const invalidDate = new Date('invalid');
            
            // Should not throw errors, but may return NaN values
            expect(() => {
                timeController.formatTime(invalidDate);
            }).not.toThrow();
            
            expect(() => {
                timeController.formatDate(invalidDate);
            }).not.toThrow();
        });
    });
});