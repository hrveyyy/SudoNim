import '@testing-library/jest-dom/vitest';
// fake-indexeddb/auto installs a fake IndexedDB implementation on the global
// scope so Dexie can run under jsdom in unit tests.
import 'fake-indexeddb/auto';
