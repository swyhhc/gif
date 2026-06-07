import { beforeEach, describe, expect, it } from 'vitest';
import { clearHistory, listHistory, saveHistoryItem } from '../domain/history';

describe('history storage', () => {
  beforeEach(async () => {
    await clearHistory();
  });

  it('keeps only the newest three exports', async () => {
    for (let index = 1; index <= 4; index += 1) {
      await saveHistoryItem({
        id: `item-${index}`,
        createdAt: index,
        format: 'gif',
        fps: 8,
        longestEdge: 320,
        quality: 'standard',
        blob: new Blob([String(index)], { type: 'image/gif' }),
      });
    }

    const items = await listHistory();
    expect(items.map((item) => item.id)).toEqual(['item-4', 'item-3', 'item-2']);
  });
});
