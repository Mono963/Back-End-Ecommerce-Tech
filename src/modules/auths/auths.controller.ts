import { Body, Controller, Get, Post, Req, Res, UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { AuthsService } from './auths.service';
import { AuthExceptionFilter } from './validate/auth.filter';
import { AuthResponse } from './interface/IAuth.interface';
import { CreateUserDto, LoginUserDto } from '../users/dtos/CreateUserDto';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { GoogleUserDto } from './dtos/auth.dto';

interface AuthenticatedRequest extends Request {
  user: GoogleUserDto;
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
  @Post('singin/user')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async signInUser(@Body() credentials: LoginUserDto): Promise<AuthResponse> {
    const { email, password } = credentials;
    return await this.authService.signIn(email, password);
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
  @Post('singup')
  async signUp(@Body() newUser: CreateUserDto): Promise<UserResponseDto> {
    return await this.authService.signup(newUser);
  }

  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @SkipThrottle()
  @UseGuards(PassportAuthGuard('google'))
  @Get('google')
  async googleAuth(): Promise<void> {
    // Handled by PassportAuthGuard
  }

  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @SkipThrottle()
  @UseFilters(AuthExceptionFilter)
  @UseGuards(PassportAuthGuard('google'))
  @Get('google/callback')
  async googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
    const redirectUrl = await this.authService.processGoogleCallback(req.user);
    res.redirect(redirectUrl);
  }

  @ApiOperation({ summary: 'Exchange authorization code for access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Authorization code from OAuth redirect' },
      },
      required: ['code'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token exchanged successfully. Access token set in HttpOnly cookie.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired authorization code',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('exchange-code')
  async exchangeCode(@Body('code') code: string): Promise<{ accessToken: string; userId: string; success: boolean }> {
    const tokenData = await this.authService.exchangeAuthCode(code);
    return {
      accessToken: tokenData.accessToken,
      userId: tokenData.userId,
      success: true,
    };
  }

  @ApiOperation({ summary: 'Logout user by clearing access token cookie' })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
  })
  @SkipThrottle()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: boolean } {
    res.clearCookie('access_token', this.authService.getCookieOptions());
    return { success: true };
  }
}
