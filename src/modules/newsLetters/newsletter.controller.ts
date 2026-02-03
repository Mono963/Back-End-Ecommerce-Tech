import { Body, Controller, HttpStatus, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guards';

import { Roles, UserRole } from 'src/decorator/role.decorator';
import { SendWelcomeDto } from './dto/send-welcome-dto';
import { RoleGuard } from '../../guards/auth.guards.role';

@ApiTags('Newsletter')
@ApiBearerAuth()
@Controller('newsletter')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @ApiOperation({ summary: 'Send welcome newsletter to a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Welcome email sent succesfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'UNAUTHORIZED.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access FORBIDDEN (JUST ADMIN).',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('send-welcome')
  async sendWelcome(@Body() user: SendWelcomeDto): Promise<void> {
    return await this.newsletterService.sendWelcomeNewsletter(user);
  }

  @ApiOperation({ summary: 'Manually trigger monthly newsletter send' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monthly newsletter sent succesfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'UNAUTHORIZED.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access FORBIDDEN (JUST ADMIN).',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('send-monthly-manual')
  async sendMonthlyManual(): Promise<{ message: string }> {
    await this.newsletterService.handleMonthlyNewsletter();
    return { message: 'Monthly newsletter initiated manually.' };
  }
}
