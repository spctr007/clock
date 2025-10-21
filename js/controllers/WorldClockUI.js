/**
 * WorldClockUI - Handles world clock display components and UI updates
 */

export class WorldClockUI {
    constructor(worldClockManager, settingsManager) {
        this.worldClockManager = worldClockManager;
        this.settingsManager = settingsManager;
        
        // DOM elements
        this.worldClocksSection = null;
        this.worldClocksContainer = null;
        this.worldClockList = null;
        this.timezoneSelect = null;
        this.addWorldClockBtn = null;
        this.showWorldClocksCheckbox = null;
        
        // Update tracking
        this.displayElements = new Map(); // Map of worldClockId -> DOM elements
        this.isUpdating = false;
        
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.worldClocksSection = document.getElementById('worldClocksSection');
        this.worldClocksContainer = document.getElementById('worldClocksContainer');
        this.worldClockList = document.getElementById('worldClockList');
        this.timezoneSelect = document.getElementById('timezoneSelect');
        this.addWorldClockBtn = document.getElementById('addWorldClockBtn');
        this.showWorldClocksCheckbox = document.getElementById('showWorldClocks');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // World clock settings
        if (this.showWorldClocksCheckbox) {
            this.showWorldClocksCheckbox.addEventListener('change', (e) => {
                this.settingsManager.saveSetting('showWorldClocks', e.target.checked);
                this.updateWorldClockVisibility();
            });
        }

        if (this.timezoneSelect) {
            this.timezoneSelect.addEventListener('change', (e) => {
                if (this.addWorldClockBtn) {
                    this.addWorldClockBtn.disabled = !e.target.value;
                }
            });
        }

        if (this.addWorldClockBtn) {
            this.addWorldClockBtn.addEventListener('click', () => {
                this.handleAddWorldClock();
            });
        }
    }

    /**
     * Initialize the world clock UI
     */
    async initialize() {
        try {
            // Populate timezone options
            this.populateTimezoneOptions();
            
            // Load initial settings
            this.loadInitialSettings();
            
            // Update displays
            this.updateWorldClockList();
            this.updateWorldClockDisplays();
            
            console.log('WorldClockUI initialized');
            
        } catch (error) {
            console.error('Failed to initialize WorldClockUI:', error);
        }
    }

    /**
     * Populate timezone select options
     */
    populateTimezoneOptions() {
        if (!this.timezoneSelect) return;

        const timezones = this.worldClockManager.getAvailableTimezones();
        const grouped = this.worldClockManager.getTimezonesByRegion();
        
        // Clear existing options
        this.timezoneSelect.innerHTML = '<option value="">Select a timezone...</option>';

        // Add options grouped by region
        Object.keys(grouped).sort().forEach(region => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = region;
            
            grouped[region].forEach(tz => {
                const option = document.createElement('option');
                option.value = tz.timezone;
                option.textContent = tz.cityName;
                optgroup.appendChild(option);
            });
            
            this.timezoneSelect.appendChild(optgroup);
        });
    }

    /**
     * Load initial settings
     */
    loadInitialSettings() {
        const showWorldClocks = this.settingsManager.getSetting('showWorldClocks', false);
        
        if (this.showWorldClocksCheckbox) {
            this.showWorldClocksCheckbox.checked = showWorldClocks;
        }
        
        this.updateWorldClockVisibility();
    }

    /**
     * Handle adding a new world clock
     */
    async handleAddWorldClock() {
        try {
            const selectedTimezone = this.timezoneSelect.value;
            if (!selectedTimezone) return;

            // Check if we can add more world clocks
            const currentClocks = this.worldClockManager.getWorldClocks();
            if (currentClocks.length >= 3) {
                this.showError('Maximum of 3 world clocks allowed');
                return;
            }

            // Check if timezone already exists
            if (this.worldClockManager.isTimezoneAdded(selectedTimezone)) {
                this.showError('This timezone is already added');
                return;
            }

            // Get city name for the timezone
            const cityName = this.worldClockManager.getCityNameForTimezone(selectedTimezone);

            // Add the world clock
            const worldClock = this.worldClockManager.addWorldClock(selectedTimezone, cityName);
            
            if (worldClock) {
                // Update UI
                this.updateWorldClockList();
                this.updateWorldClockDisplays();
                
                // Reset form
                this.timezoneSelect.value = '';
                this.addWorldClockBtn.disabled = true;
                
                console.log('World clock added:', worldClock.cityName);
            } else {
                this.showError('Failed to add world clock');
            }

        } catch (error) {
            console.error('Failed to add world clock:', error);
            this.showError('Failed to add world clock');
        }
    }

    /**
     * Update world clock list in settings
     */
    updateWorldClockList() {
        if (!this.worldClockList) return;

        const worldClocks = this.worldClockManager.getWorldClocks();
        this.worldClockList.innerHTML = '';

        worldClocks.forEach(worldClock => {
            const item = this.createWorldClockListItem(worldClock);
            this.worldClockList.appendChild(item);
        });

        // Update add button state
        this.updateAddButtonState();
    }

    /**
     * Create a world clock list item for settings
     */
    createWorldClockListItem(worldClock) {
        const item = document.createElement('div');
        item.className = 'world-clock-item';
        item.innerHTML = `
            <div class="world-clock-info">
                <div class="world-clock-city">${worldClock.cityName}</div>
                <div class="world-clock-timezone">${worldClock.timezone}</div>
            </div>
            <div class="world-clock-controls">
                <button class="world-clock-toggle ${worldClock.isEnabled ? 'enabled' : ''}" 
                        data-id="${worldClock.id}" 
                        aria-label="Toggle ${worldClock.cityName} world clock">
                </button>
                <button class="world-clock-remove" 
                        data-id="${worldClock.id}"
                        aria-label="Remove ${worldClock.cityName} world clock">
                    ×
                </button>
            </div>
        `;

        // Add event listeners
        const toggleBtn = item.querySelector('.world-clock-toggle');
        const removeBtn = item.querySelector('.world-clock-remove');

        toggleBtn.addEventListener('click', () => {
            this.handleToggleWorldClock(worldClock.id);
        });

        removeBtn.addEventListener('click', () => {
            this.handleRemoveWorldClock(worldClock.id);
        });

        return item;
    }

    /**
     * Handle toggling world clock enabled state
     */
    handleToggleWorldClock(worldClockId) {
        try {
            if (this.worldClockManager.toggleWorldClock(worldClockId)) {
                this.updateWorldClockList();
                this.updateWorldClockDisplays();
                console.log('World clock toggled:', worldClockId);
            }
        } catch (error) {
            console.error('Failed to toggle world clock:', error);
            this.showError('Failed to toggle world clock');
        }
    }

    /**
     * Handle removing a world clock
     */
    handleRemoveWorldClock(worldClockId) {
        try {
            if (this.worldClockManager.removeWorldClock(worldClockId)) {
                this.updateWorldClockList();
                this.updateWorldClockDisplays();
                this.updateAddButtonState();
                console.log('World clock removed:', worldClockId);
            }
        } catch (error) {
            console.error('Failed to remove world clock:', error);
            this.showError('Failed to remove world clock');
        }
    }

    /**
     * Update world clock displays in main view
     */
    updateWorldClockDisplays() {
        if (!this.worldClocksContainer || !this.worldClocksSection) return;

        const showWorldClocks = this.settingsManager.getSetting('showWorldClocks', false);
        const enabledWorldClocks = this.worldClockManager.getEnabledWorldClocks();

        // Show/hide the world clocks section
        if (showWorldClocks && enabledWorldClocks.length > 0) {
            this.worldClocksSection.hidden = false;
            this.renderWorldClockDisplays(enabledWorldClocks);
        } else {
            this.worldClocksSection.hidden = true;
            this.clearWorldClockDisplays();
        }
    }

    /**
     * Render world clock displays
     */
    renderWorldClockDisplays(worldClocks) {
        // Clear existing displays
        this.clearWorldClockDisplays();

        // Create displays for each enabled world clock
        worldClocks.forEach(worldClock => {
            const display = this.createWorldClockDisplay(worldClock);
            this.worldClocksContainer.appendChild(display);
            
            // Store reference for updates
            this.displayElements.set(worldClock.id, {
                container: display,
                timeElement: display.querySelector('.world-clock-time'),
                dateElement: display.querySelector('.world-clock-date')
            });
        });
    }

    /**
     * Create a world clock display element
     */
    createWorldClockDisplay(worldClock) {
        const display = document.createElement('div');
        display.className = 'world-clock-display';
        display.setAttribute('data-timezone', worldClock.timezone);
        display.setAttribute('data-id', worldClock.id);
        
        display.innerHTML = `
            <div class="world-clock-city-name">${worldClock.cityName}</div>
            <div class="world-clock-time">--:--</div>
            <div class="world-clock-date">Loading...</div>
        `;

        return display;
    }

    /**
     * Update all world clock times simultaneously
     */
    updateAllWorldClocks() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;

        try {
            // Update time data in the manager
            this.worldClockManager.updateAllWorldClocks();
            
            // Update UI displays
            const enabledWorldClocks = this.worldClockManager.getEnabledWorldClocks();
            const use24HourFormat = this.settingsManager.getSetting('use24HourFormat', false);
            const showSeconds = this.settingsManager.getSetting('showSeconds', true);

            enabledWorldClocks.forEach(worldClock => {
                this.updateWorldClockDisplay(worldClock, use24HourFormat, showSeconds);
            });

        } catch (error) {
            console.error('Failed to update world clocks:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Update a specific world clock display
     */
    updateWorldClockDisplay(worldClock, use24HourFormat = false, showSeconds = true) {
        const elements = this.displayElements.get(worldClock.id);
        if (!elements || !worldClock.timeData) return;

        try {
            // Format time string
            const timeString = this.worldClockManager.getFormattedTimeString(
                worldClock, 
                use24HourFormat, 
                showSeconds
            );

            // Format date string
            const dateString = this.worldClockManager.getFormattedDateString(worldClock);

            // Update DOM elements with smooth transitions
            if (elements.timeElement.textContent !== timeString) {
                this.updateElementWithTransition(elements.timeElement, timeString);
            }

            if (elements.dateElement.textContent !== dateString) {
                this.updateElementWithTransition(elements.dateElement, dateString);
            }

            // Handle error state
            if (worldClock.timeData.isError) {
                elements.container.classList.add('error');
                elements.timeElement.textContent = '--:--';
                elements.dateElement.textContent = 'Error loading time';
            } else {
                elements.container.classList.remove('error');
            }

        } catch (error) {
            console.error('Failed to update world clock display:', worldClock.cityName, error);
        }
    }

    /**
     * Update element with smooth transition
     */
    updateElementWithTransition(element, newText) {
        element.style.opacity = '0.7';
        
        requestAnimationFrame(() => {
            element.textContent = newText;
            element.style.opacity = '1';
        });
    }

    /**
     * Clear all world clock displays
     */
    clearWorldClockDisplays() {
        if (this.worldClocksContainer) {
            this.worldClocksContainer.innerHTML = '';
        }
        this.displayElements.clear();
    }

    /**
     * Update world clock visibility
     */
    updateWorldClockVisibility() {
        const showWorldClocks = this.settingsManager.getSetting('showWorldClocks', false);
        
        if (showWorldClocks) {
            this.updateWorldClockDisplays();
        } else {
            if (this.worldClocksSection) {
                this.worldClocksSection.hidden = true;
            }
            this.clearWorldClockDisplays();
        }
    }

    /**
     * Update add button state
     */
    updateAddButtonState() {
        if (!this.addWorldClockBtn || !this.timezoneSelect) return;

        const worldClocks = this.worldClockManager.getWorldClocks();
        const canAddMore = worldClocks.length < 3;
        
        if (!canAddMore) {
            this.addWorldClockBtn.disabled = true;
            this.timezoneSelect.disabled = true;
        } else {
            this.timezoneSelect.disabled = false;
            this.addWorldClockBtn.disabled = !this.timezoneSelect.value;
        }
    }

    /**
     * Search and filter timezones
     */
    searchTimezones(query) {
        const results = this.worldClockManager.searchTimezones(query);
        this.updateTimezoneOptions(results);
        return results;
    }

    /**
     * Update timezone options with search results
     */
    updateTimezoneOptions(timezones) {
        if (!this.timezoneSelect) return;

        // Clear existing options
        this.timezoneSelect.innerHTML = '<option value="">Select a timezone...</option>';

        // Group by region
        const grouped = {};
        timezones.forEach(tz => {
            if (!grouped[tz.region]) {
                grouped[tz.region] = [];
            }
            grouped[tz.region].push(tz);
        });

        // Add options grouped by region
        Object.keys(grouped).sort().forEach(region => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = region;
            
            grouped[region].forEach(tz => {
                const option = document.createElement('option');
                option.value = tz.timezone;
                option.textContent = tz.cityName;
                optgroup.appendChild(option);
            });
            
            this.timezoneSelect.appendChild(optgroup);
        });
    }

    /**
     * Get world clock display data for external use
     */
    getWorldClockDisplayData() {
        const enabledWorldClocks = this.worldClockManager.getEnabledWorldClocks();
        const use24HourFormat = this.settingsManager.getSetting('use24HourFormat', false);
        const showSeconds = this.settingsManager.getSetting('showSeconds', true);

        return enabledWorldClocks.map(worldClock => ({
            id: worldClock.id,
            cityName: worldClock.cityName,
            timezone: worldClock.timezone,
            timeString: this.worldClockManager.getFormattedTimeString(
                worldClock, 
                use24HourFormat, 
                showSeconds
            ),
            dateString: this.worldClockManager.getFormattedDateString(worldClock),
            isError: worldClock.timeData?.isError || false
        }));
    }

    /**
     * Handle settings changes
     */
    onSettingsChange(changedSettings) {
        if (changedSettings.showWorldClocks !== undefined) {
            this.updateWorldClockVisibility();
        }

        if (changedSettings.use24HourFormat !== undefined || 
            changedSettings.showSeconds !== undefined) {
            // Update time format for all displays
            this.updateAllWorldClocks();
        }
    }

    /**
     * Show error message (placeholder - should be implemented by parent)
     */
    showError(message) {
        console.error('WorldClockUI Error:', message);
        
        // Try to find error display element
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.hidden = false;
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorMessage.hidden = true;
            }, 5000);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearWorldClockDisplays();
        this.isUpdating = false;
        console.log('WorldClockUI destroyed');
    }
}