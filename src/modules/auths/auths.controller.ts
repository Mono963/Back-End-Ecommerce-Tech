import { Body, Controller, Get, Post, Req, Res, UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

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

  @ApiOperation({ summary: 'Sign in user' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: 'User signed in successfully, returns access token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @Post('signin')
  async signin(@Body() credentials: LoginUserDto): Promise<AuthResponse> {
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('Invalid credentials format');
    }

    const { email, password } = credentials;

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Email and password must be strings');
    }

    return await this.authService.signin(email, password);
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
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @UseGuards(PassportAuthGuard('google'))
  @Get('google')
  async googleAuth(): Promise<void> {
    // PassportAuthGuard
  }

  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with token or error',
  })
  @UseFilters(AuthExceptionFilter)
  @UseGuards(PassportAuthGuard('google'))
  @Get('google/callback')
  async googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
    const googleUser = req.user;
    if (!googleUser || typeof googleUser !== 'object') {
      throw new Error('Invalid Google user data');
    }
    if (!googleUser.id || !googleUser.email || !googleUser.name) {
      throw new Error('Incomplete Google user profile');
    }
    const frontendUrl = this.configService.get<string>('GoogleOAuth.frontendUrl');
    if (!frontendUrl) {
      throw new Error('Frontend URL not configured');
    }
    const result = await this.authService.googleLogin(googleUser);
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}&userId=${result.user.id}`);
  }
}
