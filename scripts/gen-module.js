#!/usr/bin/env node

/**
 * Feature scaffolder.
 * Usage: npm run gen:module -- <domain> [Name]
 *   npm run gen:module -- referrals            -> src/features/referrals/, ReferralsViewModel
 *   npm run gen:module -- lab-orders LabOrder  -> src/features/lab-orders/, LabOrderViewModel
 *
 * Generates the live pattern (see src/core/store/ViewModel.ts): a MobX ViewModel that
 * implements `ViewModel`, loads through an injected requester so tests never touch the
 * network, and starts empty (never sample data). It deliberately does not generate a
 * view: screens are built from the design canvas brief with tokens, i18n keys and the
 * design-system icons (CLAUDE.md), which a template cannot do correctly.
 *
 * It used to scaffold into src/modules/, a parallel architecture the app never ran
 * (audit TD-06).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');

const domain = (process.argv[2] || '').trim().toLowerCase();
if (!/^[a-z][a-z0-9-]*$/.test(domain)) {
  console.error('Usage: npm run gen:module -- <domain> [Name]   (domain: lowercase letters, digits, dashes)');
  process.exit(2);
}
const name = (process.argv[3] || domain.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')).trim();
if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
  console.error('Name must be PascalCase, e.g. LabOrder');
  process.exit(2);
}

const featureDir = path.join(rootDir, 'src', 'features', domain);
const vm = `${name}ViewModel`;
const vmPath = path.join(featureDir, 'viewmodel', `${vm}.ts`);
if (fs.existsSync(vmPath)) {
  console.error(`${path.relative(rootDir, vmPath)} already exists.`);
  process.exit(1);
}

const write = (rel, body) => {
  const file = path.join(featureDir, rel);
  if (fs.existsSync(file)) return console.log(`kept      ${path.relative(rootDir, file)} (already exists)`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  console.log(`created   ${path.relative(rootDir, file)}`);
};

write(`viewmodel/${vm}.ts`, `import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** One item as the API returns it. Replace with the real response shape. */
export interface ${name}Item {
  id: string;
}

type Requester = typeof apiRequest;

/**
 * ${name}.
 *
 * Starts empty and fills from the server; on failure it says so (\`loadFailed\`)
 * rather than showing anything invented.
 */
export class ${vm} implements ViewModel {
  items: ${name}Item[] | null = null;
  loadFailed = false;
  private disposed = false;

  constructor(private readonly request: Requester = apiRequest) {
    makeAutoObservable<${vm}, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get loading(): boolean {
    return this.items === null && !this.loadFailed;
  }

  async load(): Promise<void> {
    this.loadFailed = false;
    try {
      const items = await this.request<${name}Item[]>('/api/${domain}');
      if (!this.disposed) runInAction(() => { this.items = items; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  reset(): void {
    this.items = null;
    this.loadFailed = false;
  }

  dispose(): void {
    this.disposed = true;
  }
}
`);

write(`viewmodel/__tests__/${vm}.test.ts`, `import { describe, expect, it, vi } from 'vitest';
import { ${vm} } from '../${vm}';

describe('${vm}', () => {
  it('starts loading and shows nothing invented', () => {
    const vm = new ${vm}(vi.fn());
    expect(vm.loading).toBe(true);
    expect(vm.items).toBeNull();
  });

  it('fills from the server', async () => {
    const vm = new ${vm}(vi.fn().mockResolvedValue([{ id: 'a' }]));
    await vm.load();
    expect(vm.items).toEqual([{ id: 'a' }]);
    expect(vm.loadFailed).toBe(false);
  });

  it('says so when the server fails', async () => {
    const vm = new ${vm}(vi.fn().mockRejectedValue(new Error('offline')));
    await vm.load();
    expect(vm.items).toBeNull();
    expect(vm.loadFailed).toBe(true);
  });
});
`);

console.log(`
Next steps for ${domain}:
  1. Point ${vm}.load() at the real endpoint and replace ${name}Item with its response shape.
  2. Build the view in src/features/${domain}/views/ from the canvas brief
     (design/screens/briefs/<Screen>.md): tokens only, i18n keys in src/i18n/areas/, icons
     via <Icon>/<Icon3d>/<Glyph>. Tier 1 screens need a named reviewer first (CLAUDE.md).
  3. Register the route in the right feature module.ts with its role guard.
  4. Map the screen in design/screens/implementation-map.json and run
     node scripts/icons/check-icons.mjs --screen <Screen>.
`);
