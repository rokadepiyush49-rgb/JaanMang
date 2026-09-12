import { describe, expect, it } from 'vitest';
import { looksLike } from '../../../src/storage/storage.service';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(20)]);
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

describe('the declared content type is a claim, not a fact', () => {
  it('accepts bytes that begin the way the type says they should', () => {
    expect(looksLike('image/png', PNG)).toBe(true);
    expect(looksLike('image/jpeg', JPEG)).toBe(true);
    expect(looksLike('application/pdf', PDF)).toBe(true);
  });

  it('refuses HTML however it is labelled', () => {
    // The attack every upload endpoint eventually meets: the payoff is serving
    // attacker-chosen HTML from the platform's own origin.
    expect(looksLike('image/png', HTML)).toBe(false);
    expect(looksLike('image/jpeg', HTML)).toBe(false);
    expect(looksLike('application/pdf', HTML)).toBe(false);
  });

  it('refuses a real image labelled as a different real image', () => {
    expect(looksLike('image/jpeg', PNG)).toBe(false);
    expect(looksLike('image/png', JPEG)).toBe(false);
  });

  it('refuses anything too short to have a signature', () => {
    expect(looksLike('image/png', Buffer.from([0x89, 0x50]))).toBe(false);
  });

  it('refuses a type that is not on the list at all', () => {
    expect(looksLike('text/html', HTML)).toBe(false);
    expect(looksLike('image/svg+xml', Buffer.from('<svg/>'))).toBe(false);
  });
});
