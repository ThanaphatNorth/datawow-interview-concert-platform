import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  // Temporary password — the new admin is forced to change it on first login.
  @IsString()
  @MinLength(8)
  password: string;
}
