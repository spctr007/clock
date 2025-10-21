/**
 * TimezoneSelector - Enhanced timezone selection and management interface
 */

export class TimezoneSelector {
    constructor(worldClockManager, settingsManager) {
        this.worldClockManager = worldClockManager;
        this.settingsManager = settingsManager;
        
        // DOM elements
        this.timezoneSelect = null;
        this.addWorldClockBtn = null;
        this.worldClockList = null;
        this.searchInput = null;
        
        // State
        this.filteredTimezones = [];
        this.draggedElement = null;
        this.isDragging = false;
        
        this.initializeElements();
        this.enhanceInterface();
        this.bindEvents();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.timezoneSelect = document.getElementById('timezoneSelect');
        this.addWorldClockBtn = document.getElementById('addWorldClockBtn');
        this.worldClockList = document.getElementById('worldClockList');
    }

    /**
     * Enhance the interface with additional functionality
     */
    enhanceInterface() {
        this.createSearchInterface();
        this.populateTimezoneOptions();
        this.enableDragAndDrop();
    }

    /**
     * Create search interface for timezones
     */
    createSearchInterface() {
        if (!this.timezoneSelect || !this.timezoneSelect.parentNode) return;

        // Create search input container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'timezone-search-container';
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'timezoneSearch';
        searchInput.className = 'timezone-search';
        searchInput.placeholder = 'Search cities or timezones...';
        searchInput.setAttribute('aria-label', 'Search timezones');
        
        // Create search results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'timezone-results';
        resultsContainer.id = 'timezoneResults';
        resultsContainer.hidden = true;
        
        // Insert search interface before the select element
        const selectContainer = this.timezoneSelect.parentNode;
        selectContainer.insertBefore(searchContainer, this.timezoneSelect);
        searchContainer.appendChild(searchInput);
        selectContainer.insertBefore(resultsContainer, this.timezoneSelect.nextSibling);
        
        this.searchInput = searchInput;
        this.resultsContainer = resultsContainer;
        
        // Hide the original select when search is active
        this.setupSearchToggle();
    }

    /**
     * Setup search toggle functionality
     */
    setupSearchToggle() {
        if (!this.searchInput || !this.timezoneSelect) return;

        // Initially hide select and show search
        this.timezoneSelect.style.display = 'none';
        
        // Add toggle button
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'timezone-toggle-btn';
        toggleButton.textContent = 'Browse All';
        toggleButton.setAttribute('aria-label', 'Toggle between search and browse modes');
        
        this.searchInput.parentNode.appendChild(toggleButton);
        
        toggleButton.addEventListener('click', () => {
            this.toggleSearchMode();
        });
    }

    /**
     * Toggle between search and browse modes
     */
    toggleSearchMode() {
        const isSearchMode = this.timezoneSelect.style.display === 'none';
        
        if (isSearchMode) {
            // Switch to browse mode
            this.timezoneSelect.style.display = 'block';
            this.searchInput.style.display = 'none';
            this.resultsContainer.hidden = true;
            this.searchInput.parentNode.querySelector('.timezone-toggle-btn').textContent = 'Search';
        } else {
            // Switch to search mode
            this.timezoneSelect.style.display = 'none';
            this.searchInput.style.display = 'block';
            this.searchInput.parentNode.querySelector('.timezone-toggle-btn').textContent = 'Browse All';
            this.searchInput.focus();
        }
    }

    /**
     * Populate timezone options with enhanced organization
     */
    populateTimezoneOptions() {
        if (!this.timezoneSelect) return;

        const timezonesByRegion = this.worldClockManager.getTimezonesByRegion();
        
        // Clear existing options
        this.timezoneSelect.innerHTML = '<option value="">Select a timezone...</option>';

        // Add popular timezones first
        const popularGroup = document.createElement('optgroup');
        popularGroup.label = 'Popular Timezones';
        
        const popularTimezones = [
            'America/New_York',
            'America/Los_Angeles', 
            'Europe/London',
            'Europe/Paris',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Australia/Sydney'
        ];

        const allTimezones = this.worldClockManager.getAvailableTimezones();
        
        popularTimezones.forEach(tzId => {
            const tz = allTimezones.find(t => t.timezone === tzId);
            if (tz) {
                const option = document.createElement('option');
                option.value = tz.timezone;
                option.textContent = `${tz.cityName} (${tz.region})`;
                popularGroup.appendChild(option);
            }
        });
        
        this.timezoneSelect.appendChild(popularGroup);

        // Add separator
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────────────';
        this.timezoneSelect.appendChild(separator);

        // Add all timezones grouped by region
        Object.keys(timezonesByRegion).sort().forEach(region => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = region;
            
            timezonesByRegion[region]
                .sort((a, b) => a.cityName.localeCompare(b.cityName))
                .forEach(tz => {
                    const option = document.createElement('option');
                    option.value = tz.timezone;
                    option.textContent = tz.cityName;
                    optgroup.appendChild(option);
                });
            
            this.timezoneSelect.appendChild(optgroup);
        });
    }

    /**
     * Enable drag and drop functionality for world clock reordering
     */
    enableDragAndDrop() {
        if (!this.worldClockList) return;

        // Make the list sortable
        this.worldClockList.addEventListener('dragover', this.handleDragOver.bind(this));
        this.worldClockList.addEventListener('drop', this.handleDrop.bind(this));
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.handleSearch.bind(this));
            this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
            this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
            this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        }

        // Timezone selection
        if (this.timezoneSelect) {
            this.timezoneSelect.addEventListener('change', this.handleTimezoneSelect.bind(this));
        }

        // Add world clock button
        if (this.addWorldClockBtn) {
            this.addWorldClockBtn.addEventListener('click', this.handleAddWorldClock.bind(this));
        }

        // Click outside to close search results
        document.addEventListener('click', (e) => {
            if (this.resultsContainer && 
                !this.searchInput.contains(e.target) && 
                !this.resultsContainer.contains(e.target)) {
                this.hideSearchResults();
            }
        });
    }

    /**
     * Handle search input
     */
    handleSearch(event) {
        const query = event.target.value.trim();
        
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }

        const results = this.worldClockManager.searchTimezones(query);
        this.displaySearchResults(results);
    }

    /**
     * Handle search focus
     */
    handleSearchFocus() {
        if (this.searchInput.value.length >= 2) {
            const results = this.worldClockManager.searchTimezones(this.searchInput.value);
            this.displaySearchResults(results);
        }
    }

    /**
     * Handle search blur (with delay to allow clicks)
     */
    handleSearchBlur() {
        setTimeout(() => {
            this.hideSearchResults();
        }, 200);
    }

    /**
     * Handle search keyboard navigation
     */
    handleSearchKeydown(event) {
        if (!this.resultsContainer || this.resultsContainer.hidden) return;

        const results = this.resultsContainer.querySelectorAll('.timezone-result-item');
        const currentFocus = this.resultsContainer.querySelector('.timezone-result-item.focused');
        let focusIndex = currentFocus ? Array.from(results).indexOf(currentFocus) : -1;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                focusIndex = Math.min(focusIndex + 1, results.length - 1);
                this.focusSearchResult(results, focusIndex);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                focusIndex = Math.max(focusIndex - 1, 0);
                this.focusSearchResult(results, focusIndex);
                break;
                
            case 'Enter':
                event.preventDefault();
                if (currentFocus) {
                    const timezone = currentFocus.dataset.timezone;
                    const cityName = currentFocus.dataset.cityName;
                    this.selectTimezone(timezone, cityName);
                }
                break;
                
            case 'Escape':
                this.hideSearchResults();
                this.searchInput.blur();
                break;
        }
    }

    /**
     * Focus a search result item
     */
    focusSearchResult(results, index) {
        // Remove previous focus
        results.forEach(item => item.classList.remove('focused'));
        
        // Add focus to current item
        if (results[index]) {
            results[index].classList.add('focused');
            results[index].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        if (!this.resultsContainer) return;

        this.resultsContainer.innerHTML = '';

        if (results.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'timezone-no-results';
            noResults.textContent = 'No timezones found';
            this.resultsContainer.appendChild(noResults);
        } else {
            results.slice(0, 10).forEach(tz => { // Limit to 10 results
                const item = this.createSearchResultItem(tz);
                this.resultsContainer.appendChild(item);
            });
        }

        this.resultsContainer.hidden = false;
    }

    /**
     * Create a search result item
     */
    createSearchResultItem(timezone) {
        const item = document.createElement('div');
        item.className = 'timezone-result-item';
        item.dataset.timezone = timezone.timezone;
        item.dataset.cityName = timezone.cityName;
        
        // Check if already added
        const isAdded = this.worldClockManager.isTimezoneAdded(timezone.timezone);
        
        item.innerHTML = `
            <div class="timezone-result-info">
                <div class="timezone-result-city">${timezone.cityName}</div>
                <div class="timezone-result-region">${timezone.region}</div>
                <div class="timezone-result-tz">${timezone.timezone}</div>
            </div>
            <div class="timezone-result-status">
                ${isAdded ? '<span class="added-indicator">Added</span>' : ''}
            </div>
        `;

        if (!isAdded) {
            item.addEventListener('click', () => {
                this.selectTimezone(timezone.timezone, timezone.cityName);
            });
            item.classList.add('selectable');
        } else {
            item.classList.add('disabled');
        }

        return item;
    }

    /**
     * Select a timezone from search results
     */
    selectTimezone(timezone, cityName) {
        this.hideSearchResults();
        this.searchInput.value = '';
        
        // Add the world clock directly
        this.addWorldClockByTimezone(timezone, cityName);
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        if (this.resultsContainer) {
            this.resultsContainer.hidden = true;
        }
    }

    /**
     * Handle timezone select change
     */
    handleTimezoneSelect(event) {
        const hasSelection = !!event.target.value;
        if (this.addWorldClockBtn) {
            this.addWorldClockBtn.disabled = !hasSelection;
        }
    }

    /**
     * Handle add world clock button click
     */
    handleAddWorldClock() {
        const selectedTimezone = this.timezoneSelect.value;
        if (!selectedTimezone) return;

        const cityName = this.worldClockManager.getCityNameForTimezone(selectedTimezone);
        this.addWorldClockByTimezone(selectedTimezone, cityName);
        
        // Reset selection
        this.timezoneSelect.value = '';
        this.addWorldClockBtn.disabled = true;
    }

    /**
     * Add world clock by timezone
     */
    addWorldClockByTimezone(timezone, cityName) {
        try {
            // Check constraints
            const currentClocks = this.worldClockManager.getWorldClocks();
            if (currentClocks.length >= 3) {
                this.showError('Maximum of 3 world clocks allowed');
                return false;
            }

            if (this.worldClockManager.isTimezoneAdded(timezone)) {
                this.showError('This timezone is already added');
                return false;
            }

            // Add the world clock
            const worldClock = this.worldClockManager.addWorldClock(timezone, cityName);
            
            if (worldClock) {
                console.log('World clock added via selector:', worldClock.cityName);
                
                // Trigger update event
                this.dispatchUpdateEvent();
                return true;
            } else {
                this.showError('Failed to add world clock');
                return false;
            }

        } catch (error) {
            console.error('Failed to add world clock:', error);
            this.showError('Failed to add world clock');
            return false;
        }
    }

    /**
     * Update world clock list with drag and drop support
     */
    updateWorldClockList() {
        if (!this.worldClockList) return;

        const worldClocks = this.worldClockManager.getWorldClocks();
        this.worldClockList.innerHTML = '';

        worldClocks.forEach((worldClock, index) => {
            const item = this.createDraggableWorldClockItem(worldClock, index);
            this.worldClockList.appendChild(item);
        });

        this.updateAddButtonState();
    }

    /**
     * Create a draggable world clock item
     */
    createDraggableWorldClockItem(worldClock, index) {
        const item = document.createElement('div');
        item.className = 'world-clock-item draggable';
        item.draggable = true;
        item.dataset.id = worldClock.id;
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="drag-handle" aria-label="Drag to reorder">⋮⋮</div>
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

        // Add drag event listeners
        item.addEventListener('dragstart', this.handleDragStart.bind(this));
        item.addEventListener('dragend', this.handleDragEnd.bind(this));

        // Add control event listeners
        const toggleBtn = item.querySelector('.world-clock-toggle');
        const removeBtn = item.querySelector('.world-clock-remove');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleToggleWorldClock(worldClock.id);
        });

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleRemoveWorldClock(worldClock.id);
        });

        return item;
    }

    /**
     * Handle drag start
     */
    handleDragStart(event) {
        this.draggedElement = event.target;
        this.isDragging = true;
        
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.outerHTML);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        this.draggedElement = null;
        this.isDragging = false;
        
        // Remove drag indicators
        const items = this.worldClockList.querySelectorAll('.world-clock-item');
        items.forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    }

    /**
     * Handle drag over
     */
    handleDragOver(event) {
        if (!this.isDragging) return;
        
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const afterElement = this.getDragAfterElement(event.clientY);
        const draggedItem = this.draggedElement;
        
        // Remove previous indicators
        const items = this.worldClockList.querySelectorAll('.world-clock-item');
        items.forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        // Add indicator
        if (afterElement == null) {
            // Insert at the end
            const lastItem = this.worldClockList.lastElementChild;
            if (lastItem && lastItem !== draggedItem) {
                lastItem.classList.add('drag-over-bottom');
            }
        } else if (afterElement !== draggedItem) {
            afterElement.classList.add('drag-over-top');
        }
    }

    /**
     * Handle drop
     */
    handleDrop(event) {
        if (!this.isDragging) return;
        
        event.preventDefault();
        
        const afterElement = this.getDragAfterElement(event.clientY);
        const draggedItem = this.draggedElement;
        
        if (afterElement == null) {
            this.worldClockList.appendChild(draggedItem);
        } else {
            this.worldClockList.insertBefore(draggedItem, afterElement);
        }
        
        // Update the order in the manager
        this.updateWorldClockOrder();
    }

    /**
     * Get the element after which to insert the dragged item
     */
    getDragAfterElement(y) {
        const draggableElements = [...this.worldClockList.querySelectorAll('.world-clock-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Update world clock order after drag and drop
     */
    updateWorldClockOrder() {
        const items = this.worldClockList.querySelectorAll('.world-clock-item');
        const newOrder = [];
        
        items.forEach(item => {
            const id = item.dataset.id;
            const worldClock = this.worldClockManager.getWorldClockById(id);
            if (worldClock) {
                newOrder.push(worldClock);
            }
        });
        
        // Update the order in the manager
        if (this.worldClockManager.reorderWorldClocks(newOrder)) {
            console.log('World clocks reordered');
            this.dispatchUpdateEvent();
        }
    }

    /**
     * Handle toggle world clock
     */
    handleToggleWorldClock(worldClockId) {
        if (this.worldClockManager.toggleWorldClock(worldClockId)) {
            this.updateWorldClockList();
            this.dispatchUpdateEvent();
        }
    }

    /**
     * Handle remove world clock
     */
    handleRemoveWorldClock(worldClockId) {
        if (this.worldClockManager.removeWorldClock(worldClockId)) {
            this.updateWorldClockList();
            this.dispatchUpdateEvent();
        }
    }

    /**
     * Update add button state
     */
    updateAddButtonState() {
        if (!this.addWorldClockBtn) return;

        const worldClocks = this.worldClockManager.getWorldClocks();
        const canAddMore = worldClocks.length < 3;
        
        if (!canAddMore) {
            this.addWorldClockBtn.disabled = true;
            if (this.timezoneSelect) {
                this.timezoneSelect.disabled = true;
            }
            if (this.searchInput) {
                this.searchInput.disabled = true;
                this.searchInput.placeholder = 'Maximum 3 world clocks reached';
            }
        } else {
            if (this.timezoneSelect) {
                this.timezoneSelect.disabled = false;
                this.addWorldClockBtn.disabled = !this.timezoneSelect.value;
            }
            if (this.searchInput) {
                this.searchInput.disabled = false;
                this.searchInput.placeholder = 'Search cities or timezones...';
            }
        }
    }

    /**
     * Dispatch update event
     */
    dispatchUpdateEvent() {
        const event = new CustomEvent('worldClockUpdate', {
            detail: {
                worldClocks: this.worldClockManager.getWorldClocks(),
                enabledWorldClocks: this.worldClockManager.getEnabledWorldClocks()
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('TimezoneSelector Error:', message);
        
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
     * Initialize the timezone selector
     */
    initialize() {
        this.updateWorldClockList();
        console.log('TimezoneSelector initialized');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.hideSearchResults();
        console.log('TimezoneSelector destroyed');
    }
}