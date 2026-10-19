// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * AGENTS.md rule 11 (nothing hard-coded): the copy-literal lint rule and the
 * legacy-list ratchet. These lint snippets against the real config instead of
 * committing an offender, so the tree stays clean and the rule is still proven.
 */
const root = process.cwd();
const eslint = new ESLint({ cwd: root, overrideConfigFile: resolve(root, 'config/eslint.config.js') });
const copyLegacy: string[] = JSON.parse(readFileSync(resolve(root, 'config/copy-literal-legacy.json'), 'utf8'));
const RULE = 'sk-copy/no-literal-copy';
const NEW_FILE = 'src/features/brand-new/views/BrandNewPanel.tsx';

async function copyFindings(code: string, filePath = NEW_FILE): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, filePath) });
  return result.messages.filter((message) => message.ruleId === RULE).length;
}

const wrap = (jsx: string) => `export function Panel({ t }: { t: (key: string) => string }) {\n  return (${jsx});\n}\n`;

describe('copy-literal rule', () => {
  it.each([
    ['JSX text', '<p>Your water goal</p>'],
    ['a string literal child', "<p>{'Your water goal'}</p>"],
    ['a template literal child', '<p>{`Your water goal`}</p>'],
    ['aria-label', '<button aria-label="Close" />'],
    ['placeholder in braces', "<input placeholder={'Search medicines'} />"],
    ['title on a component', '<Card title="Upcoming doses" />'],
    ['alt', '<img alt="A student" src="x" />'],
    ['accessibilityLabel', '<View accessibilityLabel="Close" />'],
    ['Telugu text', '<p>నీటి లక్ష్యం</p>'],
  ])('flags %s in a new file', async (_label, jsx) => {
    expect(await copyFindings(wrap(jsx))).toBeGreaterThan(0);
  });

  it.each([
    ['catalogue text', "<p>{t('wellness.waterGoal')}</p>"],
    ['a translated label', "<button aria-label={t('common.back')} />"],
    ['symbols without letters', '<span>· — 2/3</span>'],
    ['non-copy attributes', '<div className="row" data-testid="panel" role="list" />'],
  ])('allows %s', async (_label, jsx) => {
    expect(await copyFindings(wrap(jsx))).toBe(0);
  });

  it('exempts the files on the legacy list, and tests', async () => {
    expect(copyLegacy.length).toBeGreaterThan(0);
    expect(await copyFindings(wrap('<p>Your water goal</p>'), copyLegacy[0])).toBe(0);
    expect(await copyFindings(wrap('<p>Your water goal</p>'), 'src/features/brand-new/__tests__/Panel.test.tsx')).toBe(0);
  });

  it('keeps the legacy list sorted, unique and pointing at real files', () => {
    expect([...copyLegacy].sort()).toEqual(copyLegacy);
    expect(new Set(copyLegacy).size).toBe(copyLegacy.length);
  });
});

describe('legacy lists only shrink (scripts/check-legacy-lists.mjs)', () => {
  const script = resolve(root, 'scripts/check-legacy-lists.mjs');
  const scratch = mkdtempSync(join(tmpdir(), 'sk-ratchet-'));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  const run = (cwd: string) => spawnSync(process.execPath, [script], { cwd, env: { ...process.env, LEGACY_BASE: 'HEAD' }, encoding: 'utf8' });
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'ignore' });

  it('passes on the current tree', () => {
    const result = run(root);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('config/copy-literal-legacy.json');
    expect(result.stdout).toContain('config/python-magic-number-legacy.json');
  });

  it('fails when a list gains an entry or names a missing file', () => {
    mkdirSync(join(scratch, 'config'));
    writeFileSync(join(scratch, 'a.tsx'), '');
    writeFileSync(join(scratch, 'b.tsx'), '');
    writeFileSync(join(scratch, 'config/copy-literal-legacy.json'), JSON.stringify(['a.tsx']));
    git(scratch, 'init', '-q');
    git(scratch, '-c', 'user.email=ci@example.test', '-c', 'user.name=ci', 'add', '.');
    git(scratch, '-c', 'user.email=ci@example.test', '-c', 'user.name=ci', 'commit', '-qm', 'base');
    expect(run(scratch).status).toBe(0);

    writeFileSync(join(scratch, 'config/copy-literal-legacy.json'), JSON.stringify(['a.tsx', 'b.tsx']));
    const grown = run(scratch);
    expect(grown.status).toBe(1);
    expect(grown.stderr).toContain('b.tsx was added; legacy lists may only shrink');

    writeFileSync(join(scratch, 'config/copy-literal-legacy.json'), JSON.stringify(['gone.tsx']));
    const missing = run(scratch);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('gone.tsx does not exist');
  });
});
