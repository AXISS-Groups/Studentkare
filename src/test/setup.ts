/** Vitest setup — runs before every test file.
 *
 * Adds the DOM matchers (toBeInTheDocument, toHaveAttribute, ...) and clears
 * the rendered tree between tests so one test's markup cannot satisfy the
 * next one's query.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
