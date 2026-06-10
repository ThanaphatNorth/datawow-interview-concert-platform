import { APIRequestContext, expect, request } from '@playwright/test';
import { API_BASE_URL } from '../../playwright.config';

export const SEED_ADMIN = { email: 'admin@example.com', password: 'Password123' };
export const SEED_USER = { email: 'user@example.com', password: 'Password123' };
// Freshly provisioned admin: seeded with mustChangePassword=true (reset on each seed).
export const SEED_NEW_ADMIN = { email: 'new-admin@example.com', password: 'Password123' };

export type AuthResult = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: 'USER' | 'ADMIN' };
};

export type Concert = {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  reservedSeats: number;
  availableSeats: number;
  soldOut?: boolean;
};

/** Unique suffix so parallel tests never collide on email / concert name. */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function freshUser() {
  const tag = uid();
  return {
    name: `E2E User ${tag}`,
    email: `e2e-${tag}@example.com`,
    password: 'Password123',
  };
}

/**
 * API helper bound to its own APIRequestContext so it can be used
 * outside a page fixture (e.g. concurrency tests with many users).
 */
export class ApiClient {
  private constructor(private ctx: APIRequestContext) {}

  static async create(): Promise<ApiClient> {
    const ctx = await request.newContext({ baseURL: API_BASE_URL });
    return new ApiClient(ctx);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  async register(user: { name: string; email: string; password: string }): Promise<AuthResult> {
    const res = await this.ctx.post('/auth/register', { data: user });
    expect(res.status(), `register ${user.email}`).toBe(201);
    return res.json();
  }

  async login(creds: { email: string; password: string }): Promise<AuthResult> {
    const res = await this.ctx.post('/auth/login', { data: creds });
    expect(res.status(), `login ${creds.email}`).toBe(200);
    return res.json();
  }

  /** Register a brand-new USER and return its token + user. */
  async registerFreshUser(): Promise<{ auth: AuthResult; credentials: ReturnType<typeof freshUser> }> {
    const credentials = freshUser();
    const auth = await this.register(credentials);
    return { auth, credentials };
  }

  async adminToken(): Promise<string> {
    const auth = await this.login(SEED_ADMIN);
    return auth.accessToken;
  }

  async createConcert(
    token: string,
    data: { name: string; description: string; totalSeats: number },
  ): Promise<Concert> {
    const res = await this.ctx.post('/concerts', {
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
    expect(res.status(), `create concert ${data.name}`).toBe(201);
    return res.json();
  }

  /** Convenience: create a concert as the seeded admin. */
  async seedConcert(data: { name?: string; description?: string; totalSeats: number }): Promise<Concert> {
    const token = await this.adminToken();
    return this.createConcert(token, {
      name: data.name ?? `E2E Concert ${uid()}`,
      description: data.description ?? 'Seeded by E2E suite',
      totalSeats: data.totalSeats,
    });
  }

  async deleteConcert(token: string, id: string): Promise<void> {
    const res = await this.ctx.delete(`/concerts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 200 = deleted; 404 = already gone — both are acceptable for cleanup.
    expect([200, 404]).toContain(res.status());
  }

  async deleteConcertAsAdmin(id: string): Promise<void> {
    const token = await this.adminToken();
    await this.deleteConcert(token, id);
  }

  async reserve(token: string, concertId: string) {
    return this.ctx.post(`/concerts/${concertId}/reservations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Raw cancel call so specs can assert status codes (200 / 403 / 404). */
  async cancel(token: string, reservationId: string) {
    return this.ctx.delete(`/reservations/${reservationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async listConcerts(token: string): Promise<Concert[]> {
    const res = await this.ctx.get('/concerts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    return res.json();
  }

  async getConcert(token: string, id: string): Promise<Concert> {
    const all = await this.listConcerts(token);
    const found = all.find((c) => c.id === id);
    expect(found, `concert ${id} present in GET /concerts`).toBeTruthy();
    return found!;
  }

  /** Raw call against any admin endpoint to assert role enforcement. */
  async rawGet(path: string, token: string) {
    return this.ctx.get(path, { headers: { Authorization: `Bearer ${token}` } });
  }

  /** Raw POST so specs can assert status codes (e.g. 403 for a USER token). */
  async rawPost(path: string, token: string, data: unknown) {
    return this.ctx.post(path, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  /** Raw DELETE so specs can assert status codes / clean up provisioned rows. */
  async rawDelete(path: string, token: string) {
    return this.ctx.delete(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
