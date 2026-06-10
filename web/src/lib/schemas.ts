import { z } from 'zod';

// Shared password policy: at least 8 chars with a lowercase, uppercase, and number.
const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Include an uppercase letter, a lowercase letter, and a number',
  );

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Full name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    // client-side only; confirmPassword is not sent to the API
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    // client-side only; confirmPassword is not sent to the API
    path: ['confirmPassword'],
  });

export const createAdminSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

export const createConcertSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name must be 120 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  totalSeats: z.coerce.number().int('Seats must be a whole number').positive('Seats must be > 0'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type CreateConcertInput = z.infer<typeof createConcertSchema>;
