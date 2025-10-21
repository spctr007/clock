/**
 * WorldClockManager - Manages multiple time zone displays and world clock functionality
 */

export class WorldClockManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.worldClocks = [];
        this.updateInterval = null;
        this.isUpdating = false;
        
        // Popular timezones with their display names
        this.availableTimezones = [
            { timezone: 'America/New_York', cityName: 'New York', region: 'North America' },
            { timezone: 'America/Los_Angeles', cityName: 'Los Angeles', region: 'North America' },
            { timezone: 'America/Chicago', cityName: 'Chicago', region: 'North America' },
            { timezone: 'America/Toronto', cityName: 'Toronto', region: 'North America' },
            { timezone: 'America/Mexico_City', cityName: 'Mexico City', region: 'North America' },
            { timezone: 'America/Sao_Paulo', cityName: 'São Paulo', region: 'South America' },
            { timezone: 'America/Buenos_Aires', cityName: 'Buenos Aires', region: 'South America' },
            { timezone: 'Europe/London', cityName: 'London', region: 'Europe' },
            { timezone: 'Europe/Paris', cityName: 'Paris', region: 'Europe' },
            { timezone: 'Europe/Berlin', cityName: 'Berlin', region: 'Europe' },
            { timezone: 'Europe/Rome', cityName: 'Rome', region: 'Europe' },
            { timezone: 'Europe/Madrid', cityName: 'Madrid', region: 'Europe' },
            { timezone: 'Europe/Amsterdam', cityName: 'Amsterdam', region: 'Europe' },
            { timezone: 'Europe/Moscow', cityName: 'Moscow', region: 'Europe' },
            { timezone: 'Asia/Tokyo', cityName: 'Tokyo', region: 'Asia' },
            { timezone: 'Asia/Shanghai', cityName: 'Shanghai', region: 'Asia' },
            { timezone: 'Asia/Hong_Kong', cityName: 'Hong Kong', region: 'Asia' },
            { timezone: 'Asia/Singapore', cityName: 'Singapore', region: 'Asia' },
            { timezone: 'Asia/Seoul', cityName: 'Seoul', region: 'Asia' },
            { timezone: 'Asia/Mumbai', cityName: 'Mumbai', region: 'Asia' },
            { timezone: 'Asia/Dubai', cityName: 'Dubai', region: 'Asia' },
            { timezone: 'Australia/Sydney', cityName: 'Sydney', region: 'Australia' },
            { timezone: 'Australia/Melbourne', cityName: 'Melbourne', region: 'Australia' },
            { timezone: 'Pacific/Auckland', cityName: 'Auckland', region: 'Pacific' },
            { timezone: 'Africa/Cairo', cityName: 'Cairo', region: 'Africa' },
            { timezone: 'Africa/Johannesburg', cityName: 'Johannesburg', region: 'Africa' }
        ];
    }

    /**
     * Initialize the world clock manager
     */
    async initialize() {
        try {
            // Load saved world clocks from settings
            await this.loadWorldClocksFromSettings();
            
            console.log('WorldClockManager initialized with', this.worldClocks.length, 'world clocks');
            
        } catch (error) {
            console.error('Failed to initialize WorldClockManager:', error);
        }
    }

    /**
     * Add a new world clock
     */
    addWorldClock(timezone, cityName) {
        try {
            // Check if we already have 3 world clocks (maximum allowed)
            if (this.worldClocks.length >= 3) {
                console.warn('Maximum of 3 world clocks allowed');
                return false;
            }

            // Check if this timezone is already added
            if (this.worldClocks.some(wc => wc.timezone === timezone)) {
                console.warn('World clock for this timezone already exists');
                return false;
            }

            // Validate timezone
            if (!this.isValidTimezone(timezone)) {
                console.error('Invalid timezone:', timezone);
                return false;
            }

            // Generate unique ID
            const id = this.generateWorldClockId();

            // Create world clock configuration
            const worldClockConfig = {
                id: id,
                cityName: cityName || this.getCityNameForTimezone(timezone),
                timezone: timezone,
                isEnabled: true,
                timeData: null // Will be populated by updateAllWorldClocks
            };

            // Add to local array
            this.worldClocks.push(worldClockConfig);

            // Save to settings
            const success = this.settingsManager.addWorldClock(worldClockConfig);
            
            if (success) {
                console.log('World clock added:', worldClockConfig);
                
                // Update the time data for the new world clock
                this.updateWorldClockTime(worldClockConfig);
                
                return worldClockConfig;
            } else {
                // Remove from local array if saving failed
                this.worldClocks = this.worldClocks.filter(wc => wc.id !== id);
                return false;
            }

        } catch (error) {
            console.error('Failed to add world clock:', error);
            return false;
        }
    }

    /**
     * Remove a world clock by ID
     */
    removeWorldClock(id) {
        try {
            const initialLength = this.worldClocks.length;
            
            // Remove from local array
            this.worldClocks = this.worldClocks.filter(wc => wc.id !== id);
            
            // Remove from settings
            const success = this.settingsManager.removeWorldClock(id);
            
            if (success && this.worldClocks.length < initialLength) {
                console.log('World clock removed:', id);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Failed to remove world clock:', error);
            return false;
        }
    }

    /**
     * Update time for all enabled world clocks
     */
    updateAllWorldClocks() {
        if (this.isUpdating) {
            return; // Prevent concurrent updates
        }

        this.isUpdating = true;

        try {
            const enabledClocks = this.worldClocks.filter(wc => wc.isEnabled);
            
            enabledClocks.forEach(worldClock => {
                this.updateWorldClockTime(worldClock);
            });

        } catch (error) {
            console.error('Failed to update world clocks:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Update time data for a specific world clock
     */
    updateWorldClockTime(worldClock) {
        try {
            const now = new Date();
            const timeData = this.getTimeForTimezone(now, worldClock.timezone);
            const dateData = this.formatDateForTimezone(now, worldClock.timezone);
            
            worldClock.timeData = {
                ...timeData,
                date: dateData
            };

        } catch (error) {
            console.error('Failed to update world clock time:', worldClock.cityName, error);
            
            // Set error state
            worldClock.timeData = {
                hours: '--',
                minutes: '--',
                seconds: '--',
                ampm: '',
                isError: true,
                date: {
                    dayName: '--',
                    day: '--',
                    monthName: '--',
                    year: '--',
                    weekNumber: '--'
                }
            };
        }
    }

    /**
     * Get time for a specific timezone with enhanced offline support
     */
    getTimeForTimezone(date, timezone) {
        try {
            // Use Intl.DateTimeFormat for timezone conversion
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const parts = formatter.formatToParts(date);
            const hours24 = parseInt(parts.find(part => part.type === 'hour').value);
            const minutes = parseInt(parts.find(part => part.type === 'minute').value);
            const seconds = parseInt(parts.find(part => part.type === 'second').value);

            // Convert to 12-hour format
            let hours12 = hours24;
            let ampm = 'AM';
            
            if (hours24 === 0) {
                hours12 = 12;
            } else if (hours24 > 12) {
                hours12 = hours24 - 12;
                ampm = 'PM';
            } else if (hours24 === 12) {
                ampm = 'PM';
            }

            return {
                hours: hours24,
                hours12: hours12,
                minutes: minutes,
                seconds: seconds,
                ampm: ampm,
                timezone: timezone,
                isError: false
            };

        } catch (error) {
            console.error('Failed to get time for timezone:', timezone, error);
            
            // Enhanced fallback for offline mode
            return this.getFallbackTimeForTimezone(date, timezone);
        }
    }

    /**
     * Fallback method for getting timezone time when Intl API fails
     */
    getFallbackTimeForTimezone(date, timezone) {
        try {
            console.warn(`Using fallback time calculation for ${timezone}`);
            
            // Use a simplified offset calculation for common timezones
            const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
            
            // Common timezone offsets (in hours from UTC)
            // Note: This is a simplified approach and doesn't account for DST
            const timezoneOffsets = {
                'America/New_York': -5,    // EST (would need DST logic)
                'America/Los_Angeles': -8, // PST
                'America/Chicago': -6,     // CST
                'America/Denver': -7,      // MST
                'Europe/London': 0,        // GMT
                'Europe/Paris': 1,         // CET
                'Europe/Berlin': 1,        // CET
                'Europe/Rome': 1,          // CET
                'Europe/Madrid': 1,        // CET
                'Asia/Tokyo': 9,           // JST
                'Asia/Shanghai': 8,        // CST
                'Asia/Hong_Kong': 8,       // HKT
                'Asia/Singapore': 8,       // SGT
                'Asia/Dubai': 4,           // GST
                'Asia/Kolkata': 5.5,       // IST
                'Australia/Sydney': 11,    // AEDT (would need DST logic)
                'Australia/Melbourne': 11, // AEDT
                'Pacific/Auckland': 13,    // NZDT (would need DST logic)
                'America/Sao_Paulo': -3,   // BRT
                'America/Mexico_City': -6  // CST
            };
            
            const offset = timezoneOffsets[timezone] || 0;
            const timezoneTime = new Date(utcTime + (offset * 3600000));
            
            const hours24 = timezoneTime.getUTCHours();
            const minutes = timezoneTime.getUTCMinutes();
            const seconds = timezoneTime.getUTCSeconds();
            
            // Convert to 12-hour format
            let hours12 = hours24;
            let ampm = 'AM';
            
            if (hours24 === 0) {
                hours12 = 12;
            } else if (hours24 > 12) {
                hours12 = hours24 - 12;
                ampm = 'PM';
            } else if (hours24 === 12) {
                ampm = 'PM';
            }
            
            return {
                hours: hours24,
                hours12: hours12,
                minutes: minutes,
                seconds: seconds,
                ampm: ampm,
                timezone: timezone,
                isError: false,
                isFallback: true
            };
            
        } catch (error) {
            console.error(`Fallback time calculation failed for ${timezone}:`, error);
            
            // Final fallback - return local time with error flag
            const localTime = date || new Date();
            const hours24 = localTime.getHours();
            const minutes = localTime.getMinutes();
            const seconds = localTime.getSeconds();
            
            let hours12 = hours24;
            let ampm = 'AM';
            
            if (hours24 === 0) {
                hours12 = 12;
            } else if (hours24 > 12) {
                hours12 = hours24 - 12;
                ampm = 'PM';
            } else if (hours24 === 12) {
                ampm = 'PM';
            }
            
            return {
                hours: hours24,
                hours12: hours12,
                minutes: minutes,
                seconds: seconds,
                ampm: ampm,
                timezone: timezone,
                isError: true,
                errorMessage: 'Using local time - timezone unavailable'
            };
        }
    }

    /**
     * Check if timezone is supported in offline mode
     */
    isTimezoneSupported(timezone) {
        try {
            // Test if Intl.DateTimeFormat supports this timezone
            new Intl.DateTimeFormat('en-US', { timeZone: timezone });
            return true;
        } catch (error) {
            console.warn(`Timezone ${timezone} not supported:`, error);
            return false;
        }
    }

    /**
     * Validate timezone availability for offline mode
     */
    validateTimezoneForOffline(timezone) {
        if (!this.isTimezoneSupported(timezone)) {
            // Dispatch error event for UI handling
            document.dispatchEvent(new CustomEvent('worldClockError', {
                detail: { 
                    error: new Error(`Timezone ${timezone} not supported in offline mode`),
                    worldClockId: timezone 
                }
            }));
            return false;
        }
        return true;
    }

    /**
     * Format date for a specific timezone
     */
    formatDateForTimezone(date, timezone) {
        try {
            // Get date components for the timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const parts = formatter.formatToParts(date);
            const dayName = parts.find(part => part.type === 'weekday').value;
            const day = parseInt(parts.find(part => part.type === 'day').value);
            const monthName = parts.find(part => part.type === 'month').value;
            const year = parseInt(parts.find(part => part.type === 'year').value);

            // Calculate week number for the timezone
            const weekNumber = this.getWeekNumberForTimezone(date, timezone);

            return {
                dayName: dayName,
                day: day,
                monthName: monthName,
                year: year,
                weekNumber: weekNumber
            };

        } catch (error) {
            console.error('Failed to format date for timezone:', timezone, error);
            throw error;
        }
    }

    /**
     * Calculate week number for a specific timezone
     */
    getWeekNumberForTimezone(date, timezone) {
        try {
            // Create a date object in the target timezone
            const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
            
            // Calculate week number (ISO 8601 standard)
            const startOfYear = new Date(tzDate.getFullYear(), 0, 1);
            const pastDaysOfYear = (tzDate - startOfYear) / 86400000;
            const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
            
            return weekNumber;

        } catch (error) {
            console.error('Failed to calculate week number for timezone:', timezone, error);
            return 1; // Default to week 1
        }
    }

    /**
     * Get list of available timezones
     */
    getAvailableTimezones() {
        return [...this.availableTimezones];
    }

    /**
     * Get available timezones grouped by region
     */
    getTimezonesByRegion() {
        const grouped = {};
        
        this.availableTimezones.forEach(tz => {
            if (!grouped[tz.region]) {
                grouped[tz.region] = [];
            }
            grouped[tz.region].push(tz);
        });
        
        return grouped;
    }

    /**
     * Get all current world clocks
     */
    getWorldClocks() {
        return [...this.worldClocks];
    }

    /**
     * Get enabled world clocks only
     */
    getEnabledWorldClocks() {
        return this.worldClocks.filter(wc => wc.isEnabled);
    }

    /**
     * Toggle world clock enabled state
     */
    toggleWorldClock(id) {
        try {
            const worldClock = this.worldClocks.find(wc => wc.id === id);
            
            if (!worldClock) {
                return false;
            }

            worldClock.isEnabled = !worldClock.isEnabled;
            
            // Update in settings
            const success = this.settingsManager.toggleWorldClock(id);
            
            if (success) {
                console.log('World clock toggled:', id, 'enabled:', worldClock.isEnabled);
                return true;
            } else {
                // Revert local change if settings update failed
                worldClock.isEnabled = !worldClock.isEnabled;
                return false;
            }

        } catch (error) {
            console.error('Failed to toggle world clock:', error);
            return false;
        }
    }

    /**
     * Load world clocks from settings
     */
    async loadWorldClocksFromSettings() {
        try {
            const savedWorldClocks = this.settingsManager.getWorldClocks();
            
            // Validate and load each world clock
            this.worldClocks = savedWorldClocks.filter(wc => {
                if (this.isValidWorldClockConfig(wc)) {
                    // Initialize time data
                    wc.timeData = null;
                    return true;
                }
                console.warn('Invalid world clock configuration ignored:', wc);
                return false;
            });

            // Update time data for all loaded world clocks
            this.updateAllWorldClocks();

        } catch (error) {
            console.error('Failed to load world clocks from settings:', error);
            this.worldClocks = [];
        }
    }

    /**
     * Validate world clock configuration
     */
    isValidWorldClockConfig(config) {
        return config &&
               typeof config === 'object' &&
               typeof config.id === 'string' &&
               typeof config.cityName === 'string' &&
               typeof config.timezone === 'string' &&
               typeof config.isEnabled === 'boolean' &&
               this.isValidTimezone(config.timezone);
    }

    /**
     * Validate timezone string
     */
    isValidTimezone(timezone) {
        try {
            // Test if timezone is valid by trying to format a date with it
            new Intl.DateTimeFormat('en-US', { timeZone: timezone });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate unique ID for world clock
     */
    generateWorldClockId() {
        return 'wc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get city name for a timezone
     */
    getCityNameForTimezone(timezone) {
        const found = this.availableTimezones.find(tz => tz.timezone === timezone);
        return found ? found.cityName : timezone.split('/').pop().replace(/_/g, ' ');
    }

    /**
     * Search timezones by city name or timezone string
     */
    searchTimezones(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const lowerQuery = query.toLowerCase();
        
        return this.availableTimezones.filter(tz => 
            tz.cityName.toLowerCase().includes(lowerQuery) ||
            tz.timezone.toLowerCase().includes(lowerQuery) ||
            tz.region.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Clear all world clocks
     */
    clearAllWorldClocks() {
        try {
            this.worldClocks = [];
            this.settingsManager.clearWorldClocks();
            console.log('All world clocks cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear world clocks:', error);
            return false;
        }
    }

    /**
     * Reorder world clocks
     */
    reorderWorldClocks(newOrder) {
        try {
            // Validate new order array
            if (!Array.isArray(newOrder) || newOrder.length !== this.worldClocks.length) {
                console.error('Invalid reorder array');
                return false;
            }

            // Validate all IDs exist
            const currentIds = this.worldClocks.map(wc => wc.id);
            const newOrderIds = newOrder.map(wc => wc.id);
            
            if (!currentIds.every(id => newOrderIds.includes(id))) {
                console.error('Reorder array contains invalid IDs');
                return false;
            }

            // Update local array
            this.worldClocks = [...newOrder];

            // Update settings
            this.settingsManager.saveSetting('worldClocks', this.worldClocks);
            
            console.log('World clocks reordered');
            return true;

        } catch (error) {
            console.error('Failed to reorder world clocks:', error);
            return false;
        }
    }

    /**
     * Get world clock by ID
     */
    getWorldClockById(id) {
        return this.worldClocks.find(wc => wc.id === id);
    }

    /**
     * Update world clock city name
     */
    updateWorldClockCityName(id, newCityName) {
        try {
            const worldClock = this.worldClocks.find(wc => wc.id === id);
            
            if (!worldClock) {
                return false;
            }

            worldClock.cityName = newCityName;
            
            // Update in settings
            const success = this.settingsManager.updateWorldClock(id, { cityName: newCityName });
            
            if (success) {
                console.log('World clock city name updated:', id, newCityName);
                return true;
            } else {
                // Revert local change
                worldClock.cityName = this.getCityNameForTimezone(worldClock.timezone);
                return false;
            }

        } catch (error) {
            console.error('Failed to update world clock city name:', error);
            return false;
        }
    }

    /**
     * Check if timezone is already added
     */
    isTimezoneAdded(timezone) {
        return this.worldClocks.some(wc => wc.timezone === timezone);
    }

    /**
     * Get formatted time string for world clock
     */
    getFormattedTimeString(worldClock, use24HourFormat = false, showSeconds = true) {
        if (!worldClock.timeData || worldClock.timeData.isError) {
            return '--:--' + (showSeconds ? ':--' : '');
        }

        const { hours, hours12, minutes, seconds, ampm } = worldClock.timeData;
        
        const displayHours = use24HourFormat ? hours : hours12;
        const hoursStr = displayHours.toString().padStart(2, '0');
        const minutesStr = minutes.toString().padStart(2, '0');
        const secondsStr = seconds.toString().padStart(2, '0');
        
        let timeStr = `${hoursStr}:${minutesStr}`;
        
        if (showSeconds) {
            timeStr += `:${secondsStr}`;
        }
        
        if (!use24HourFormat) {
            timeStr += ` ${ampm}`;
        }
        
        return timeStr;
    }

    /**
     * Get formatted date string for world clock
     */
    getFormattedDateString(worldClock) {
        if (!worldClock.timeData || worldClock.timeData.isError) {
            return '--';
        }

        const { dayName, day, monthName, year, weekNumber } = worldClock.timeData.date;
        return `${dayName}, ${day} ${monthName}, ${year}, week ${weekNumber}`;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.worldClocks = [];
        this.isUpdating = false;
        
        console.log('WorldClockManager destroyed');
    }
}