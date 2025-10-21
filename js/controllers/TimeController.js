/**
 * TimeController - Main controller for time display and synchronization
 * Orchestrates time fetching, display updates, and coordinates between all modules
 */

export class TimeController {
    constructor(ntpService, uiController, settingsManager) {
        this.ntpService = ntpService;
        this.uiController = uiController;
        this.settingsManager = settingsManager;
        
        this.updateInterval = null;
        this.syncInterval = null;
        this.timeOffset = 0; // Offset between NTP and local time in milliseconds
        this.isNTPSynced = false;
        this.lastSyncTime = null;
        
        // Default sync interval: 15 minutes
        this.syncIntervalMinutes = 15;
    }

    /**
     * Initialize the time controller
     */
    async initialize() {
        try {
            // Load sync interval from settings
            this.syncIntervalMinutes = this.settingsManager.getSetting('ntpSyncInterval', 15);
            
            // Attempt initial NTP synchronization
            await this.syncWithNTP();
            
            // Start regular time updates
            this.startTimeUpdates();
            
            // Set up periodic NTP synchronization
            this.startPeriodicSync();
            
            console.log('TimeController initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize TimeController:', error);
            // Fall back to local time
            this.handleOfflineMode();
            this.startTimeUpdates();
        }
    }

    /**
     * Start regular time display updates
     */
    startTimeUpdates() {
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update immediately
        this.updateTimeDisplay();
        
        // Set up interval for updates every second
        this.updateInterval = setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
    }

    /**
     * Stop time updates
     */
    stopTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update the time display
     */
    updateTimeDisplay() {
        const currentTime = this.getCurrentTime();
        const timeData = this.formatTime(currentTime);
        const dateData = this.formatDate(currentTime);
        
        // Update UI with formatted time and date
        this.uiController.updateTimeDisplay(timeData);
        this.uiController.updateDateDisplay(dateData);
        
        // Update connection status
        this.uiController.showConnectionStatus(this.isNTPSynced);
    }

    /**
     * Get current accurate time (NTP synced or local)
     */
    getCurrentTime() {
        const localTime = new Date();
        
        if (this.isNTPSynced && this.timeOffset !== null) {
            // Apply NTP offset to get accurate local time
            return new Date(localTime.getTime() + this.timeOffset);
        }
        
        return localTime;
    }

    /**
     * Format time according to user preferences
     */
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
        
        // Format with leading zeros
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

    /**
     * Format time for 12-hour display
     */
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

    /**
     * Format time for 24-hour display
     */
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

    /**
     * Toggle seconds visibility in time display
     */
    toggleSecondsDisplay() {
        const currentSetting = this.settingsManager.getSetting('showSeconds', true);
        const newSetting = !currentSetting;
        this.settingsManager.saveSetting('showSeconds', newSetting);
        
        // Immediately update display with new setting
        this.updateTimeDisplay();
        
        return newSetting;
    }

    /**
     * Toggle between 12-hour and 24-hour format
     */
    toggleTimeFormat() {
        const currentSetting = this.settingsManager.getSetting('use24HourFormat', false);
        const newSetting = !currentSetting;
        this.settingsManager.saveSetting('use24HourFormat', newSetting);
        
        // Immediately update display with new setting
        this.updateTimeDisplay();
        
        return newSetting;
    }

    /**
     * Format date in "Tuesday, 14 October, 2025, week 42" format
     */
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

    /**
     * Calculate week number for a given date
     */
    getWeekNumber(date) {
        // Create a copy of the date to avoid modifying the original
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        
        // Calculate full weeks to nearest Thursday
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Get date calculation methods including week number
     */
    getDateCalculations(date) {
        const weekNumber = this.getWeekNumber(date);
        const dayOfYear = this.getDayOfYear(date);
        const isLeapYear = this.isLeapYear(date.getFullYear());
        
        return {
            weekNumber,
            dayOfYear,
            isLeapYear,
            daysInMonth: this.getDaysInMonth(date),
            daysInYear: isLeapYear ? 366 : 365
        };
    }

    /**
     * Get day of year (1-366)
     */
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    /**
     * Check if year is leap year
     */
    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    /**
     * Get number of days in month
     */
    getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    /**
     * Update date display with automatic midnight updates
     */
    updateDateDisplay() {
        const currentTime = this.getCurrentTime();
        const dateData = this.formatDate(currentTime);
        
        // Update UI with formatted date
        this.uiController.updateDateDisplay(dateData);
        
        // Schedule next update at midnight
        this.scheduleNextMidnightUpdate();
    }

    /**
     * Schedule automatic date update at midnight
     */
    scheduleNextMidnightUpdate() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        // Clear any existing midnight timeout
        if (this.midnightTimeout) {
            clearTimeout(this.midnightTimeout);
        }
        
        // Set timeout for midnight update
        this.midnightTimeout = setTimeout(() => {
            this.updateDateDisplay();
        }, msUntilMidnight);
    }

    /**
     * Synchronize with NTP service
     */
    async syncWithNTP() {
        try {
            const ntpTime = await this.ntpService.fetchNTPTime();
            const localTime = new Date();
            
            // Calculate offset between NTP and local time
            this.timeOffset = this.ntpService.calculateOffset(ntpTime, localTime);
            this.isNTPSynced = true;
            this.lastSyncTime = new Date();
            
            console.log(`NTP sync successful. Offset: ${this.timeOffset}ms`);
            
        } catch (error) {
            console.error('NTP synchronization failed:', error);
            this.handleOfflineMode();
            throw error;
        }
    }

    /**
     * Handle offline mode (fallback to local time)
     */
    handleOfflineMode() {
        this.isNTPSynced = false;
        this.timeOffset = 0;
        console.log('Switched to local time mode');
    }

    /**
     * Start periodic NTP synchronization
     */
    startPeriodicSync() {
        // Clear any existing sync interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Set up periodic sync
        const intervalMs = this.syncIntervalMinutes * 60 * 1000;
        this.syncInterval = setInterval(async () => {
            try {
                await this.syncWithNTP();
            } catch (error) {
                // Sync failed, but continue with local time
                console.warn('Periodic NTP sync failed, continuing with local time');
            }
        }, intervalMs);
    }

    /**
     * Stop periodic synchronization
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Update sync interval from settings
     */
    updateSyncInterval(minutes) {
        this.syncIntervalMinutes = minutes;
        this.settingsManager.saveSetting('ntpSyncInterval', minutes);
        
        // Restart periodic sync with new interval
        this.startPeriodicSync();
    }

    /**
     * Manually trigger NTP synchronization
     */
    async forceSyncNTP() {
        try {
            await this.syncWithNTP();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopTimeUpdates();
        this.stopPeriodicSync();
        
        // Clear midnight timeout
        if (this.midnightTimeout) {
            clearTimeout(this.midnightTimeout);
            this.midnightTimeout = null;
        }
        
        console.log('TimeController destroyed');
    }
}