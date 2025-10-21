/**
 * Integration tests for NTPService
 * Tests NTP API communication, response handling, and fallback behavior
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import { NTPService } from '../services/NTPService.js';

// Test suite for NTPService
describe('NTPService Integration Tests', () => {
    let ntpService;

    beforeEach(() => {
        ntpService = new NTPService();
        // Clear any existing timers
        ntpService.stopPeriodicSync();
    });

    afterEach(() => {
        if (ntpService) {
            ntpService.destroy();
        }
    });

    describe('NTP API Communication', () => {
        test('should fetch time from primary endpoint successfully', async () => {
            const time = await ntpService.fetchNTPTime();

            expect(time).toBeInstanceOf(Date);
            expect(time.getTime()).toBeGreaterThan(0);

            // Time should be reasonably close to current time (within 1 hour)
            const now = new Date();
            const timeDiff = Math.abs(time.getTime() - now.getTime());
            expect(timeDiff).toBeLessThan(60 * 60 * 1000); // 1 hour
        }, 10000); // 10 second timeout for network request

        test('should handle network timeout gracefully', async () => {
            // Mock fetch to simulate a timeout
            global.fetch = vi.fn().mockImplementation(() =>
                new Promise((resolve, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), 10);
                })
            );

            await expect(ntpService.fetchNTPTime()).rejects.toThrow();
        });

        test('should validate time response for reasonableness', () => {
            const now = new Date();
            const reasonableTime = new Date(now.getTime() + 1000); // 1 second ahead
            const unreasonableTime = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours ahead

            expect(ntpService.validateTimeResponse(reasonableTime)).toBe(true);
            expect(ntpService.validateTimeResponse(unreasonableTime)).toBe(false);
        });
    });

    describe('Offset Calculation', () => {
        test('should calculate offset correctly with mock data', () => {
            const localTime = new Date('2025-10-14T12:00:00.000Z');
            const ntpTime = new Date('2025-10-14T12:00:05.000Z'); // 5 seconds ahead

            const offset = ntpService.calculateOffset(ntpTime, localTime);
            expect(offset).toBe(5000); // 5000 milliseconds
        });

        test('should handle negative offset correctly', () => {
            const localTime = new Date('2025-10-14T12:00:05.000Z');
            const ntpTime = new Date('2025-10-14T12:00:00.000Z'); // 5 seconds behind

            const offset = ntpService.calculateOffset(ntpTime, localTime);
            expect(offset).toBe(-5000); // -5000 milliseconds
        });

        test('should throw error for invalid date objects', () => {
            expect(() => {
                ntpService.calculateOffset('invalid', new Date());
            }).toThrow('Invalid date objects provided for offset calculation');

            expect(() => {
                ntpService.calculateOffset(new Date(), null);
            }).toThrow('Invalid date objects provided for offset calculation');
        });
    });

    describe('Synchronization and Fallback Behavior', () => {
        test('should perform successful synchronization', async () => {
            const success = await ntpService.performSync();

            if (navigator.onLine) {
                expect(success).toBe(true);
                expect(ntpService.lastSyncTime).toBeInstanceOf(Date);
                expect(typeof ntpService.timeOffset).toBe('number');
            }
        }, 10000);

        test('should handle offline mode correctly', () => {
            // Mock offline state
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            expect(ntpService.isOnline()).toBe(false);

            // Reset to online
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });
        });

        test('should provide accurate time using cached offset', () => {
            // Set a known offset
            ntpService.timeOffset = 5000; // 5 seconds
            ntpService.lastSyncTime = new Date();
            ntpService.isOnlineMode = true;

            const accurateTime = ntpService.getCurrentTime();
            const localTime = new Date();

            // Accurate time should be approximately 5 seconds ahead of local time
            const actualOffset = accurateTime.getTime() - localTime.getTime();
            expect(Math.abs(actualOffset - 5000)).toBeLessThan(100); // Within 100ms tolerance
        });

        test('should fallback to local time when never synced', () => {
            ntpService.timeOffset = 0;
            ntpService.lastSyncTime = null;
            ntpService.isOnlineMode = false;

            const fallbackTime = ntpService.getCurrentTime();
            const localTime = new Date();

            // Should be very close to local time
            const timeDiff = Math.abs(fallbackTime.getTime() - localTime.getTime());
            expect(timeDiff).toBeLessThan(100); // Within 100ms
        });

        test('should maintain last known offset when sync fails', async () => {
            // Set initial successful sync state
            ntpService.timeOffset = 3000;
            ntpService.lastSyncTime = new Date();
            ntpService.isOnlineMode = true;

            const initialOffset = ntpService.timeOffset;

            // Mock a failed sync by making fetch fail
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await ntpService.performSync();

            // Should maintain the previous offset
            expect(ntpService.timeOffset).toBe(initialOffset);
            expect(ntpService.isOnlineMode).toBe(false);
        });
    });

    describe('Periodic Synchronization', () => {
        test('should start and stop periodic sync correctly', () => {
            expect(ntpService.syncTimer).toBeNull();

            ntpService.startPeriodicSync(1); // 1 minute interval
            expect(ntpService.syncTimer).not.toBeNull();
            expect(ntpService.syncInterval).toBe(60000); // 1 minute in ms

            ntpService.stopPeriodicSync();
            expect(ntpService.syncTimer).toBeNull();
        });

        test('should update sync interval correctly', () => {
            ntpService.setSyncInterval(30); // 30 minutes
            expect(ntpService.syncInterval).toBe(30 * 60 * 1000);

            expect(() => {
                ntpService.setSyncInterval(0);
            }).toThrow('Sync interval must be at least 1 minute');
        });

        test('should provide sync status information', () => {
            ntpService.timeOffset = 2000;
            ntpService.lastSyncTime = new Date();
            ntpService.isOnlineMode = true;

            const status = ntpService.getSyncStatus();

            expect(status).toHaveProperty('isOnline', true);
            expect(status).toHaveProperty('lastSyncTime');
            expect(status).toHaveProperty('timeOffset', 2000);
            expect(status).toHaveProperty('syncInterval');
            expect(status).toHaveProperty('isUsingNTPTime', true);
        });
    });

    describe('Network Event Handling', () => {
        test('should handle online/offline events', () => {
            // Mock the event listeners to actually call the handlers
            let offlineHandler, onlineHandler;

            window.addEventListener = vi.fn((event, handler) => {
                if (event === 'offline') offlineHandler = handler;
                if (event === 'online') onlineHandler = handler;
            });

            // Create a new service to set up the event listeners
            const testService = new NTPService();

            // Simulate going offline by calling the handler directly
            if (offlineHandler) offlineHandler();
            expect(testService.isOnlineMode).toBe(false);

            // Simulate coming back online
            if (onlineHandler) onlineHandler();
            expect(testService.isOnlineMode).toBe(true);

            testService.destroy();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle malformed API responses', async () => {
            // Mock fetch to return malformed response
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ invalid: 'data' })
            });

            await expect(ntpService.fetchNTPTime()).rejects.toThrow();
        });

        test('should handle HTTP error responses', async () => {
            // Mock fetch to return HTTP error
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(ntpService.fetchNTPTime()).rejects.toThrow('HTTP 404: Not Found');
        });

        test('should test connectivity correctly', async () => {
            // Test with working service
            const isConnected = await ntpService.testConnectivity();

            if (navigator.onLine) {
                expect(typeof isConnected).toBe('boolean');
            }
        }, 10000);
    });

    describe('Resource Cleanup', () => {
        test('should clean up resources on destroy', () => {
            ntpService.startPeriodicSync(5);
            expect(ntpService.syncTimer).not.toBeNull();

            ntpService.destroy();
            expect(ntpService.syncTimer).toBeNull();
        });
    });
});

// Mock data for testing different API response formats
const mockApiResponses = {
    worldtime: {
        utc_datetime: '2025-10-14T12:00:00.000000+00:00',
        timezone: 'UTC'
    },
    timeapi: {
        dateTime: '2025-10-14T12:00:00.0000000Z'
    },
    timezonedb: {
        status: 'OK',
        timestamp: 1729080000 // Unix timestamp
    }
};

// Additional tests for API response parsing
describe('NTPService API Response Parsing', () => {
    let ntpService;

    beforeEach(() => {
        ntpService = new NTPService();
    });

    afterEach(() => {
        ntpService.destroy();
    });

    test('should parse WorldTimeAPI response correctly', () => {
        const parsedTime = ntpService.parseTimeResponse(mockApiResponses.worldtime, 'worldtime');
        expect(parsedTime).toBeInstanceOf(Date);
        expect(parsedTime.getUTCFullYear()).toBe(2025);
    });

    test('should parse TimeAPI response correctly', () => {
        const parsedTime = ntpService.parseTimeResponse(mockApiResponses.timeapi, 'timeapi');
        expect(parsedTime).toBeInstanceOf(Date);
        expect(parsedTime.getUTCFullYear()).toBe(2025);
    });

    test('should parse TimezoneDB response correctly', () => {
        const parsedTime = ntpService.parseTimeResponse(mockApiResponses.timezonedb, 'timezonedb');
        expect(parsedTime).toBeInstanceOf(Date);
    });

    test('should throw error for unknown API type', () => {
        expect(() => {
            ntpService.parseTimeResponse({}, 'unknown');
        }).toThrow('Unknown API type: unknown');
    });

    test('should throw error for invalid time format', () => {
        expect(() => {
            ntpService.parseTimeResponse({ utc_datetime: 'invalid-date' }, 'worldtime');
        }).toThrow('Invalid time format received');
    });
});