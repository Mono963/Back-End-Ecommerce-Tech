import { Body, Controller, Get, Post, Req, Res, UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { AuthsService } from './auths.service';
import { AuthExceptionFilter } from './validate/auth.filter';
import { AuthResponse, GoogleUser } from './interface/IAuth.interface';
import { CreateUserDto, LoginUserDto } from '../users/Dtos/CreateUserDto';
import { ResponseUserDto } from '../users/interface/IUserResponseDto';

interface AuthenticatedRequest extends Request {
  user: GoogleUser;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthsController {
  constructor(
    private readonly authService: AuthsService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Sign in as user/client (optimized)' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: 'User signed in successfully',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signin/user')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async signinUser(@Body() credentials: LoginUserDto): Promise<AuthResponse> {
    const { email, password } = credentials;
    return await this.authService.singin(email, password);
  }

  @ApiOperation({ summary: 'Sign up new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user data or email already exists',
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @Post('signup')
  async signup(@Body() newUser: CreateUserDto): Promise<ResponseUserDto> {
    if (!newUser || typeof newUser !== 'object') {
      throw new Error('Invalid user data format');
    }

    return await this.authService.signup(newUser);
  }

  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @SkipThrottle()
  @UseGuards(PassportAuthGuard('google'))
  @Get('google')
  async googleAuth(): Promise<void> {
    // PassportAuthGuard maneja esto
  }

  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @SkipThrottle()
  @UseFilters(AuthExceptionFilter)
  @UseGuards(PassportAuthGuard('google'))
  @Get('google/callback')
  async googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
    const googleUser = req.user;
    const frontendUrl = this.configService.get<string>('GoogleOAuth.frontendUrl');

    const result = await this.authService.googleLogin(googleUser);
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}&userId=${result.user.id}`);
  }
}
