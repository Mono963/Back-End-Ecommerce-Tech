import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import juice from 'juice';
import {
  buildWelcomeNewsletterHtml,
  buildMonthlyNewsletterHtml,
  buildPromoNewsletterHtml,
  buildCustomCampaignNewsletterHtml,
} from '../newsLetters/templates/newsletter-templates';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly adminEmail: string;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;

  constructor(private configService: ConfigService) {
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'worldassemblytechnolog@gmail.com';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  /**
   * Inyecta variables comunes (frontendUrl, supportLink) en todos los templates
   */
  private enrichContext(context: Record<string, any>): Record<string, any> {
    return {
      ...context,
      frontendUrl: this.frontendUrl,
      supportLink: `${this.frontendUrl}/contacto`,
    };
  }

  private async getStripoTemplateHtml(templateName: string, context: Record<string, any>): Promise<string> {
    const safeName = path.basename(templateName);
    if (safeName !== templateName || templateName.includes('..')) {
      throw new InternalServerErrorException(`Invalid template name: ${templateName}`);
    }

    const templatePath = path.resolve(process.cwd(), 'dist', 'modules', 'mail', 'templates', safeName);

    let templateSource: string;
    try {
      templateSource = await fs.promises.readFile(templatePath, 'utf8');
    } catch (error) {
      this.logger.log(`Error reading template file ${templatePath}:`, error);
      throw new InternalServerErrorException(`Failed to load email template: ${templateName}`);
    }

    const template = Handlebars.compile(templateSource);
    const enrichedContext = this.enrichContext(context);
    const renderedHtml = template(enrichedContext);
    return renderedHtml;
  }

  async sendMail(
    to: string,
    subject: string,
    textAlt: string,
    templateFileName: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      const emailFrom = `"${this.configService.get('EMAIL_FROM_NAME')}" <${this.configService.get('EMAIL_FROM')}>`;
      const rawHtml = await this.getStripoTemplateHtml(templateFileName, context);
      const inlinedHtml = juice(rawHtml);
      await this.transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html: inlinedHtml,
        text: textAlt,
      });

      this.logger.log(`Email sent to ${to}: "${subject}" using template "${templateFileName}"`);
    } catch (error) {
      this.logger.log('Error sending email:', error);
      throw new InternalServerErrorException('Error sending email.');
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const subject = '¡Bienvenido a WorldAssemblyTechnology!';
    const textAlt = `Hola ${userName},\n\nGracias por registrarte. ¡Esperamos que disfrutes!\n\nWorldAssemblyTechnology.`;

    const context = {
      userName,
      appName: 'WAT',
      appLink: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001',
    };

    await this.sendMail(userEmail, subject, textAlt, 'welcome-email.html', context);
  }

  async sendLoginNotification(userEmail: string, userName: string): Promise<void> {
    const subject = 'Inicio de Sesión en tu Cuenta';
    const textAlt = `Hola ${userName},\n\nSe ha iniciado sesión en tu cuenta.\n\nSi no fuiste tú, contactá a soporte.\n\nWorldAssemblyTechnology.`;

    const context = {
      userName,
      appName: 'WAT',
      supportLink: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/contacto`,
    };

    await this.sendMail(userEmail, subject, textAlt, 'login-notification.html', context);
  }
  async sendOrderProcessingNotification(
    userEmail: string,
    userName: string,
    orderNumber: string,
    products: { name: string; quantity: number; price: number }[],
    subtotal: number,
    shipping: number,
    tax: number,
    total: number,
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    } | null,
    paymentMethod: string,
    orderDate: Date,
  ): Promise<void> {
    const subject = 'Tu Orden Está en Proceso';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Tu orden #${orderNumber} está siendo procesada.\n` +
      `Total: $${total}\n\n` +
      `Saludos,\nWorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      appName: 'WAT',
      products,
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      orderDate: orderDate.toLocaleDateString('es-AR'),
    };

    await this.sendMail(userEmail, subject, textAlt, 'order-processing.html', context);
  }
  async sendUserDataChangedNotification(userEmail: string, userName: string): Promise<void> {
    const subject = 'Tus Datos Personales Han Sido Modificados';
    const textAlt = `Hola ${userName},\n\nSe han modificado los datos de tu cuenta.\n\nSi no fuiste vos, contactá al equipo de soporte inmediatamente.\n\nWorldAssemblyTechnology.`;

    const context = {
      userName,
      appName: 'WAT',
      supportLink: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/contacto`,
    };

    await this.sendMail(userEmail, subject, textAlt, 'data-changed.html', context);
  }
  async sendContactConfirmation(email: string, name: string, reason: string): Promise<void> {
    const subject = 'Consulta recibida - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${name},\n\n` +
      `Recibimos tu consulta correctamente.\n` +
      `En breve el equipo se pondrá en contacto con vos.\n\n` +
      `¡Gracias por comunicarte con WorldAssemblyTechnology!`;

    const context = {
      name,
      email,
      reason,
      appName: 'WAT',
      supportLink: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/contacto`,
    };

    await this.sendMail(email, subject, textAlt, 'contact-info.html', context);
  }
  async sendContactNotificationToAdmin(name: string, email: string, phone: string, reason: string): Promise<void> {
    const subject = 'Nueva consulta desde el sitio web';
    const textAlt = `Nombre: ${name}\n` + `Email: ${email}\n` + `Teléfono: ${phone}\n` + `Motivo: ${reason}`;

    const context = {
      name,
      email,
      phone,
      reason,
      appName: 'WAT',
    };

    await this.sendMail(this.adminEmail, subject, textAlt, 'contact-admin.html', context);
  }
  async sendPurchaseConfirmation(
    email: string,
    userName: string,
    orderNumber: string,
    products: { name: string; quantity: number; price: number }[],
    subtotal: number,
    shipping: number,
    tax: number,
    total: number,
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    } | null,
    paymentMethod: string,
    orderDate: Date,
  ): Promise<void> {
    const subject = '¡Gracias por tu compra en WorldAssemblyTechnology!';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Gracias por tu compra. Tu orden #${orderNumber} ha sido confirmada.\n` +
      `Total: $${total}\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      products,
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      orderDate: orderDate.toLocaleDateString('es-AR'),
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'purchase-confirmation.html', context);
  }
  async sendPurchaseAlertToAdmin(
    userName: string,
    userEmail: string,
    orderId: string,
    orderTotal: number,
    orderDate: Date,
  ): Promise<void> {
    const subject = 'Nueva compra realizada en WorldAssemblyTechnology';

    const textAlt =
      `Hola equipo,\n\nSe ha realizado una nueva compra por parte de ${userName}.\n\n` +
      `Email: ${userEmail}\n` +
      `Orden ID: ${orderId}\n` +
      `Total: $${orderTotal}\n` +
      `Fecha: ${orderDate.toLocaleDateString()}\n\nRevisar sistema.\n\nGracias,\nWorldAssemblyTechnology`;

    const context = {
      userName,
      userEmail,
      orderId,
      orderTotal,
      orderDate: orderDate.toLocaleDateString(),
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(this.adminEmail, subject, textAlt, 'purchase-confirmation-admin.html', context);
  }
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<void> {
    const subject = 'Restablece tu contraseña - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${name},\n\n` +
      `Recibimos una solicitud para restablecer tu contraseña.\n` +
      `Podés hacerlo haciendo clic en el siguiente enlace:\n\n` +
      `Si no realizaste esta solicitud, podés ignorar este mensaje.\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      name,
      resetUrl,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'changed-password.html', context);
  }
  async sendPasswordChangedConfirmationEmail(email: string, name: string): Promise<void> {
    const subject = 'Confirmación: Tu Contraseña ha Cambiado - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${name},\n\n` +
      `Te confirmamos que tu contraseña en WorldAssemblyTechnology ha sido cambiada correctamente.\n\n` +
      `Si no realizaste este cambio, te recomendamos contactar a nuestro equipo de soporte inmediatamente.\n\n` +
      `Gracias por confiar en nosotros.\n\n` +
      `Saludos cordiales,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      name,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'confirm-password-changed.html', context);
  }
  async sendAccountDeletedNotification(userEmail: string, userName: string): Promise<void> {
    const subject = 'Tu cuenta ha sido desactivada';
    const textAlt = `Hola ${userName},\n\nTu cuenta en WorldAssemblyTechnology ha sido desactivada.\n\nSi esto fue un error, contactá al soporte.`;

    const context = {
      userName,
      appName: 'WorldAssemblyTechnology',
      supportLink: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/contacto`,
    };

    await this.sendMail(userEmail, subject, textAlt, 'user-blocked.html', context);
  }
  async sendPaymentPendingEmail(email: string, userName: string): Promise<void> {
    const subject = 'Pago pendiente - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Tu intento de pago se encuentra pendiente.\n` +
      `Esto puede deberse a que el pago está siendo procesado o a una demora por parte del proveedor.\n\n` +
      `Podés verificar el estado en tu perfil o contactarnos si tenés dudas.\n\n` +
      `Gracias por tu compra.\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'payment-pending.html', context);
  }
  async sendPaymentRejectedEmail(email: string, userName: string): Promise<void> {
    const subject = 'Pago rechazado - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Lamentamos informarte que tu intento de pago fue rechazado.\n\n` +
      `Te sugerimos intentar nuevamente con otro medio de pago o comunicarte con soporte si el problema persiste.\n\n` +
      `Gracias por tu comprensión.\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'payment-rejected.html', context);
  }

  // ==================== NUEVOS TEMPLATES DE ORDEN ====================

  async sendOrderShippedEmail(
    email: string,
    userName: string,
    orderNumber: string,
    trackingNumber: string,
    trackingUrl: string,
    carrier: string,
    estimatedDelivery: string,
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    },
    products: { name: string; quantity: number; price: number }[],
    orderTotal: number,
  ): Promise<void> {
    const subject = '¡Tu pedido está en camino! - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Tu pedido #${orderNumber} ha sido enviado.\n` +
      `Número de seguimiento: ${trackingNumber}\n` +
      `Empresa de envío: ${carrier}\n` +
      `Entrega estimada: ${estimatedDelivery}\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      trackingNumber,
      trackingUrl,
      carrier,
      estimatedDelivery,
      shippingAddress,
      products,
      orderTotal,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'order-shipped.html', context);
  }

  async sendOrderDeliveredEmail(
    email: string,
    userName: string,
    orderNumber: string,
    deliveryDate: string,
    products: { name: string; quantity: number; price: number }[],
    reviewUrl: string,
  ): Promise<void> {
    const subject = '¡Tu pedido fue entregado! - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Tu pedido #${orderNumber} fue entregado el ${deliveryDate}.\n\n` +
      `Esperamos que disfrutes tu compra.\n` +
      `Si querés dejarnos tu opinión, visitá: ${reviewUrl}\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      deliveryDate,
      products,
      reviewUrl,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'order-delivered.html', context);
  }

  async sendOrderCancelledEmail(
    email: string,
    userName: string,
    orderNumber: string,
    cancellationReason: string | null,
    products: { name: string; quantity: number; price: number }[],
    orderTotal: number,
    refundStatus: string | null,
  ): Promise<void> {
    const subject = 'Tu orden ha sido cancelada - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Lamentamos informarte que tu orden #${orderNumber} ha sido cancelada.\n${
        cancellationReason ? `Motivo: ${cancellationReason}\n` : ''
      }${refundStatus ? `Estado del reembolso: ${refundStatus}\n` : ''}\nSi tenés alguna consulta, contactanos.\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      cancellationReason,
      products,
      orderTotal,
      refundStatus,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'order-cancelled.html', context);
  }

  async sendRefundProcessedEmail(
    email: string,
    userName: string,
    orderNumber: string,
    refundAmount: number,
    refundMethod: string,
    estimatedDays: number | null,
    refundId: string | null,
  ): Promise<void> {
    const subject = 'Tu reembolso ha sido procesado - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Te confirmamos que el reembolso de tu orden #${orderNumber} ha sido procesado.\n` +
      `Monto: $${refundAmount}\n` +
      `Método: ${refundMethod}\n${
        estimatedDays ? `Tiempo estimado: ${estimatedDays} días hábiles\n` : ''
      }\nSaludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      refundAmount,
      refundMethod,
      estimatedDays,
      refundId,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'refund-processed.html', context);
  }

  async sendAbandonedCartEmail(
    email: string,
    userName: string,
    cartItems: {
      productName: string;
      productImage: string | null;
      quantity: number;
      price: number;
    }[],
    cartTotal: number,
    cartUrl: string,
    discountCode?: string,
  ): Promise<void> {
    const subject = '¡Olvidaste algo en tu carrito! - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Notamos que dejaste algunos productos en tu carrito.\n` +
      `No te los pierdas, completá tu compra en: ${cartUrl}\n\n${
        discountCode ? `Usá el código ${discountCode} para obtener un descuento.\n\n` : ''
      }Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      cartItems,
      cartTotal,
      cartUrl,
      discountCode,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'abandoned-cart.html', context);
  }

  async sendReviewRequestEmail(
    email: string,
    userName: string,
    orderNumber: string,
    products: {
      productName: string;
      productImage: string | null;
      reviewUrl: string;
    }[],
    reviewUrl: string,
  ): Promise<void> {
    const subject = '¿Qué te pareció tu compra? - WorldAssemblyTechnology';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Esperamos que estés disfrutando tus productos de la orden #${orderNumber}.\n` +
      `Tu opinión nos ayuda a mejorar. Dejá tu review en: ${reviewUrl}\n\n` +
      `Saludos,\nEl equipo de WorldAssemblyTechnology.`;

    const context = {
      userName,
      orderNumber,
      products,
      reviewUrl,
      appName: 'WorldAssemblyTechnology',
    };

    await this.sendMail(email, subject, textAlt, 'review-request.html', context);
  }

  // ==================== NEWSLETTER METHODS ====================

  private embedTrackingPixel(html: string, trackingId?: string): string {
    if (!trackingId) return html;
    const pixelUrl = `${this.backendUrl}/newsletter/track/open/${trackingId}`;
    return html.replace('</body>', `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" /></body>`);
  }

  private wrapLinksForTracking(html: string, trackingId?: string): string {
    if (!trackingId) return html;
    const trackClickBase = `${this.backendUrl}/newsletter/track/click/${trackingId}`;
    return html.replace(/<a\s([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, href: string, after) => {
      if (
        href.startsWith('mailto:') ||
        href.includes('/newsletter/unsubscribe') ||
        href.includes('/newsletter/track/')
      ) {
        return match;
      }
      const trackedHref = `${trackClickBase}?url=${encodeURIComponent(href)}`;
      return `<a ${before}href="${trackedHref}"${after}>`;
    });
  }

  async sendNewsletterWelcome(
    email: string,
    userName: string,
    unsubscribeUrl?: string,
    trackingId?: string,
  ): Promise<void> {
    const subject = '🤖 ¡Tu newsletter de bienvenida!';
    const rawHtml = buildWelcomeNewsletterHtml(userName, this.frontendUrl, unsubscribeUrl);
    const withPixel = this.embedTrackingPixel(rawHtml, trackingId);
    const html = this.wrapLinksForTracking(withPixel, trackingId);

    try {
      const emailFrom = `"${this.configService.get('EMAIL_FROM_NAME')}" <${this.configService.get('EMAIL_FROM')}>`;
      await this.transporter.sendMail({
        from: emailFrom,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Newsletter welcome sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Error sending newsletter welcome to ${email}: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendNewsletterMonthly(
    email: string,
    userName: string,
    unsubscribeUrl?: string,
    trackingId?: string,
  ): Promise<void> {
    const subject = '💻 Tu newsletter mensual - WAT';
    const rawHtml = buildMonthlyNewsletterHtml(userName, this.frontendUrl, unsubscribeUrl);
    const withPixel = this.embedTrackingPixel(rawHtml, trackingId);
    const html = this.wrapLinksForTracking(withPixel, trackingId);

    try {
      const emailFrom = `"${this.configService.get('EMAIL_FROM_NAME')}" <${this.configService.get('EMAIL_FROM')}>`;
      await this.transporter.sendMail({
        from: emailFrom,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Newsletter monthly sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Error sending newsletter monthly to ${email}: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendNewsletterPromo(
    email: string,
    userName: string,
    unsubscribeUrl?: string,
    title?: string,
    description?: string,
    discountCode?: string,
    trackingId?: string,
  ): Promise<void> {
    const subject = '🎉 💻 ¡Oferta Especial para vos! - WAT';
    const rawHtml = buildPromoNewsletterHtml(
      userName,
      this.frontendUrl,
      title || 'Promoción Especial',
      description || 'Tenemos ofertas exclusivas esperándote.',
      discountCode,
      unsubscribeUrl,
    );
    const withPixel = this.embedTrackingPixel(rawHtml, trackingId);
    const html = this.wrapLinksForTracking(withPixel, trackingId);

    try {
      const emailFrom = `"${this.configService.get('EMAIL_FROM_NAME')}" <${this.configService.get('EMAIL_FROM')}>`;
      await this.transporter.sendMail({
        from: emailFrom,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Newsletter promo sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Error sending newsletter promo to ${email}: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendCustomCampaignNewsletter(
    email: string,
    userName: string,
    unsubscribeUrl?: string,
    campaignData?: {
      subject: string;
      title: string;
      body: string;
      discountCode?: string;
      ctaText: string;
      ctaUrl: string;
      featuredProducts: Array<{
        id: string;
        name: string;
        basePrice: number;
        imgUrls: string[];
        category?: { id: string; category_name: string };
      }>;
    },
    trackingId?: string,
  ): Promise<void> {
    const subject = campaignData?.subject || '📧 Novedades de WAT';
    const rawHtml = buildCustomCampaignNewsletterHtml(
      userName,
      this.frontendUrl,
      campaignData || {
        title: 'Campaña Personalizada',
        body: 'Contenido de la campaña.',
        ctaText: 'Ver Más',
        ctaUrl: '/productos',
        featuredProducts: [],
      },
      unsubscribeUrl,
    );
    const withPixel = this.embedTrackingPixel(rawHtml, trackingId);
    const html = this.wrapLinksForTracking(withPixel, trackingId);

    try {
      const emailFrom = `"${this.configService.get('EMAIL_FROM_NAME')}" <${this.configService.get('EMAIL_FROM')}>`;
      await this.transporter.sendMail({
        from: emailFrom,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Custom campaign newsletter sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Error sending custom campaign newsletter to ${email}: ${(error as Error).message}`);
      throw error;
    }
  }
}
