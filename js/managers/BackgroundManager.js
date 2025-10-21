/**
 * BackgroundManager - Handles background image upload, storage, and opacity management
 */

export class BackgroundManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.backgroundOverlay = null;
        this.currentImageBrightness = null;
        
        // File upload constraints
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        this.initializeElements();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.backgroundOverlay = document.getElementById('backgroundOverlay');
    }

    /**
     * Upload and set background image with offline support
     */
    async uploadBackground(file, progressCallback = null) {
        try {
            // Validate file
            this.validateImageFile(file);
            
            // Report progress
            if (progressCallback) progressCallback(10);
            
            // Convert to base64
            const base64Image = await this.fileToBase64(file);
            if (progressCallback) progressCallback(50);
            
            // Compress if needed
            const compressedImage = await this.compressImageIfNeeded(base64Image);
            if (progressCallback) progressCallback(80);
            
            // Check storage availability (important for offline mode)
            if (!this.settingsManager.isStorageAvailable()) {
                throw new Error('Local storage is not available. Background cannot be saved.');
            }
            
            // Save to settings
            this.settingsManager.saveSetting('backgroundImage', compressedImage);
            if (progressCallback) progressCallback(90);
            
            // Apply to UI
            this.applyBackgroundImage(compressedImage);
            if (progressCallback) progressCallback(100);
            
            console.log('Background image uploaded successfully');
            
            // Dispatch success event
            document.dispatchEvent(new CustomEvent('backgroundUploadSuccess', {
                detail: { size: file.size, type: file.type }
            }));
            
        } catch (error) {
            console.error('Failed to upload background:', error);
            
            // Dispatch error event for app-level handling
            document.dispatchEvent(new CustomEvent('backgroundUploadError', {
                detail: { error, operation: 'upload' }
            }));
            
            throw error;
        }
    }

    /**
     * Ensure offline functionality works properly
     */
    ensureOfflineFunctionality() {
        try {
            // Check if localStorage is available
            if (!this.settingsManager.isStorageAvailable()) {
                console.warn('LocalStorage not available - background features disabled');
                return false;
            }
            
            // Verify current background can be loaded
            const currentBackground = this.settingsManager.getSetting('backgroundImage');
            if (currentBackground) {
                try {
                    this.applyBackgroundImage(currentBackground);
                    console.log('Background functionality verified for offline mode');
                } catch (error) {
                    console.warn('Current background image corrupted, resetting:', error);
                    this.resetToDefault();
                }
            }
            
            // Verify opacity controls work
            const currentOpacity = this.settingsManager.getSetting('backgroundOpacity', 0.5);
            this.setBackgroundOpacity(currentOpacity);
            
            return true;
            
        } catch (error) {
            console.error('Failed to ensure offline functionality:', error);
            return false;
        }
    }

    /**
     * Get offline capability status
     */
    getOfflineStatus() {
        return {
            storageAvailable: this.settingsManager.isStorageAvailable(),
            hasBackgroundImage: !!this.settingsManager.getSetting('backgroundImage'),
            opacityControlsWork: true, // Opacity controls always work offline
            uploadAvailable: this.settingsManager.isStorageAvailable()
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        try {
            // Clear any pending operations
            // (Add cleanup for any async operations if needed)
            
            console.log('BackgroundManager destroyed');
            
        } catch (error) {
            console.error('Error destroying BackgroundManager:', error);
        }
    }

    /**
     * Validate uploaded image file
     */
    validateImageFile(file) {
        if (!file) {
            throw new Error('No file selected');
        }
        
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`);
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            const maxSizeMB = this.maxFileSize / (1024 * 1024);
            throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
        }
        
        return true;
    }

    /**
     * Convert file to base64 string
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress image if it's too large for localStorage
     */
    async compressImageIfNeeded(base64Image) {
        // Check if image is too large (localStorage has ~5-10MB limit)
        const sizeInBytes = new Blob([base64Image]).size;
        const maxStorageSize = 2 * 1024 * 1024; // 2MB limit for safety
        
        if (sizeInBytes <= maxStorageSize) {
            return base64Image;
        }
        
        console.log('Compressing image for storage...');
        
        try {
            return await this.compressBase64Image(base64Image, 0.7); // 70% quality
        } catch (error) {
            console.warn('Image compression failed, using original:', error);
            return base64Image;
        }
    }

    /**
     * Compress base64 image using canvas
     */
    compressBase64Image(base64Image, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (max 1920x1080)
                const maxWidth = 1920;
                const maxHeight = 1080;
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                try {
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image for compression'));
            };
            
            img.src = base64Image;
        });
    }

    /**
     * Apply background image to the overlay
     */
    applyBackgroundImage(base64Image) {
        if (this.backgroundOverlay && base64Image) {
            // Test if the image loads successfully
            const testImg = new Image();
            
            testImg.onload = () => {
                // Image loaded successfully, apply it
                this.backgroundOverlay.style.backgroundImage = `url(${base64Image})`;
                
                // Analyze image brightness for better contrast detection
                this.analyzeImageBrightness(base64Image);
            };
            
            testImg.onerror = () => {
                console.error('Failed to load background image, falling back to default');
                this.handleBackgroundLoadError();
            };
            
            testImg.src = base64Image;
        }
    }

    /**
     * Handle background image loading errors
     */
    handleBackgroundLoadError() {
        // Clear the corrupted image from settings
        this.settingsManager.saveSetting('backgroundImage', null);
        
        // Reset to default background
        if (this.backgroundOverlay) {
            this.backgroundOverlay.style.backgroundImage = '';
        }
        
        // Ensure text contrast is reset
        const currentOpacity = this.settingsManager.getSetting('backgroundOpacity', 0.5);
        this.ensureTextReadability(currentOpacity);
        
        console.log('Background image removed due to loading error');
    }

    /**
     * Analyze image brightness to improve contrast calculations
     */
    analyzeImageBrightness(base64Image) {
        const img = new Image();
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Use small canvas for performance
                canvas.width = 50;
                canvas.height = 50;
                
                ctx.drawImage(img, 0, 0, 50, 50);
                
                const imageData = ctx.getImageData(0, 0, 50, 50);
                const brightness = this.calculateImageBrightness(imageData);
                
                // Store brightness for future contrast calculations
                this.currentImageBrightness = brightness;
                
                // Re-apply contrast with better information
                const currentOpacity = this.settingsManager.getSetting('backgroundOpacity', 0.5);
                this.ensureTextReadability(currentOpacity);
                
            } catch (error) {
                console.warn('Could not analyze image brightness:', error);
                // Fallback to default brightness
                this.currentImageBrightness = 0.5;
            }
        };
        
        img.onerror = () => {
            console.warn('Could not load image for brightness analysis');
            this.currentImageBrightness = 0.5;
        };
        
        img.src = base64Image;
    }

    /**
     * Calculate average brightness of image data
     */
    calculateImageBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let pixelCount = 0;
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate relative luminance
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            totalBrightness += brightness;
            pixelCount++;
        }
        
        return pixelCount > 0 ? totalBrightness / pixelCount : 0.5;
    }

    /**
     * Set background opacity with contrast checking
     */
    setBackgroundOpacity(opacity) {
        if (this.backgroundOverlay) {
            // Ensure opacity is between 0 and 1
            const clampedOpacity = Math.max(0, Math.min(1, opacity));
            this.backgroundOverlay.style.opacity = clampedOpacity;
            
            // Check and ensure text readability
            this.ensureTextReadability(clampedOpacity);
        }
    }

    /**
     * Ensure time text remains readable with sufficient contrast
     */
    ensureTextReadability(backgroundOpacity) {
        const timeText = document.querySelector('.time-text');
        const dateText = document.querySelector('.date-text');
        
        if (!timeText) return;
        
        // Calculate effective background brightness based on opacity
        // Higher opacity means more background influence
        const effectiveBrightness = this.calculateEffectiveBackgroundBrightness(backgroundOpacity);
        
        // Adjust text shadow and styling for better contrast
        this.adjustTextContrast(timeText, effectiveBrightness);
        
        if (dateText) {
            this.adjustTextContrast(dateText, effectiveBrightness);
        }
        
        // Also adjust world clock text if visible
        const worldClockTimes = document.querySelectorAll('.world-clock-time');
        worldClockTimes.forEach(element => {
            this.adjustTextContrast(element, effectiveBrightness);
        });
    }

    /**
     * Calculate effective background brightness based on opacity and background
     */
    calculateEffectiveBackgroundBrightness(opacity) {
        // If no custom background, use default gradient brightness (medium-dark)
        if (!this.settingsManager.getSetting('backgroundImage')) {
            return 0.3; // Default gradient is medium-dark
        }
        
        // Use analyzed image brightness if available
        const imageBrightness = this.currentImageBrightness || 0.5;
        
        // Calculate effective brightness: blend between default and image brightness
        // based on opacity (higher opacity = more image influence)
        const defaultBrightness = 0.3;
        const effectiveBrightness = defaultBrightness + (imageBrightness - defaultBrightness) * opacity;
        
        return Math.max(0.1, Math.min(0.9, effectiveBrightness));
    }

    /**
     * Adjust text contrast based on background brightness
     */
    adjustTextContrast(textElement, backgroundBrightness) {
        if (!textElement) return;
        
        // Remove existing contrast classes
        textElement.classList.remove('high-contrast', 'medium-contrast', 'low-contrast');
        
        // Apply appropriate contrast styling based on background brightness
        if (backgroundBrightness > 0.7) {
            // Bright background - use dark text with strong shadow
            textElement.classList.add('high-contrast');
            textElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.6)';
            textElement.style.color = '#ffffff';
        } else if (backgroundBrightness > 0.4) {
            // Medium background - use enhanced shadow
            textElement.classList.add('medium-contrast');
            textElement.style.textShadow = '1px 1px 3px rgba(0, 0, 0, 0.6), -1px -1px 2px rgba(0, 0, 0, 0.4)';
            textElement.style.color = '#ffffff';
        } else {
            // Dark background - use standard styling
            textElement.classList.add('low-contrast');
            textElement.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
            textElement.style.color = '#ffffff';
        }
    }

    /**
     * Load saved background on initialization
     */
    async loadSavedBackground() {
        try {
            const savedImage = this.settingsManager.getSetting('backgroundImage');
            const savedOpacity = this.settingsManager.getSetting('backgroundOpacity', 0.5);
            
            if (savedImage) {
                this.applyBackgroundImage(savedImage);
            }
            
            // Set opacity and ensure text readability
            this.setBackgroundOpacity(savedOpacity);
            
        } catch (error) {
            console.error('Failed to load saved background:', error);
            this.resetToDefault();
        }
    }

    /**
     * Reset to default background
     */
    resetToDefault() {
        if (this.backgroundOverlay) {
            this.backgroundOverlay.style.backgroundImage = '';
            this.backgroundOverlay.style.opacity = '0.5';
        }
        
        // Reset text contrast to default
        this.ensureTextReadability(0.5);
        
        // Clear from settings
        this.settingsManager.saveSetting('backgroundImage', null);
        this.settingsManager.saveSetting('backgroundOpacity', 0.5);
        
        console.log('Background reset to default');
    }

    /**
     * Get current background info
     */
    getCurrentBackgroundInfo() {
        const backgroundImage = this.settingsManager.getSetting('backgroundImage');
        const opacity = this.settingsManager.getSetting('backgroundOpacity', 0.5);
        
        return {
            hasCustomBackground: !!backgroundImage,
            opacity: opacity,
            sizeInfo: backgroundImage ? this.getImageSizeInfo(backgroundImage) : null
        };
    }

    /**
     * Get image size information
     */
    getImageSizeInfo(base64Image) {
        try {
            const sizeInBytes = new Blob([base64Image]).size;
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            
            return {
                bytes: sizeInBytes,
                kb: sizeInKB,
                mb: sizeInMB
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Remove current background
     */
    removeBackground() {
        this.resetToDefault();
    }

    /**
     * Check if background upload is supported
     */
    isUploadSupported() {
        return !!(window.File && window.FileReader && window.FileList && window.Blob);
    }

    /**
     * Get supported file types as string
     */
    getSupportedTypes() {
        return this.allowedTypes.join(', ');
    }

    /**
     * Get maximum file size in MB
     */
    getMaxFileSizeMB() {
        return this.maxFileSize / (1024 * 1024);
    }

    /**
     * Validate current background and fallback if needed
     */
    validateCurrentBackground() {
        const savedImage = this.settingsManager.getSetting('backgroundImage');
        
        if (savedImage) {
            // Test if the saved image is still valid
            const testImg = new Image();
            
            testImg.onerror = () => {
                console.warn('Saved background image is corrupted, resetting to default');
                this.handleBackgroundLoadError();
            };
            
            testImg.src = savedImage;
        }
    }

    /**
     * Initialize background with validation
     */
    async initializeBackground() {
        await this.loadSavedBackground();
        this.validateCurrentBackground();
    }
}