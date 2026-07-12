/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Transform all relevant packages that ship ESM or TS
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|expo' +
      '|@expo' +
      '|expo-router' +
      '|expo-modules-core' +
      '|@unimodules' +
      '|react-native-svg' +
      '|react-native-reanimated' +
      '|react-native-gesture-handler' +
      '|react-native-screens' +
      '|react-native-safe-area-context' +
      '|react-native-url-polyfill' +
      '|zustand' +
      ')/)',
  ],
  // Coverage targets — smoke coverage for T14 four critical paths
  collectCoverageFrom: [
    'src/services/auth.ts',
    'src/services/bookings.ts',
    'src/services/payments.ts',
    'src/store/useAuthStore.ts',
    'src/store/useSevaStore.ts',
  ],
  // Map module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
}
