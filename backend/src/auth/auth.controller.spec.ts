import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    nickname: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isTrialActive: true,
    trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = { user: mockUser, tokens: mockTokens };

      authService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const expectedResult = { user: mockUser, tokens: mockTokens };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const refreshDto = { refreshToken: 'mock-refresh-token' };
      const expectedResult = mockTokens;

      authService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(expectedResult);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const expectedResult = mockUser;

      authService.getProfile.mockResolvedValue(expectedResult);

      const result = await controller.getProfile(mockUser as User);

      expect(result).toEqual(expectedResult);
      expect(authService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
