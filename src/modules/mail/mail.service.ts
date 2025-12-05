import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import juice from 'juice';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  private async getStripoTemplateHtml(templateName: string, context: Record<string, any>): Promise<string> {
    const templatePath = path.resolve(process.cwd(), 'dist', 'modules', 'mail', 'templates', templateName);

    let templateSource: string;
    try {
      templateSource = await fs.promises.readFile(templatePath, 'utf8');
    } catch (error) {
      this.logger.log(`Error reading template file ${templatePath}:`, error);
      throw new InternalServerErrorException(`Failed to load email template: ${templateName}`);
    }

    const template = Handlebars.compile(templateSource);
    const renderedHtml = template(context);
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
      const emailFrom = `"ROOTS COOPERATIVA" <${this.configService.get<string>('EMAIL_FROM')}>`;
      const rawHtml = await this.getStripoTemplateHtml(templateFileName, context);
      const inlinedHtml = juice(rawHtml);
      this.logger.log(inlinedHtml);
      await this.transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html: inlinedHtml,
        text: textAlt,
      });

      this.logger.log(`Correo enviado a ${to}: "${subject}" usando plantilla "${templateFileName}"`);
    } catch (error) {
      this.logger.log('Error al enviar correo:', error);
      throw new InternalServerErrorException('Error al enviar el correo electrónico.');
    }
  }

  async sendAppointmentPendingNotification(
    userEmail: string,
    userName: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
  ): Promise<void> {
    const subject = 'Tu Cita está Pendiente de Aprobación';
    const textAlt = `Hola ${userName},\n\nTu cita para "${visitTitle}" el ${slotDate} a las ${slotTime} (ID: ${appointmentId}) está pendiente de aprobación.\n\nSaludos,\nROOTS COOPERATIVA.`;

    const context = {
      userName,
      visitTitle,
      slotDate,
      slotTime,
      appointmentId,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(userEmail, subject, textAlt, 'appointment-pending.html', context);
  }

  async sendAppointmentCancelledNotification(
    userEmail: string,
    userName: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
    reason?: string,
  ): Promise<void> {
    const subject = 'Tu Cita ha Sido Cancelada';
    const baseText = `Hola ${userName},\n\nTu cita para "${visitTitle}" el ${slotDate} a las ${slotTime} (ID: ${appointmentId}) ha sido cancelada.`;
    const reasonText = reason ? `\nRazón: ${reason}` : '';
    const finalTextAlt = `${baseText}${reasonText}\n\nSaludos,\nROOTS COOPERATIVA.`;

    const context = {
      userName,
      visitTitle,
      slotDate,
      slotTime,
      appointmentId,
      reason: reason || '',
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(userEmail, subject, finalTextAlt, 'appointment-cancelled.html', context);
  }
  async sendAppointmentCancelledNotificationToAdmin(
    userName: string,
    userEmail: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
    reason?: string,
  ): Promise<void> {
    const subject = 'Cita Cancelada';
    const textAlt =
      `Usuario: ${userName}\n` +
      `Email: ${userEmail}\n` +
      `Visita: ${visitTitle}\n` +
      `Fecha: ${slotDate}\n` +
      `Hora: ${slotTime}\n` +
      `ID de la cita: ${appointmentId}\n` +
      `Razón: ${reason || 'No especificada'}`;

    const context = {
      userName,
      userEmail,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
      reason: reason || 'No especificada',
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail('rootscooperativadev@gmail.com', subject, textAlt, 'appointment-cancelled-admin.html', context);
  }
  async sendAppointmentRejectedToUser(
    email: string,
    userName: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
  ): Promise<void> {
    const subject = 'Tu cita ha sido cancelada - ROOTS COOPERATIVA';

    const textAlt =
      `Hola ${userName},\n\n` +
      `Lamentamos informarte que tu cita para "${visitTitle}" ha sido cancelada por el equipo.\n\n` +
      `Fecha: ${slotDate}\nHora: ${slotTime}\nID: ${appointmentId}\n\n` +
      `Podés volver a solicitar una nueva cita desde el sitio.\n\n` +
      `Equipo de ROOTS COOPERATIVA.`;

    const context = {
      userName,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(email, subject, textAlt, 'appointment-rejected.html', context);
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const subject = '¡Bienvenido a ROOTS COOPERATIVA!';
    const textAlt = `Hola ${userName},\n\nGracias por registrarte. ¡Esperamos que disfrutes!\n\nROOTS COOPERATIVA.`;

    const context = {
      userName,
      appName: 'ROOTS COOPERATIVA',
      appLink: 'https://frontend-rootscoop.vercel.app',
    };

    await this.sendMail(userEmail, subject, textAlt, 'welcome-email.html', context);
  }

  async sendLoginNotification(userEmail: string, userName: string): Promise<void> {
    const subject = 'Inicio de Sesión en tu Cuenta';
    const textAlt = `Hola ${userName},\n\nSe ha iniciado sesión en tu cuenta.\n\nSi no fuiste tú, contactá a soporte.\n\nROOTS COOPERATIVA.`;

    const context = {
      userName,
      appName: 'ROOTS COOPERATIVA',
      supportLink: 'https://frontend-rootscoop.vercel.app/contacto',
    };

    await this.sendMail(userEmail, subject, textAlt, 'login-notification.html', context);
  }
  async sendOrderProcessingNotification(
    userEmail: string,
    userName: string,
    orderId: string,
    products: { name: string; quantity: number; price: number }[],
    orderTotal: number,
    orderDate: Date,
  ): Promise<void> {
    const subject = 'Tu Orden Está en Proceso';
    const textAlt = `Hola ${userName},\n\nTu orden #${orderId} está siendo procesada.\n\nSaludos,\nROOTS COOPERATIVA.`;

    const context = {
      userName,
      orderId,
      appName: 'ROOTS COOPERATIVA',
      products,
      orderTotal,
      orderDate: orderDate.toLocaleDateString(),
    };

    await this.sendMail(userEmail, subject, textAlt, 'order-processing.html', context);
  }
  async sendUserDataChangedNotification(userEmail: string, userName: string): Promise<void> {
    const subject = 'Tus Datos Personales Han Sido Modificados';
    const textAlt = `Hola ${userName},\n\nSe han modificado los datos de tu cuenta.\n\nSi no fuiste vos, contactá al equipo de soporte inmediatamente.\n\nROOTS COOPERATIVA.`;

    const context = {
      userName,
      appName: 'ROOTS COOPERATIVA',
      supportLink: 'https://frontend-rootscoop.vercel.app/contacto',
    };

    await this.sendMail(userEmail, subject, textAlt, 'data-changed.html', context);
  }
  async sendContactConfirmation(email: string, name: string, reason: string): Promise<void> {
    const subject = 'Consulta recibida - ROOTS COOPERATIVA';
    const textAlt =
      `Hola ${name},\n\n` +
      `Recibimos tu consulta correctamente.\n` +
      `En breve el equipo se pondrá en contacto con vos.\n\n` +
      `¡Gracias por comunicarte con ROOTS COOPERATIVA!`;

    const context = {
      name,
      email,
      reason,
      appName: 'ROOTS COOPERATIVA',
      supportLink: 'https://frontend-rootscoop.vercel.app/contacto',
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
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail('rootscooperativadev@gmail.com', subject, textAlt, 'contact-admin.html', context);
  }
  async sendPurchaseConfirmation(email: string): Promise<void> {
    const subject = '¡Gracias por tu compra en ROOTS COOPERATIVA!';
    const textAlt = `Gracias por tu compra.\n\n` + `Saludos,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      appName: 'ROOTS COOPERATIVA',
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
    const adminEmail = 'rootscooperativadev@gmail.com';
    const subject = 'Nueva compra realizada en ROOTS COOPERATIVA';

    const textAlt =
      `Hola equipo,\n\nSe ha realizado una nueva compra por parte de ${userName}.\n\n` +
      `Email: ${userEmail}\n` +
      `Orden ID: ${orderId}\n` +
      `Total: $${orderTotal}\n` +
      `Fecha: ${orderDate.toLocaleDateString()}\n\nRevisar sistema.\n\nGracias,\nROOTS COOPERATIVA`;

    const context = {
      userName,
      userEmail,
      orderId,
      orderTotal,
      orderDate: orderDate.toLocaleDateString(),
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(adminEmail, subject, textAlt, 'purchase-confirmation-admin.html', context);
  }
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<void> {
    const subject = 'Restablece tu contraseña - ROOTS COOPERATIVA';
    const textAlt =
      `Hola ${name},\n\n` +
      `Recibimos una solicitud para restablecer tu contraseña.\n` +
      `Podés hacerlo haciendo clic en el siguiente enlace:\n\n` +
      `Si no realizaste esta solicitud, podés ignorar este mensaje.\n\n` +
      `Saludos,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      name,
      resetUrl,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(email, subject, textAlt, 'changed-password.html', context);
  }
  async sendPasswordChangedConfirmationEmail(email: string, name: string): Promise<void> {
    const subject = 'Confirmación: Tu Contraseña ha Cambiado - ROOTS COOPERATIVA';
    const textAlt =
      `Hola ${name},\n\n` +
      `Te confirmamos que tu contraseña en ROOTS COOPERATIVA ha sido cambiada correctamente.\n\n` +
      `Si no realizaste este cambio, te recomendamos contactar a nuestro equipo de soporte inmediatamente.\n\n` +
      `Gracias por confiar en nosotros.\n\n` +
      `Saludos cordiales,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      name,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(email, subject, textAlt, 'confirm-password-changed.html', context);
  }
  async sendPendingAppointmentToAdmin(
    userName: string,
    userEmail: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
  ): Promise<void> {
    const subject = 'Nueva cita pendiente de aprobación';
    const textAlt =
      `Usuario: ${userName}\n` +
      `Email: ${userEmail}\n` +
      `Visita: ${visitTitle}\n` +
      `Fecha: ${slotDate}\n` +
      `Hora: ${slotTime}\n` +
      `ID de la cita: ${appointmentId}`;

    const context = {
      userName,
      userEmail,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail('rootscooperativadev@gmail.com', subject, textAlt, 'appointment-pending-admin.html', context);
  }
  async sendAccountDeletedNotification(userEmail: string, userName: string): Promise<void> {
    const subject = 'Tu cuenta ha sido desactivada';
    const textAlt = `Hola ${userName},\n\nTu cuenta en ROOTS COOPERATIVA ha sido desactivada.\n\nSi esto fue un error, contactá al soporte.`;

    const context = {
      userName,
      appName: 'ROOTS COOPERATIVA',
      supportLink: 'https://frontend-rootscoop.vercel.app/contacto',
    };

    await this.sendMail(userEmail, subject, textAlt, 'user-blocked.html', context);
  }
  async sendDonationThanks(userEmail: string): Promise<void> {
    const subject = '¡Gracias por tu generosa donación a ROOTS COOPERATIVA!';
    const textAlt = `Hola!,\n\nQueremos agradecerte de corazón por tu reciente donación a ROOTS COOPERATIVA. Tu generosidad es fundamental para nuestra misión y nos permite seguir trabajando.\n\nCon gratitud,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      userEmail,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(userEmail, subject, textAlt, 'donation.html', context);
  }
  async sendDonationAlertToAdmin(name: string, amount: number, email: string, phone: number): Promise<void> {
    const adminEmail = 'rootscooperativadev@gmail.com';
    const subject = 'Nueva donación recibida en ROOTS COOPERATIVA';
    const textAlt = `Hola equipo ROOTS,

Se ha recibido una nueva donación.

Donante: ${name}
Email: ${email}
Teléfono: ${phone}
Monto: $${amount}

Seguimos sumando voluntades.

- ROOTS COOPERATIVA`;

    const context = {
      name,
      amount,
      email,
      phone,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(adminEmail, subject, textAlt, 'donation-admin.html', context);
  }
  async sendAppointmentApprovedEmail(
    email: string,
    userName: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
    appointmentId: string,
  ): Promise<void> {
    const subject = '¡Tu cita ha sido aprobada! - ROOTS COOPERATIVA';

    const textAlt =
      `Hola ${userName},\n\n` +
      `Tu cita para "${visitTitle}" ha sido aprobada.\n\n` +
      `Fecha: ${slotDate}\nHora: ${slotTime}\nID de la cita: ${appointmentId}\n\n` +
      `Te esperamos. Si necesitás modificar o cancelar tu cita, podés hacerlo desde tu perfil o escribiéndonos.\n\n` +
      `Saludos cordiales,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      userName,
      visitTitle,
      slotDate,
      slotTime,
      appointmentId,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(email, subject, textAlt, 'appointment-approved.html', context);
  }
  async sendPaymentPendingEmail(email: string, userName: string): Promise<void> {
    const subject = 'Pago pendiente - ROOTS COOPERATIVA';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Tu intento de pago se encuentra pendiente.\n` +
      `Esto puede deberse a que el pago está siendo procesado o a una demora por parte del proveedor.\n\n` +
      `Podés verificar el estado en tu perfil o contactarnos si tenés dudas.\n\n` +
      `Gracias por tu compra.\n\n` +
      `Saludos,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      userName,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(email, subject, textAlt, 'payment-pending.html', context);
  }
  async sendPaymentRejectedEmail(email: string, userName: string): Promise<void> {
    const subject = 'Pago rechazado - ROOTS COOPERATIVA';
    const textAlt =
      `Hola ${userName},\n\n` +
      `Lamentamos informarte que tu intento de pago fue rechazado.\n\n` +
      `Te sugerimos intentar nuevamente con otro medio de pago o comunicarte con soporte si el problema persiste.\n\n` +
      `Gracias por tu comprensión.\n\n` +
      `Saludos,\nEl equipo de ROOTS COOPERATIVA.`;

    const context = {
      userName,
      appName: 'ROOTS COOPERATIVA',
    };

    await this.sendMail(email, subject, textAlt, 'payment-rejected.html', context);
  }
}
