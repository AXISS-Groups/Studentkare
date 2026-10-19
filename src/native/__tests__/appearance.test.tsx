import React from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppearanceView } from '../AppearanceScreen';
import { destinationsFor } from '../homeDestinations';
import { NativeAppearanceViewModel } from '@/features/account/viewmodel/NativeAppearanceViewModel';
import { nativeColorScheme } from '@/design-system/nativeScheme';
import type { apiRequest } from '@/data/services/http';
import { applyPublicConfig, resetPublicConfig } from '@/data/services/config';
import { publicSettingDefaults } from '@/generated/settings';
import { appearanceWaitMs } from '../boot';

afterEach(() => {
  cleanup();
  resetPublicConfig();
});

function server(patchFails = false) {
  let account: string | null = 'LIGHT';
  const request = vi.fn(async (_: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      if (patchFails) throw new Error('offline');
      account = JSON.parse(String(init.body)).appearance;
    }
    return { appearance: account, updatedAt: 1 };
  }) as unknown as typeof apiRequest;
  return request;
}

describe('native Appearance screen', () => {
  it('shows the account’s choice and applies a new one only after the account saved it', async () => {
    const applySaved = vi.fn();
    const vm = new NativeAppearanceViewModel('system', applySaved, server());
    render(<AppearanceView viewModel={vm} />);
    await vm.load();
    expect(await screen.findByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    await waitFor(() => expect(applySaved).toHaveBeenCalledWith('dark'));
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a failed save keeps the old choice and says nothing changed', async () => {
    const applySaved = vi.fn();
    const vm = new NativeAppearanceViewModel('system', applySaved, server(true));
    render(<AppearanceView viewModel={vm} />);
    await vm.load();
    fireEvent.click(await screen.findByRole('radio', { name: 'Dark' }));
    expect(await screen.findByText("We couldn't save that, so nothing has changed. Check your connection and try again.")).toBeInTheDocument();
    expect(applySaved).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
  });

  it('loading and error states', async () => {
    const vm = new NativeAppearanceViewModel('system', vi.fn(), vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof apiRequest);
    render(<AppearanceView viewModel={vm} />);
    expect(screen.getByLabelText('Loading your appearance setting')).toBeInTheDocument();
    await vm.load();
    expect(await screen.findByText("We couldn't load your setting")).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('is offered to students and doctors from the home screen', () => {
    expect(destinationsFor('STUDENT').map((d) => d.route)).toContain('Appearance');
    expect(destinationsFor('NMC_DOCTOR').map((d) => d.route)).toContain('Appearance');
  });

  it('an explicit choice decides the native palette; system follows the phone', () => {
    expect(nativeColorScheme('dark')).toBe('dark');
    expect(nativeColorScheme('light')).toBe('light');
    expect(['light', 'dark']).toContain(nativeColorScheme('system'));
  });
});

describe('native boot wait', () => {
  it('is the appearance.boot_wait_ms setting: the registry default, or a loaded override', () => {
    expect(appearanceWaitMs()).toBe(publicSettingDefaults['appearance.boot_wait_ms']);
    const override = publicSettingDefaults['appearance.boot_wait_ms'] + 1;
    applyPublicConfig({ settings: { 'appearance.boot_wait_ms': override } });
    expect(appearanceWaitMs()).toBe(override);
  });
});

/**
 * The native palette is read once, when '@/design-system/theme' first loads.
 * The boot screen must reach the account's choice without loading it, or the
 * choice would never apply. Walks boot.tsx's static imports.
 */
describe('native boot loads no palette before the appearance is known', () => {
  const root = resolve(process.cwd(), 'src');
  const resolveImport = (from: string, spec: string): string | null => {
    const base = spec.startsWith('@/') ? resolve(root, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
    if (!base) return null;
    for (const candidate of [`${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  };
  const staticImports = (file: string): string[] => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gms)].map((m) => m[1]);
  };

  it('never reaches the design-system theme or a screen', () => {
    const seen = new Set<string>();
    const queue = [resolve(root, 'native/boot.tsx')];
    while (queue.length) {
      const file = queue.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const spec of staticImports(file)) {
        const next = resolveImport(file, spec);
        if (next) queue.push(next);
      }
    }
    const reached = [...seen].map((f) => f.replace(`${root}/`, ''));
    expect(reached).not.toContain('design-system/theme.ts');
    expect(reached).not.toContain('native/App.tsx');
    expect(reached).toContain('design-system/nativeScheme.ts');
  });
});
