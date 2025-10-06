# Project Structure Documentation

## Overview

Este documento descreve a arquitetura e organização do código do projeto **Caveo**, explicando padrões arquiteturais, estrutura de pastas e convenções utilizadas.

## Architecture Overview

```
Caveo API Architecture
├── Controllers (HTTP Layer)
├── Services (Business Logic)  
├── Entities (Data Layer)
├── Middlewares (Cross-cutting)
└── DTOs (Data Transfer Objects)
```

### Design Patterns
- **MVC Pattern**: Controllers → Services → Entities
- **Dependency Injection**: TypeDI container
- **Repository Pattern**: TypeORM repositories
- **Decorator Pattern**: routing-controllers annotations
- **Middleware Pattern**: Koa middleware stack

---

## Folder Structure

```
src/
├── app.ts                      # Application entry point
├── config/                     # Configuration files
│   ├── database.ts            # Database connection
│   └── swagger.ts             # OpenAPI specification
├── controllers/                # HTTP endpoints
│   ├── account.controller.ts  # Profile management
│   ├── auth.controller.ts     # Authentication
│   └── user.controller.ts     # User management (admin)
├── dtos/                      # Data Transfer Objects
│   ├── request.dto.ts         # Request schemas
│   └── response.dto.ts        # Response schemas
├── entities/                  # Database entities
│   └── user.entity.ts        # User table definition
├── helpers/                   # Utility functions
│   ├── jwt.helper.ts         # JWT utilities
│   ├── logger.ts             # Pino logger setup
│   └── utils.ts              # Common utilities
├── middlewares/               # Request interceptors
│   ├── auth.middleware.ts    # JWT validation
│   ├── error.middleware.ts   # Error handling
│   └── role.middleware.ts    # Role-based access
├── services/                  # Business logic
│   ├── account.service.ts    # Profile operations
│   ├── auth.service.ts       # Authentication logic
│   └── cognito.service.ts    # AWS Cognito integration
└── types/                     # TypeScript definitions
    └── index.ts              # Global type definitions
```

---

## Application Bootstrap

### Entry Point (`app.ts`)

```typescript
import 'reflect-metadata';
import Koa from 'koa';
import { useKoaServer } from 'routing-controllers';
import { Container } from 'typedi';

// Initialize Koa application
const app = new Koa();

// Setup routing-controllers with TypeDI
useKoaServer(app, {
  controllers: [AuthController, AccountController, UsersController],
  middlewares: [ErrorMiddleware],
  container: Container,
  routePrefix: '/api/v1',
});

// Database connection
await dataSource.initialize();

// Start server
app.listen(PORT);
```

### Key Features
- **ESM Modules**: Pure ES6 imports/exports
- **TypeDI**: Dependency injection container
- **Routing Controllers**: Decorator-based routing
- **Swagger**: Auto-generated API documentation
- **Error Handling**: Global error middleware
- **Logging**: Structured logging with Pino

---

## Controllers Layer

### Authentication Controller (`auth.controller.ts`)

```typescript
@JsonController('/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {}

  @Post('/signin-or-register')
  @OpenAPI({ summary: 'Sign in or register user' })
  async signInOrRegister(@Body() request: SignInRequest): Promise<AuthResponse> {
    // 1. Authenticate with Cognito
    const cognitoResult = await this.authService.signInOrRegister(request);
    
    // 2. Create/update user in database
    const user = await this.userService.createOrUpdate(cognitoResult.user);
    
    // 3. Return tokens + user data
    return this.authService.buildAuthResponse(cognitoResult, user);
  }
}
```

### Account Controller (`account.controller.ts`)

```typescript
@JsonController('/account')
@UseBefore(authMiddleware) // Protected routes
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Get('/me')
  @OpenAPI({ summary: 'Get current user profile' })
  async getProfile(@Ctx() ctx: Context): Promise<UserProfileResponse> {
    const userId = ctx.state.user.id;
    return this.accountService.getProfile(userId);
  }

  @Put('/edit-account')  
  @OpenAPI({ summary: 'Update user profile' })
  async updateProfile(
    @Ctx() ctx: Context,
    @Body() request: UpdateProfileRequest
  ): Promise<UserProfileResponse> {
    const { user } = ctx.state;
    
    // Role-based field validation
    const allowedFields = user.role === 'admin' 
      ? ['name', 'role'] 
      : ['name'];
      
    return this.accountService.updateProfile(
      user.id, 
      request.name, 
      request.role,
      allowedFields
    );
  }
}
```

### User Management Controller (`user.controller.ts`)

```typescript
@JsonController('/users')
@UseBefore(authMiddleware, roleMiddleware('admin')) // Admin only
export class UsersController {
  constructor(private userRepository: Repository<UserEntity>) {}

  @Get('/')
  @OpenAPI({ summary: 'List all users (admin only)' })
  async getAll(): Promise<UserEntity[]> {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role', 'isOnboarded', 'createdAt']
    });
  }
}
```

---

## Services Layer

### Account Service (`account.service.ts`)

```typescript
@Service()
export class AccountService {
  constructor(
    private userRepository: Repository<UserEntity>,
    private cognitoService: CognitoService,
    private logger: Logger
  ) {}

  async updateProfile(
    userId: string,
    name?: string,
    role?: string,
    allowedFields: string[] = ['name']
  ): Promise<UserProfileResponse> {
    // 1. Find user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    // 2. Apply changes based on permissions
    const changes: string[] = [];
    
    if (name && allowedFields.includes('name')) {
      user.name = name;
      user.isOnboarded = true; // Mark as onboarded when name is updated
      changes.push('name');
    }
    
    if (role && allowedFields.includes('role')) {
      user.role = role;
      changes.push('role');
    }

    // 3. Save to database
    await this.userRepository.save(user);

    // 4. Sync with Cognito (non-blocking)
    this.syncCognitoAttributes(user).catch(error => {
      this.logger.warn('Cognito attributes sync failed', { error, userId });
    });

    // 5. Log and return
    this.logger.info('Profile updated', { userId, changes });
    return this.mapToResponse(user);
  }

  private mapToResponse(user: UserEntity): UserProfileResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
```

### Authentication Service (`auth.service.ts`)

```typescript
@Service()  
export class AuthService {
  constructor(private cognitoService: CognitoService) {}

  async signInOrRegister(request: SignInRequest): Promise<CognitoAuthResult> {
    try {
      // Try sign in first
      return await this.cognitoService.signIn(request.email, request.password);
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        // User doesn't exist, register them
        await this.cognitoService.signUp(request.email, request.password);
        return await this.cognitoService.signIn(request.email, request.password);
      }
      throw error;
    }
  }
}
```

---

## Data Layer

### User Entity (`user.entity.ts`)

```typescript
@Entity({ name: 'user' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  @Length(2, 100)
  name!: string;

  @Column({ unique: true })
  @IsEmail()
  email!: string;

  @Column()
  @IsIn(['admin', 'user'])
  role!: string;

  @Column({ name: 'is_onboarded', default: false })
  @IsBoolean()
  isOnboarded!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;
}
```

### Database Configuration (`config/database.ts`)

```typescript
export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [UserEntity],
  synchronize: process.env.NODE_ENV === 'development',
  logging: ['error', 'warn'],
  maxQueryExecutionTime: 1000,
});
```

---

## Middlewares

### Authentication Middleware (`auth.middleware.ts`)

```typescript
export const authMiddleware: MiddlewareInterface = {
  async use(context: Context, next: NextFunction) {
    try {
      // 1. Extract token
      const token = extractTokenFromHeader(context.headers.authorization);
      if (!token) throw new UnauthorizedError('Token required');

      // 2. Verify JWT with Cognito
      const decoded = await verifyJwtToken(token);
      
      // 3. Load user from database  
      const user = await getUserFromToken(decoded);
      if (!user) throw new UnauthorizedError('User not found');

      // 4. Attach to context
      context.state.user = user;
      context.state.token = decoded;
      
      return next();
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
};
```

### Role Middleware (`role.middleware.ts`)

```typescript
export function roleMiddleware(requiredRole: string): MiddlewareInterface {
  return {
    async use(context: Context, next: NextFunction) {
      const { user } = context.state;
      
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      if (user.role !== requiredRole) {
        throw new ForbiddenError(`${requiredRole} role required`);
      }
      
      return next();
    }
  };
}
```

---

## DTOs (Data Transfer Objects)

### Request DTOs (`dtos/request.dto.ts`)

```typescript
export class SignInRequest {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateProfileRequest {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: string;
}
```

### Response DTOs (`dtos/response.dto.ts`)

```typescript
export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  user: UserProfileResponse;
}
```

---

## Utilities & Helpers

### JWT Helper (`helpers/jwt.helper.ts`)

```typescript
export async function verifyJwtToken(token: string): Promise<JwtPayload> {
  const client = jwksClient({
    jwksUri: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
  });
  
  const key = await client.getSigningKey(getTokenHeader(token).kid);
  return jwt.verify(token, key.getPublicKey()) as JwtPayload;
}
```

### Logger (`helpers/logger.ts`)

```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});
```

---

## TypeScript Configuration

### Main Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

---

## Testing Strategy

### Test Structure
```
src/
├── controllers/__tests__/    # Integration tests
├── services/__tests__/       # Unit tests  
├── middlewares/__tests__/    # Middleware tests
├── helpers/__tests__/        # Utility tests
└── entities/__tests__/       # Entity validation tests
```

### Test Categories
- **Unit Tests**: Services, helpers, utilities (85 tests)
- **Integration Tests**: Controllers with mocked dependencies (25 tests)
- **Middleware Tests**: Auth, role, error handling (10 tests)

### Test Configuration (`jest.config.ts`)

```typescript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

## Code Conventions

### Naming Conventions
- **Files**: `kebab-case.ts` (e.g., `auth.controller.ts`)
- **Classes**: `PascalCase` (e.g., `AuthController`)
- **Methods**: `camelCase` (e.g., `signInOrRegister`)
- **Variables**: `camelCase` (e.g., `userId`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`)

### Import/Export Patterns
```typescript
// Good: Named exports for services
export class AuthService { }

// Good: Default export for single entity
export default class UserEntity { }

// Good: Index file re-exports
export { UserEntity } from './user.entity.js';
export { AccountService } from './account.service.js';
```

### Error Handling
```typescript
// Use routing-controllers error classes
throw new NotFoundError('User not found');
throw new UnauthorizedError('Invalid token');
throw new BadRequestError('Invalid input');

// Log errors with context
logger.error('Database connection failed', { error, userId });
```

---

## Development Workflow

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local

# 3. Start database
npm run docker:up

# 4. Run in development mode
npm run dev

# 5. Run tests
npm test
```

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting  
npm run format

# Type checking
npm run build
```

### Git Workflow
- **Feature branches**: `feature/user-authentication`
- **Commit messages**: `feat: add user authentication`
- **Small commits**: Single responsibility per commit
- **Tests**: Always include tests for new features

This architecture provides a solid foundation for scalable, maintainable TypeScript applications with clear separation of concerns and comprehensive testing coverage.
