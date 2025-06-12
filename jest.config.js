// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
    dir: './',
})

const customJestConfig = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    testMatch: [
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/lib/**/*.test.ts',
        '<rootDir>/**/__tests__/**/*.test.ts'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    collectCoverageFrom: [
        'lib/**/*.ts',
        'app/api/**/*.ts',
        '!lib/**/*.d.ts',
        '!lib/**/*.test.ts',
        '!lib/generated/**',
        '!**/*.config.ts',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        'lib/services/calculations/*.ts': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95,
        },
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
    coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
    coverageDirectory: 'coverage',
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
            },
        }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/coverage/',
        '<rootDir>/dist/',
    ],
    testTimeout: 30000,
    clearMocks: true,
    restoreMocks: true,
    verbose: true,
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
        },
    },
    testEnvironmentOptions: {
        url: 'http://localhost:3000',
    },
}

module.exports = createJestConfig(customJestConfig)
