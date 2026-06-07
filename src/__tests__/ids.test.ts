import { describe, expect, it, vi } from 'vitest';
import { createExportId } from '../domain/ids';

describe('ids', () => {
  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'native-id');
    expect(createExportId({ randomUUID })).toBe('native-id');
  });

  it('falls back when crypto.randomUUID is missing', () => {
    const id = createExportId({});
    expect(id).toMatch(/^export-\d+-[a-z0-9]+$/);
  });
});
