#!/usr/bin/env node

/**
 * Module Generator CLI (P62)
 * Usage: node scripts/gen-module.js M19 scanners operational ops
 * Scaffolds standard P58 module vertical slice in src/modules/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const moduleId = args[0] || 'M19';
const moduleName = (args[1] || 'sample').toLowerCase();
const dataClass = args[2] || 'operational';
const owner = args[3] || 'platform';

const folderName = `m${moduleId.replace(/^M/i, '').padStart(2, '0')}-${moduleName}`;
const modulePath = path.join(rootDir, 'src', 'modules', folderName);

if (fs.existsSync(modulePath)) {
  console.error(`[gen-module Error] Module folder already exists at ${modulePath}`);
  process.exit(1);
}

const PascalName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

console.log(`Generating module ${moduleId} (${moduleName}) in ${modulePath}...`);

// Helper to create directory
const mkdir = (dir) => fs.mkdirSync(path.join(modulePath, dir), { recursive: true });

// Create subdirectories
mkdir('domain');
mkdir('data');
mkdir('state');
mkdir('viewmodel');
mkdir('view');
mkdir('__tests__');

// 1. module.config.ts
fs.writeFileSync(
  path.join(modulePath, 'module.config.ts'),
`import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: '${moduleId.toUpperCase()}',
  name: '${moduleName}',
  owner: '${owner}',
  phase: 1,
  dataClass: '${dataClass}',
  capabilities: [],
  dependsOn: [],
  routes: ['/${moduleName}'],
  emits: ['${moduleName}.updated'],
  consumes: [],
});
`
);

// 2. domain/entities.ts
fs.writeFileSync(
  path.join(modulePath, 'domain', 'entities.ts'),
`export interface ${PascalName}Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
`
);

// 3. domain/errors.ts
fs.writeFileSync(
  path.join(modulePath, 'domain', 'errors.ts'),
`export class ${PascalName}DomainError extends Error {
  constructor(message: string, public readonly code: string = '${moduleName.toUpperCase()}_ERROR') {
    super(message);
    this.name = '${PascalName}DomainError';
  }
}
`
);

// 4. data/<name>.repository.ts
fs.writeFileSync(
  path.join(modulePath, 'data', `${moduleName}.repository.ts`),
`import { ${PascalName}Entity } from '../domain/entities';

export interface I${PascalName}Repository {
  fetchItems(): Promise<${PascalName}Entity[]>;
}

export class ${PascalName}Repository implements I${PascalName}Repository {
  async fetchItems(): Promise<${PascalName}Entity[]> {
    return [
      { id: '${moduleName}_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
`
);

// 5. state/<name>.store.ts
fs.writeFileSync(
  path.join(modulePath, 'state', `${moduleName}.store.ts`),
`import { createModuleStore } from '../../../core/state/moduleStore';
import { ${PascalName}Entity } from '../domain/entities';

export interface ${PascalName}State {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: ${PascalName}Entity[];
  error?: string;
}

export const ${moduleName}Store = createModuleStore<${PascalName}State>({
  status: 'idle',
  items: [],
});
`
);

// 6. viewmodel/use<PascalName>ViewModel.ts
fs.writeFileSync(
  path.join(modulePath, 'viewmodel', `use${PascalName}ViewModel.ts`),
`import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { ${moduleName}Store } from '../state/${moduleName}.store';
import { ${PascalName}Repository } from '../data/${moduleName}.repository';

const repository = new ${PascalName}Repository();

export function use${PascalName}ViewModel() {
  const state = useModuleStore(${moduleName}Store);

  const loadData = useCallback(async () => {
    ${moduleName}Store.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      ${moduleName}Store.set({ status: 'ready', items });
    } catch (err) {
      ${moduleName}Store.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
`
);

// 7. view/<PascalName>Screen.tsx
fs.writeFileSync(
  path.join(modulePath, 'view', `${PascalName}Screen.tsx`),
`import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { use${PascalName}ViewModel } from '../viewmodel/use${PascalName}ViewModel';

export const ${PascalName}Screen: React.FC = () => {
  const { state, actions } = use${PascalName}ViewModel();

  useEffect(() => {
    actions.loadData();
  }, [actions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module ${moduleId}: ${PascalName}</Text>
      <Text style={styles.status}>Status: {state.status}</Text>
      <Text style={styles.itemCount}>Items: {state.items.length}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14, color: '#666' },
  itemCount: { fontSize: 14, marginTop: 4 },
});
`
);

// 8. index.ts
fs.writeFileSync(
  path.join(modulePath, 'index.ts'),
`/**
 * Public API for ${moduleId} (${moduleName}) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { use${PascalName}ViewModel } from './viewmodel/use${PascalName}ViewModel';
export { ${PascalName}Screen } from './view/${PascalName}Screen';
export { default as moduleConfig } from './module.config';
`
);

// 9. README.md
fs.writeFileSync(
  path.join(modulePath, 'README.md'),
`# Module ${moduleId} — ${PascalName}

**Owner:** ${owner}  
**Data Class:** ${dataClass}  

## Purpose
Vertical slice module providing ${moduleName} capabilities following P58 Module Contract.

## Layers
- \`domain/\`: Pure domain entities and errors.
- \`data/\`: Repository and data mappers.
- \`state/\`: Light observable store (\`useSyncExternalStore\`).
- \`viewmodel/\`: ViewModel hook exposing state & actions.
- \`view/\`: React / React Native presentation component.
`
);

// 10. __tests__/<name>.test.ts
fs.writeFileSync(
  path.join(modulePath, '__tests__', `${moduleName}.test.ts`),
`import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { ${PascalName}Repository } from '../data/${moduleName}.repository';

describe('${PascalName} Module (${moduleId})', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('${moduleId.toUpperCase()}');
    expect(config.dataClass).toBe('${dataClass}');
  });

  it('fetches items from repository', async () => {
    const repo = new ${PascalName}Repository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
`
);

console.log(`Successfully generated module ${moduleId} (${moduleName})!`);
