import { IsString, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfileResponse } from './account.dto.js';

export class TokensDto {
  @IsString()
  AccessToken!: string;

  @IsString()
  IdToken!: string;

  @IsString()
  RefreshToken!: string;

  @IsNumber()
  ExpiresIn!: number;
}

export class AuthResponseDto {
  @IsString()
  message!: string;

  @ValidateNested()
  @Type(() => UserProfileResponse)
  user!: UserProfileResponse;

  @ValidateNested()
  @Type(() => TokensDto)
  tokens!: TokensDto;
}

export class GetProfileResponseDto {
  @IsString()
  id!: string;

  @IsString()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  groups!: string;

  @IsString()
  tokenUse!: string;

  @IsNumber()
  authTime!: number;

  @IsNumber()
  exp!: number;
}

export class EditProfileResponseDto {
  @IsString()
  message!: string;

  @ValidateNested()
  @Type(() => UserProfileResponse)
  user!: UserProfileResponse;
}

export class ErrorResponseDto {
  @IsString()
  error!: string;

  @IsString()
  message!: string;
}
