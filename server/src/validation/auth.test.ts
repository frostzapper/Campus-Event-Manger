import { registerSchema, loginSchema } from './auth';

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: '  TEST@EXAMPLE.COM  ',
      password: 'password123',
      displayName: '  John Doe  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com'); // trimmed and lowercased
      expect(result.data.displayName).toBe('John Doe'); // trimmed
    }
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({
      password: 'password123',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string email', () => {
    const result = registerSchema.safeParse({
      email: 12345,
      password: 'password123',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invalid email format');
    }
  });

  it('rejects email over 254 characters', () => {
    const longEmail = 'a'.repeat(246) + '@test.com'; // 255 chars
    expect(longEmail.length).toBeGreaterThan(254);
    const result = registerSchema.safeParse({
      email: longEmail,
      password: 'password123',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at most 254 characters');
    }
  });

  it('rejects missing password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 12345678,
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password under 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: '1234567',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 8 characters');
    }
  });

  it('rejects password over 72 bytes (multibyte characters)', () => {
    // Each emoji is 4 bytes, 19 emojis = 76 bytes
    const password = '😀'.repeat(19);
    expect(Buffer.byteLength(password, 'utf8')).toBeGreaterThan(72);
    
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password,
      displayName: 'John Doe',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at most 72 bytes');
    }
  });

  it('accepts password exactly 72 bytes', () => {
    const password = 'a'.repeat(72); // 72 ASCII chars = 72 bytes
    expect(Buffer.byteLength(password, 'utf8')).toBe(72);
    
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password,
      displayName: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing displayName', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string displayName', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty displayName', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: '   ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('must not be empty');
    }
  });

  it('rejects displayName over 80 characters', () => {
    const longName = 'a'.repeat(81);
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: longName,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at most 80 characters');
    }
  });

  it('accepts displayName exactly 80 characters', () => {
    const name = 'a'.repeat(80);
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: name,
    });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('trims and lowercases email', () => {
    const result = loginSchema.safeParse({
      email: '  TEST@EXAMPLE.COM  ',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('accepts email without format validation', () => {
    const result = loginSchema.safeParse({
      email: 'not-a-valid-email',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string email', () => {
    const result = loginSchema.safeParse({
      email: 12345,
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts any non-empty password including short ones', () => {
    // Login accepts short passwords (existing users may have them)
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '1',
    });
    expect(result.success).toBe(true);
  });
});
