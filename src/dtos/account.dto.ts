export interface UpdateProfileDto {
  userId?: string; 
  name?: string;   
  role?: 'user' | 'admin';  
}
export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isOnboarded: boolean;
}