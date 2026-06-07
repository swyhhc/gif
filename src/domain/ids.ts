type CryptoLike = {
  randomUUID?: () => string;
};

export function createExportId(cryptoLike: CryptoLike = globalThis.crypto ?? {}): string {
  if (typeof cryptoLike.randomUUID === 'function') {
    return cryptoLike.randomUUID();
  }

  return `export-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
