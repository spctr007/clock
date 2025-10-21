import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom environment to simulate browser APIs
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Include test files
    include: ['js/tests/**/*.test.js'],
    
    // Exclude Node.js specific test files
    exclude: ['js/tests/**/*.node.test.js'],
    
    // Setup files to run before tests
    setupFiles: ['./test-setup.js'],
    
    // Test timeout (useful for network tests)
    testTimeout: 15000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['js/**/*.js'],
      exclude: ['js/tests/**', 'js/main.js']
    }
  }
});