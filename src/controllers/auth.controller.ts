import { JsonController, Post, Body, HttpCode } from 'routing-controllers';
import { SignInOrRegisterDto } from '../dtos/auth.dto';
import { authService } from '../services/auth.service';


@JsonController('/auth')
export class AuthController {
 
    @Post('/')
    @HttpCode(200)
    async signInOrRegister(@Body() data: SignInOrRegisterDto) {
        const result = await authService.signInOrRegister(
            data.email,
            data.password,
            data.name
        );

        return {
            message: result.isNewUser ? 'Registration successful' : 'Login successful',
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: result.user.role,
                isOnboarded: result.user.isOnboarded,
            },
            tokens: result.tokens,
        };
    }
}