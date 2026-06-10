import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_KEY = 'allowPasswordChange';

/**
 * Marks a route as reachable even while the user still has `mustChangePassword`
 * set — i.e. the change-password endpoint itself and reading one's own profile.
 * Everything else is blocked by {@link MustChangePasswordGuard} until the flag clears.
 */
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);
