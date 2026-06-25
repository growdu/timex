import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/user.entity';
import { License } from '../license/license.entity';
import { PlanType, LicenseStatus } from '../license/license.enums';
import { Device } from '../devices/device.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import {
  JwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(License)
    private licensesRepository: Repository<License>,
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.usersRepository.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      nickname: dto.nickname,
      isTrialActive: true,
      trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    await this.usersRepository.save(user);

    // Create trial license for new user
    const trialLicense = this.licensesRepository.create({
      userId: user.id,
      licenseKey: `TRIAL-${uuidv4().toUpperCase()}`,
      planType: PlanType.TRIAL,
      status: LicenseStatus.ACTIVE,
      deviceLimit: 1,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    await this.licensesRepository.save(trialLicense);

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<{
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return await this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      isTrialActive: user.isTrialActive,
      trialExpiresAt: user.trialExpiresAt,
      createdAt: user.createdAt,
    };
  }
}
