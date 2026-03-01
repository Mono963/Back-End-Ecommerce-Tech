import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact-dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit contact form' })
  @ApiResponse({ status: 201, description: 'Message sent.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data in the form',
  })
  async submitContactForm(@Body() contactDto: ContactDto): Promise<{ message: string }> {
    await this.contactService.handleContactForm(contactDto);
    return { message: 'Message sent' };
  }
}
