export interface AuthResponseDto {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    isOnboarded: boolean;
  };
  tokens: {
    AccessToken: string;
    IdToken: string;
    RefreshToken: string;
    ExpiresIn: number;
  };
}

export interface GetProfileResponseDto {
  id: string;
  email: string;
  name: string;
  groups: string;
  tokenUse: string;
  authTime: number;
  exp: number;
}

export interface EditProfileResponseDto {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    isOnboarded: boolean;
  };
}

export interface ErrorResponseDto {
  error: string;
  message: string;
}
