/**
 * Unit tests for server/src/lib/token.ts
 */

import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from './token';

const secret = process.env.JWT_SECRET ?? '';

describe('signToken', () => {
  it('returns a string that is a valid JWT', () => {
    const token = signToken('student-dev-lead');
    expect(typeof token).toBe('string');
    // Must have three dot-separated parts
    expect(token.split('.').length).toBe(3);
  });

  it('embeds the studentId in the payload', () => {
    const token = signToken('student-dev-lead');
    const payload = jwt.verify(token, secret) as { studentId: string };
    expect(payload.studentId).toBe('student-dev-lead');
  });

  it('signs with a 24-hour expiry', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = signToken('student-dev-lead');
    const payload = jwt.decode(token) as { exp: number; iat: number };
    const ttl = payload.exp - payload.iat;
    // Allow 5 seconds of drift
    expect(ttl).toBeGreaterThanOrEqual(24 * 60 * 60 - 5);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60 + 5);
    expect(payload.iat).toBeGreaterThanOrEqual(before);
  });
});

describe('verifyToken', () => {
  it('returns the payload for a valid token', () => {
    const token = signToken('student-dev-lead');
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result?.studentId).toBe('student-dev-lead');
  });

  it('returns null for a token signed with a different secret', () => {
    const bad = jwt.sign({ studentId: 'student-dev-lead' }, 'wrong-secret', { expiresIn: 3600 });
    expect(verifyToken(bad)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const expired = jwt.sign({ studentId: 'student-dev-lead' }, secret, { expiresIn: -1 });
    expect(verifyToken(expired)).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(verifyToken('not.a.jwt')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
  });

  it('round-trips through sign then verify', () => {
    const id = 'student-campus-org';
    const token = signToken(id);
    const result = verifyToken(token);
    expect(result?.studentId).toBe(id);
  });
});
