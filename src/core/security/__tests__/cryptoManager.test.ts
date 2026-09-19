import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoManager } from '../cryptoManager';

describe('CryptoManager (P69)', () => {
  let cryptoManager: CryptoManager;

  beforeEach(() => {
    cryptoManager = new CryptoManager();
  });

  it('encrypts and decrypts PHI plaintext using AES-256-GCM', () => {
    const subjectId = 'STUDENT-PHI-1';
    const originalText = 'Diagnosed with Type 1 Diabetes; Insulin prescribed';

    const encrypted = cryptoManager.encryptField(subjectId, originalText);
    expect(encrypted.ciphertext).not.toBe(originalText);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes hex = 24 chars
    expect(encrypted.tag).toHaveLength(32); // 16 bytes auth tag hex = 32 chars

    const decrypted = cryptoManager.decryptField(subjectId, encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('detects tampered ciphertext during GCM auth tag check', () => {
    const subjectId = 'STUDENT-PHI-2';
    const encrypted = cryptoManager.encryptField(subjectId, 'Blood Group: A+');

    // Tamper with last character of ciphertext
    const tamperedCiphertext =
      encrypted.ciphertext.slice(0, -1) + (encrypted.ciphertext.endsWith('0') ? '1' : '0');
    const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

    expect(() => cryptoManager.decryptField(subjectId, tampered)).toThrow();
  });

  it('destroys subject encryption key during crypto-shredding', () => {
    const subjectId = 'STUDENT-TO-BE-SHREDDED';
    const encrypted = cryptoManager.encryptField(subjectId, 'Confidential Consultation Note');

    const shredResult = cryptoManager.cryptoShredSubject(subjectId);
    expect(shredResult.shredded).toBe(true);

    // Subsequent decryption attempt must throw because DEK was destroyed
    expect(() => cryptoManager.decryptField(subjectId, encrypted)).toThrow(
      /Subject encryption key not found or crypto-shredded/
    );
  });
});
