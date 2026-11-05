import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './schemas';

describe('auth schemas validation', () => {
  it('menerima input login yang valid dan menolak sandi kurang dari 8 karakter', () => {
    expect(
      loginSchema.safeParse({
        email: 'andi@email.com',
        password: 'SirkulaFood123!',
      }).success
    ).toBe(true);

    const invalid = loginSchema.safeParse({
      email: 'andi@email.com',
      password: '123',
    });
    expect(invalid.success).toBe(false);
  });

  it('memvalidasi pendaftaran pengguna umum (nama lengkap, email, dan kata sandi)', () => {
    const validUser = registerSchema.safeParse({
      fullName: 'Andi Pratama',
      email: 'andi@email.com',
      password: 'SirkulaFood123!',
    });
    expect(validUser.success).toBe(true);

    const invalidName = registerSchema.safeParse({
      fullName: 'A',
      email: 'sari@email.com',
      password: 'SirkulaFood123!',
    });
    expect(invalidName.success).toBe(false);
  });
});
