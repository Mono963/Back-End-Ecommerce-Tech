import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';

import { ConfigService } from '@nestjs/config';
import { buildMonthlyNewsletterHtml, buildWelcomeNewsletterHtml } from './templates/newsletter-templates';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';

interface User {
  name: string;
  email: string;
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  @Cron('0 9 1 * *', {
    name: 'monthly-newsletter',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleMonthlyNewsletter(): Promise<void> {
    this.logger.log('Starting monthly newsletter send...');

    let users: User[] = [];
    try {
      users = await this.usersRepository.find({
        select: ['name', 'email'],
      });
      this.logger.log(`Found ${users.length} users for the newsletter.`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error fetching users: ${error.message}`);
      } else {
        this.logger.error('Unknown error fetching users.');
      }
      return;
    }

    if (users.length === 0) {
      this.logger.warn('No registered users to send the newsletter.');
      return;
    }

    for (const user of users) {
      const htmlContent = buildMonthlyNewsletterHtml(user.name);

      try {
        await this.transporter.sendMail({
          to: user.email,
          from: `"" <${this.configService.get('EMAIL_USER')}>`,
          subject: '🌱 Tu newsletter mensual - WAT',
          html: htmlContent,
        });
        this.logger.log(`Monthly newsletter sent to: ${user.email}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          this.logger.error(`Error sending newsletter to ${user.email}: ${error.message}`);
        } else {
          this.logger.error(`Unknown error sending newsletter to ${user.email}`);
        }
      }
    }
    this.logger.log('Monthly newsletter send completed.');
  }

  async sendWelcomeNewsletter(user: User): Promise<void> {
    const html = buildWelcomeNewsletterHtml(user.name);

    try {
      await this.transporter.sendMail({
        to: user.email,
        from: `"WorldAssemblyTechnology WAT" <${this.configService.get('EMAIL_USER')}>`,
        subject: ' 🤖 ¡Tu newsleter de bienvenida!',
        html,
      });
      this.logger.log(`👋 Newsletter bienvenida enviada a ${user.email}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error sending welcome newsletter to ${user.email}: ${error.message}`);
      } else {
        this.logger.error(`Unknown error sending welcome newsletter to ${user.email}`);
      }
    }
  }
}
