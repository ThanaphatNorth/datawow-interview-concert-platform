export type Role = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Provisioned admins must set their own password on first login. */
  mustChangePassword: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Concert {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  reservedSeats: number;
  availableSeats: number;
  soldOut: boolean;
  createdAt: string;
  myReservation?: { id: string; status: 'ACTIVE' | 'CANCELLED' } | null;
}

export interface Reservation {
  id: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
  concert: { id: string; name: string };
}

export type AdminEventAction = 'RESERVE' | 'CANCEL';

export interface AdminEvent {
  id: string;
  action: AdminEventAction;
  createdAt: string;
  user: { id: string; name: string };
  concert: { id: string; name: string };
}

export interface AdminEventsResponse {
  data: AdminEvent[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminStats {
  totalSeats: number;
  totalReserved: number;
  totalCancelled: number;
}

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}
