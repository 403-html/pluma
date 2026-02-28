import type { FlagEntry } from '@/lib/api/flags';
import { MAX_FLAGS, FLAG_INDENT_PX_PER_LEVEL } from '@/lib/constants';

/**
 * Converts a flat FlagEntry list into a depth-annotated DFS-ordered list so
 * that each parent appears immediately before its children in the table.
 * Children are pushed onto the stack in reverse so the first child is popped
 * first, preserving the original order within each sibling group.
 * A visited Set prevents re-processing nodes, bounding the loop to at most
 * MAX_FLAGS iterations regardless of input structure or cycles.
 */
export function buildOrderedFlags(
  flagList: FlagEntry[],
): Array<{ flag: FlagEntry; depth: number; indentPx: number }> {
  if (flagList.length > MAX_FLAGS) {
    throw new Error(`buildOrderedFlags: flag list exceeds maximum size of ${MAX_FLAGS}`);
  }
  const byParent = new Map<string | null, FlagEntry[]>();
  const flagMap = new Map<string, FlagEntry>();
  for (const f of flagList) {
    flagMap.set(f.flagId, f);
    const key = f.parentFlagId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }
  const result: Array<{ flag: FlagEntry; depth: number; indentPx: number }> = [];
  const roots = (byParent.get(null) ?? []).slice().reverse();
  const stack: Array<{ flagId: string; depth: number }> = roots.map(f => ({
    flagId: f.flagId,
    depth: 0,
  }));
  const visited = new Set<string>();
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (visited.has(item.flagId)) continue;
    visited.add(item.flagId);
    const flag = flagMap.get(item.flagId);
    if (!flag) continue;
    result.push({ flag, depth: item.depth, indentPx: item.depth * FLAG_INDENT_PX_PER_LEVEL });
    const children = (byParent.get(item.flagId) ?? []).slice().reverse();
    for (const child of children) {
      stack.push({ flagId: child.flagId, depth: item.depth + 1 });
    }
  }
  return result;
}
