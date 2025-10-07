import { IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';

export interface UpdateProfileDto {
  userId?: string;
  name?: string;
  role?: 'user' | 'admin';
}

export class UserProfileResponse {
  @IsString()
  id!: string;

  @IsString()
  email!: string;

  @IsString()
  name!: string;

  @IsEnum(['user', 'admin'])
  role!: 'user' | 'admin';

  @IsBoolean()
  isOnboarded!: boolean;
}
