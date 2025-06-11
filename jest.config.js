// jest.config.js

const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
    // Test environment
    testEnvironment: 'node',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

    // Test patterns
    testMatch: [
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/lib/**/*.test.ts',
        '<rootDir>/**/__tests__/**/*.test.ts'
    ],

    // Module name mapping for absolute imports
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
    },

    // Collect coverage from these files
    collectCoverageFrom: [
        'lib/**/*.ts',
        'app/api/**/*.ts',
        '!lib/**/*.d.ts',
        '!lib/**/*.test.ts',
        '!lib/generated/**',
        '!**/*.config.ts',
        '!**/node_modules/**',
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        // Stricter thresholds for critical calculation files
        'lib/services/calculations/*.ts': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95,
        },
        // Medium thresholds for models and services
        'lib/models/*.ts': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
        'lib/services/**/*.ts': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
    },

    // Coverage reporters
    coverageReporters: [
        'text',
        'text-summary',
        'lcov',
        'html',
        'json',
    ],

    // Coverage directory
    coverageDirectory: 'coverage',

    // Transform files
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
            },
        }],
    },

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/coverage/',
        '<rootDir>/dist/',
    ],

    // Global test timeout (30 seconds for financial calculations)
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Verbose output for debugging
    verbose: true,

    // Globals for tests
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
        },
    },

    // Test environment options
    testEnvironmentOptions: {
        url: 'http://localhost:3000',
    },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)