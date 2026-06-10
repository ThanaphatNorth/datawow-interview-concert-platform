import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  // confirmPassword is validated client-side only; the API needs just the new value.
  @IsString()
  @MinLength(8)
  // Password policy: at least one lowercase letter, one uppercase letter, and one number.
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must include an uppercase letter, a lowercase letter, and a number',
  })
  newPassword: string;
}
