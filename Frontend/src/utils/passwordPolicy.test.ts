import { describe, expect, it } from 'vitest';
import { getPasswordRules, isPasswordValid } from './passwordPolicy';

describe('shared creation and reset password policy', () => {
  it('enforces the eight character minimum and mixed character rules', () => {
    expect(isPasswordValid('Short1!')).toBe(false);
    expect(isPasswordValid('Strong1!')).toBe(true);
    expect(isPasswordValid('abcdefgh')).toBe(false);
    expect(isPasswordValid('Abcdef1 ')).toBe(false);
  });

  it('accepts 72 UTF-8 bytes and rejects passwords exceeding the storage limit', () => {
    expect(isPasswordValid('Aa1!' + 'x'.repeat(68))).toBe(true);
    expect(isPasswordValid('Aa1!' + 'x'.repeat(69))).toBe(false);
    expect(isPasswordValid('Aa1!' + 'é'.repeat(34))).toBe(true);
    expect(isPasswordValid('Aa1!' + 'é'.repeat(35))).toBe(false);
  });

  it('rejects null and control characters and uses Unicode characters for length', () => {
    expect(isPasswordValid('Strong1!\0')).toBe(false);
    expect(isPasswordValid('Strong1!\n')).toBe(false);
    expect(isPasswordValid('Strong1!\u0085')).toBe(false);
    expect(getPasswordRules('Aa1!😀😀').find(rule => rule.id === 'length')?.met).toBe(false);
    expect(isPasswordValid('Ää١!abcd')).toBe(true);
  });
});
