/**
 * NTPService - Handles communication with time services and manages time synchronization
 * Note: Direct NTP protocol access isn't available in browsers, so we use HTTP-based time APIs
 */

export class NTPService {
    constructor() {
        // Get user's timezone
        this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Primary time API endpoint using user's timezone
        this.primaryEndpoint = `https://worldtimeapi.org/api/timezone/${this.userTimezone}`;
        
        // Fallback endpoints using user's timezone
        this.fallbackEndpoints = [
            `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(this.userTimezone)}`,
            // Keep UTC as final fallback
            'https://worldtimeapi.org/api/timezone/Etc/UTC'
        ];
        
        this.timeout = 5000; // 5 second timeout
        this.maxRetries = 3;
        
        // Synchronization properties
        this.timeOffset = 0; // Offset between NTP and local time in milliseconds
        this.lastSyncTime = null; // When we last successfully synced
        this.syncInterval = 15 * 60 * 1000; // Default 15 minutes
        this.syncTimer = null;
        this.isOnlineMode = true;
        
        // Event listeners for online/offline detection
        this.setupNetworkListeners();
    }

    /**
     * Fetch accurate time from NTP-like service
     */
    async fetchNTPTime() {
        let lastError = null;
        
        // Try primary endpoint first
        try {
            return await this.fetchTimeFromEndpoint(this.primaryEndpoint, 'worldtime');
        } catch (error) {
            lastError = error;
            console.warn('Primary time endpoint failed:', error.message);
        }
        
        // Try fallback endpoints
        for (const endpoint of this.fallbackEndpoints) {
            try {
                if (endpoint.includes('timeapi.io')) {
                    return await this.fetchTimeFromEndpoint(endpoint, 'timeapi');
                } else if (endpoint.includes('timezonedb.com')) {
                    return await this.fetchTimeFromEndpoint(endpoint, 'timezonedb');
                } else if (endpoint.includes('worldtimeapi.org')) {
                    return await this.fetchTimeFromEndpoint(endpoint, 'worldtime');
                }
            } catch (error) {
                lastError = error;
                console.warn(`Fallback endpoint ${endpoint} failed:`, error.message);
            }
        }
        
        // If all endpoints fail, throw the last error
        throw new Error(`All time endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Fetch time from a specific endpoint
     */
    async fetchTimeFromEndpoint(endpoint, type) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(endpoint, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return this.parseTimeResponse(data, type);
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    /**
     * Parse time response based on API type
     */
    parseTimeResponse(data, type) {
        let timeString = null;
        
        switch (type) {
            case 'worldtime':
                // Use local datetime if available, otherwise use UTC and convert
                timeString = data.datetime || data.utc_datetime;
                break;
                
            case 'timeapi':
                timeString = data.dateTime;
                break;
                
            case 'timezonedb':
                if (data.status === 'OK') {
                    // Convert Unix timestamp to JavaScript Date
                    return new Date(data.timestamp * 1000);
                }
                break;
                
            default:
                throw new Error(`Unknown API type: ${type}`);
        }
        
        if (!timeString) {
            throw new Error('Invalid time response format');
        }
        
        const parsedTime = new Date(timeString);
        
        if (isNaN(parsedTime.getTime())) {
            throw new Error('Invalid time format received');
        }
        
        return parsedTime;
    }

    /**
     * Calculate offset between NTP time and local time
     */
    calculateOffset(ntpTime, localTime) {
        if (!(ntpTime instanceof Date) || !(localTime instanceof Date)) {
            throw new Error('Invalid date objects provided for offset calculation');
        }
        
        return ntpTime.getTime() - localTime.getTime();
    }

    /**
     * Check if the browser is online
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Get accurate time using cached offset
     */
    getAccurateTime(cachedOffset = 0) {
        const localTime = new Date();
        return new Date(localTime.getTime() + cachedOffset);
    }

    /**
     * Validate time response for reasonableness
     */
    validateTimeResponse(time) {
        const now = new Date();
        const timeDiff = Math.abs(time.getTime() - now.getTime());
        
        // If time difference is more than 24 hours, consider it suspicious
        const maxDiff = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (timeDiff > maxDiff) {
            console.warn(`Suspicious time difference detected: ${timeDiff}ms`);
            return false;
        }
        
        return true;
    }

    /**
     * Test connectivity to time services
     */
    async testConnectivity() {
        try {
            await this.fetchNTPTime();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Setup network event listeners for online/offline detection
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.isOnlineMode = true;
            this.startPeriodicSync();
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.isOnlineMode = false;
            this.stopPeriodicSync();
        });
    }

    /**
     * Start periodic time synchronization
     */
    startPeriodicSync(intervalMinutes = 15) {
        this.syncInterval = intervalMinutes * 60 * 1000;
        
        // Clear any existing timer
        this.stopPeriodicSync();
        
        // Perform initial sync
        this.performSync();
        
        // Set up periodic sync
        this.syncTimer = setInterval(() => {
            this.performSync();
        }, this.syncInterval);
        
        console.log(`Started periodic NTP sync every ${intervalMinutes} minutes`);
    }

    /**
     * Stop periodic time synchronization
     */
    stopPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('Stopped periodic NTP sync');
        }
    }

    /**
     * Perform a single synchronization attempt
     */
    async performSync() {
        if (!this.isOnline()) {
            console.log('Skipping sync - offline mode');
            return false;
        }

        try {
            const localTimeBeforeRequest = new Date();
            const ntpTime = await this.fetchNTPTime();
            const localTimeAfterRequest = new Date();
            
            // Calculate network delay and adjust for it
            const networkDelay = (localTimeAfterRequest.getTime() - localTimeBeforeRequest.getTime()) / 2;
            const adjustedLocalTime = new Date(localTimeBeforeRequest.getTime() + networkDelay);
            
            // Calculate and store the offset
            this.timeOffset = this.calculateOffset(ntpTime, adjustedLocalTime);
            this.lastSyncTime = new Date();
            this.isOnlineMode = true;
            
            console.log(`NTP sync successful. Offset: ${this.timeOffset}ms`);
            return true;
            
        } catch (error) {
            console.warn('NTP sync failed:', error.message);
            
            // If this is the first sync failure, switch to offline mode
            if (this.isOnlineMode) {
                this.handleSyncFailure();
            }
            
            return false;
        }
    }

    /**
     * Handle synchronization failure
     */
    handleSyncFailure() {
        console.log('Switching to local time fallback mode');
        this.isOnlineMode = false;
        
        // Don't reset offset immediately - keep using last known good offset
        // Only reset if we've never successfully synced
        if (this.lastSyncTime === null) {
            this.timeOffset = 0;
        }
    }

    /**
     * Get current accurate time using stored offset
     */
    getCurrentTime() {
        const localTime = new Date();
        
        if (this.isOnlineMode || this.lastSyncTime !== null) {
            // Use NTP-adjusted time
            return new Date(localTime.getTime() + this.timeOffset);
        } else {
            // Fallback to local system time
            return localTime;
        }
    }

    /**
     * Get synchronization status information
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnlineMode,
            lastSyncTime: this.lastSyncTime,
            timeOffset: this.timeOffset,
            syncInterval: this.syncInterval,
            isUsingNTPTime: this.isOnlineMode || this.lastSyncTime !== null
        };
    }

    /**
     * Force a manual synchronization
     */
    async forcSync() {
        console.log('Forcing manual NTP synchronization...');
        return await this.performSync();
    }

    /**
     * Update sync interval
     */
    setSyncInterval(intervalMinutes) {
        if (intervalMinutes < 1) {
            throw new Error('Sync interval must be at least 1 minute');
        }
        
        this.syncInterval = intervalMinutes * 60 * 1000;
        
        // Restart periodic sync with new interval if it's currently running
        if (this.syncTimer) {
            this.startPeriodicSync(intervalMinutes);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        try {
            this.stopPeriodicSync();
            
            // Remove event listeners (note: these were added in setupNetworkListeners)
            // We need to store references to remove them properly
            console.log('NTPService destroyed');
            
        } catch (error) {
            console.error('Error destroying NTPService:', error);
        }
    }
}