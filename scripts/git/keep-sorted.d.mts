export const START: string;
export const END: string;
export function compareEntries(a: string, b: string): number;
export function findBlocks(text: string): { start: number; end: number; lines: string[] }[];
export function blockProblems(lines: string[]): string[];
export function sortBlocks(text: string): string;
export function filesWithLists(cwd?: string): string[];
export function readText(path: string): string;
