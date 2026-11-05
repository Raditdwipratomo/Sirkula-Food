import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { isDesignatedAdminEmail, requireAdmin } from './auth.js';

describe('isDesignatedAdminEmail', () => {
  it('recognizes explicit designated admin emails', () => {
    expect(isDesignatedAdminEmail('andi@kampus.ac.id')).toBe(true);
    expect(isDesignatedAdminEmail('admin@sirkulafood.id')).toBe(true);
    expect(isDesignatedAdminEmail('admin@kampus.ac.id')).toBe(true);
    expect(isDesignatedAdminEmail('  ANDI@KAMPUS.AC.ID  ')).toBe(true);
  });

  it('rejects arbitrary admin@ emails (preventing wildcard takeover)', () => {
    expect(isDesignatedAdminEmail('admin@gmail.com')).toBe(false);
    expect(isDesignatedAdminEmail('admin@attacker.com')).toBe(false);
    expect(isDesignatedAdminEmail('admin@company.org')).toBe(false);
    expect(isDesignatedAdminEmail('staff@kampus.ac.id')).toBe(false);
  });
});

describe('requireAdmin middleware', () => {
  it('allows access for users with admin role', () => {
    const req = {
      user: {
        id: 'user-1',
        email: 'andi@kampus.ac.id',
        organizationId: 'org-1',
        fullName: 'Andi Admin',
        role: 'admin',
      },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects access with 403 for users with staff role', () => {
    const req = {
      user: {
        id: 'user-2',
        email: 'staff@kampus.ac.id',
        organizationId: 'org-1',
        fullName: 'Staf Biasa',
        role: 'staff',
      },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('hanya diizinkan untuk peran Admin'),
      })
    );
  });

  it('rejects access with 403 when user is missing', () => {
    const req = {} as unknown as Request;
    const jsonMock = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
