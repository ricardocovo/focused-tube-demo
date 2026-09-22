import { describe, it, expect, vi } from 'vitest';

const { TEST_KEY } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const c = require('crypto') as typeof import('crypto');
  const TEST_KEY = c.randomBytes(32).toString('hex');
  return { TEST_KEY };
});

vi.mock('./config', () => ({
  config: {
    ENCRYPTION_KEY: TEST_KEY,
  },
}));

import { encrypt, decrypt } from './encryption';

describe('encryption', () => {
  it('round-trip: encrypt then decrypt returns original plaintext', () => {
    const plaintext = 'hello world';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('different plaintexts produce different ciphertexts', () => {
    const a = encrypt('alpha');
    const b = encrypt('bravo');
    expect(a).not.toBe(b);
  });

  it('same plaintext produces different ciphertexts (random IV)', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
  });

  it('tampered ciphertext throws on decrypt', () => {
    const ciphertext = encrypt('sensitive data');
    const parts = ciphertext.split(':');
    // Tamper with the encrypted portion
    const tampered = parts[2].split('');
    tampered[0] = tampered[0] === 'a' ? 'b' : 'a';
    parts[2] = tampered.join('');

    expect(() => decrypt(parts.join(':'))).toThrow();
  });

  it('handles empty string', () => {
    const ciphertext = encrypt('');
    expect(decrypt(ciphertext)).toBe('');
  });

  it('handles unicode characters', () => {
    const plaintext = '日本語テスト 🚀 émojis & ñ';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('ciphertext format is iv:authTag:encrypted', () => {
    const ciphertext = encrypt('test');
    const parts = ciphertext.split(':');
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted portion is a hex string
    expect(parts[2]).toMatch(/^[0-9a-f]+$/);
  });
});
