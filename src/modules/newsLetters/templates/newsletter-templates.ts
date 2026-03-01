import juice from 'juice';

// Logo WAT
const WAT_LOGO_URL =
  'https://res.cloudinary.com/dub48rf0p/image/upload/v1770006657/WorldAsseblyTechnologyPNGEmail_b6bsll.png';
/**
 * Genera el HTML de la cabecera dark tech estilo WAT
 */
function buildDarkTechHeader(): string {
  return `
    <div class="header">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="left" valign="middle" class="header-text">WorldAssemblyTechnology</td>
          <td align="right" valign="middle">
            <img
              src="${WAT_LOGO_URL}"
              alt="WAT Logo"
              style="
                max-width: 120px;
                height: auto;
                border-radius: 8px;
                filter: drop-shadow(0 0 12px rgba(0, 102, 255, 0.6)) drop-shadow(0 0 25px rgba(0, 102, 255, 0.4))
                  drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
              "
            />
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Genera el HTML del footer dark tech estilo WAT
 */
function buildDarkTechFooter(frontendUrl: string, unsubscribeUrl?: string): string {
  return `
    <div class="footer">
      <div class="footer-social">
        <p style="color: #9ca3af; margin-bottom: 12px;">Seguinos en nuestras redes:</p>
        <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer">
          <img src="https://cdn-icons-png.flaticon.com/128/3670/3670051.png" alt="WhatsApp" width="28" height="28" />
        </a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
          <img src="https://cdn-icons-png.flaticon.com/128/15707/15707749.png" alt="Instagram" width="28" height="28" />
        </a>
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
          <img src="https://cdn-icons-png.flaticon.com/128/15047/15047435.png" alt="Facebook" width="28" height="28" />
        </a>
      </div>
      <p style="color: #ffffff; font-size: 13px;">
        Copyright &copy; 2025 <strong>WorldAssemblyTechnology</strong>. Todos los derechos reservados.
      </p>
      <p style="margin-top: 12px;">
        <a href="${frontendUrl}">Visitar sitio web</a> &middot;
        <a href="${frontendUrl}/contacto">Contacto</a>
      </p>
      ${unsubscribeUrl ? `<p style="margin-top: 16px; font-size: 12px;"><a href="${unsubscribeUrl}" style="color: #9ca3af;">Darse de baja del newsletter</a></p>` : ''}
      <div class="footer-payments">
        <span>VISA</span>
        <span>MC</span>
        <span>MP</span>
      </div>
    </div>
  `;
}

/**
 * Genera los estilos CSS dark tech
 */
function buildDarkTechStyles(): string {
  return `
    <style>
      body {
        margin: 0;
        padding: 30px 10px;
        background: #111827;
        font-family:
          'Inter',
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          sans-serif;
        color: #cbd5f5;
        line-height: 1.6;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #0f172a;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      }

      .header {
        background: radial-gradient(120% 120% at 100% 0%, #1b2a4a 0%, #0f172a 55%, #0b1020 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 24px 32px;
      }

      .header table {
        width: 100%;
      }

      .header-text {
        color: #f8fafc;
        font-family: 'Inter', sans-serif;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
      }

      .header img {
        max-width: 120px;
        height: auto;
        display: block;
      }

      .content {
        padding: 40px 32px;
        background: linear-gradient(180deg, #0f172a 0%, #0b1222 100%);
      }

      .content h1 {
        font-size: 28px;
        font-weight: 700;
        color: #60a5fa;
        margin: 0 0 24px 0;
        text-align: center;
      }

      .content p {
        margin: 16px 0;
        font-size: 16px;
        font-weight: 400;
        color: #cbd5f5;
      }

      .content p strong {
        color: #f8fafc;
        font-weight: 600;
      }

      .highlight-card {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        color: #f8fafc;
        text-align: center;
      }

      .highlight-card h2 {
        margin: 0 0 12px 0;
        font-size: 20px;
        font-weight: 700;
        color: #60a5fa;
      }

      .highlight-card p {
        margin: 0;
        font-size: 14px;
        color: #cbd5e1;
      }

      .benefits-list {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
      }

      .benefits-list h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #f8fafc;
      }

      .benefits-list ul {
        margin: 0;
        padding-left: 20px;
      }

      .benefits-list li {
        margin-bottom: 8px;
        font-size: 14px;
        color: #cbd5e1;
      }

      .btn-main {
        display: inline-block;
        margin: 24px 0;
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        color: #ffffff !important;
        padding: 14px 32px;
        border-radius: 10px;
        text-decoration: none !important;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
      }

      .product-grid {
        margin: 24px 0;
      }

      .product-item {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        text-align: center;
      }

      .product-item img {
        width: 100%;
        max-width: 200px;
        height: 150px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 12px;
      }

      .product-item h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #f8fafc;
      }

      .product-item p {
        color: #9ca3af;
        margin: 4px 0;
        font-size: 12px;
      }

      .product-item .price {
        font-family: 'Courier New', monospace;
        font-size: 18px;
        font-weight: 700;
        color: #60a5fa;
      }

      .product-item a {
        color: inherit;
        text-decoration: none;
      }

      .tech-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        color: #cbd5e1;
      }

      .tech-card h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #f8fafc;
      }

      .tech-card p {
        margin: 0;
        font-size: 14px;
        color: #cbd5e1;
      }

      .footer {
        background: radial-gradient(120% 120% at 100% 0%, #1b2a4a 0%, #0f172a 55%, #0b1020 100%);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        color: #9ca3af;
        text-align: center;
        padding: 32px;
        font-size: 14px;
      }

      .footer-social {
        margin-bottom: 16px;
      }

      .footer-social a {
        display: inline-block;
        margin: 0 8px;
        color: #ffffff;
        text-decoration: none;
        font-size: 20px;
      }

      .footer p {
        margin: 8px 0;
        color: #cbd5e1;
      }

      .footer a {
        color: #60a5fa;
        text-decoration: none;
        font-weight: 500;
      }

      .footer-payments {
        margin-top: 16px;
      }

      .footer-payments span {
        display: inline-block;
        background: #374151;
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin: 4px;
      }

      @media screen and (max-width: 600px) {
        .header {
          padding: 20px 16px;
        }

        .header-text {
          font-size: 16px;
        }

        .header img {
          max-width: 80px;
        }

        .content {
          padding: 32px 20px;
        }

        .content h1 {
          font-size: 24px;
        }

        .btn-main {
          padding: 14px 24px;
          font-size: 16px;
        }

        .footer {
          padding: 24px 16px;
        }

        .footer-social a {
          margin: 0 6px;
        }

        .footer-payments span {
          padding: 4px 8px;
          font-size: 10px;
          margin: 2px;
        }
      }
    </style>
  `;
}

/**
 * Template base dark tech para newsletters
 */
function buildDarkTechTemplate(content: string, frontendUrl: string, unsubscribeUrl?: string): string {
  const html = `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Newsletter - WorldAssemblyTechnology</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    ${buildDarkTechStyles()}
  </head>
  <body>
    <div class="container">
      ${buildDarkTechHeader()}
      <div class="content">
        ${content}
      </div>
      ${buildDarkTechFooter(frontendUrl, unsubscribeUrl)}
    </div>
  </body>
</html>
  `;
  return juice(html);
}

/**
 * Genera el HTML del newsletter mensual con estilo dark tech
 */
export function buildMonthlyNewsletterHtml(name: string, frontendUrl: string, unsubscribeUrl?: string): string {
  const content = `
    <h1>Novedades del Mes</h1>

    <p>Hola <strong>${name}</strong>,</p>
    <p>
      Te traemos las últimas novedades de <strong>WorldAssemblyTechnology</strong>.
      Descubrí los nuevos productos, ofertas exclusivas y más.
    </p>

    <div class="highlight-card">
      <h2>Ofertas Exclusivas</h2>
      <p>Este mes tenemos descuentos especiales en productos seleccionados.</p>
    </div>

    <div class="benefits-list">
      <h3>Lo que encontrás este mes:</h3>
      <ul>
        <li>Nuevos productos tech agregados al catálogo</li>
        <li>Descuentos de hasta 30% en categorías seleccionadas</li>
        <li>Envío gratis en compras mayores a $50.000</li>
        <li>Lanzamientos exclusivos para suscriptores</li>
      </ul>
    </div>

    <div class="tech-card">
      <h3>Novedades Tech</h3>
      <p>
        Explorá las últimas incorporaciones en componentes, periféricos y accesorios
        para armar tu setup ideal.
      </p>
    </div>

    <div style="text-align: center">
      <a href="${frontendUrl}/productos" class="btn-main">Ver Productos</a>
    </div>

    <p>¡Gracias por ser parte de <strong>WorldAssemblyTechnology</strong>!</p>
    <p>El equipo de WAT.</p>
  `;

  return buildDarkTechTemplate(content, frontendUrl, unsubscribeUrl);
}

/**
 * Genera el HTML del newsletter de bienvenida con estilo dark tech
 */
export function buildWelcomeNewsletterHtml(name: string, frontendUrl: string, unsubscribeUrl?: string): string {
  const content = `
    <h1>¡Bienvenido a WAT!</h1>

    <p>Hola <strong>${name}</strong>,</p>
    <p>
      Gracias por suscribirte al newsletter de <strong>WorldAssemblyTechnology</strong>.
      Estamos felices de tenerte en nuestra comunidad tech.
    </p>

    <div class="highlight-card">
      <h2>Tu Suscripción Está Activa</h2>
      <p>A partir de ahora recibirás ofertas exclusivas, novedades y contenido especial.</p>
    </div>

    <div class="benefits-list">
      <h3>¿Qué vas a recibir?</h3>
      <ul>
        <li>Ofertas exclusivas antes que nadie</li>
        <li>Novedades de productos y lanzamientos</li>
        <li>Tips y guías de tecnología</li>
        <li>Acceso anticipado a promociones especiales</li>
      </ul>
    </div>

    <div class="tech-card">
      <h3>Empezá a Explorar</h3>
      <p>
        Visitá nuestra tienda y descubrí todo lo que tenemos para vos.
        Componentes, periféricos, accesorios y mucho más.
      </p>
    </div>

    <div style="text-align: center">
      <a href="${frontendUrl}" class="btn-main">Visitar Tienda</a>
    </div>

    <p>¡Bienvenido a la comunidad <strong>WorldAssemblyTechnology</strong>!</p>
    <p>El equipo de WAT.</p>
  `;

  return buildDarkTechTemplate(content, frontendUrl, unsubscribeUrl);
}

/**
 * Genera el HTML del newsletter promocional con estilo dark tech
 */
export function buildPromoNewsletterHtml(
  name: string,
  frontendUrl: string,
  title: string,
  description: string,
  discountCode?: string,
  unsubscribeUrl?: string,
): string {
  const content = `
    <h1>${title}</h1>

    <p>Hola <strong>${name}</strong>,</p>
    <p>${description}</p>

    ${
      discountCode
        ? `
    <div class="highlight-card">
      <h2>Código de Descuento Exclusivo</h2>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px; margin-top: 12px;">${discountCode}</p>
    </div>
    `
        : ''
    }

    <div class="tech-card">
      <h3>Aprovechá esta oportunidad</h3>
      <p>
        Visitá nuestra tienda y descubrí todas las ofertas disponibles.
        ¡No te lo pierdas!
      </p>
    </div>

    <div style="text-align: center">
      <a href="${frontendUrl}/productos" class="btn-main">Ver Ofertas</a>
    </div>

    <p>¡Gracias por ser parte de <strong>WorldAssemblyTechnology</strong>!</p>
    <p>El equipo de WAT.</p>
  `;

  return buildDarkTechTemplate(content, frontendUrl, unsubscribeUrl);
}

/**
 * Genera el HTML de confirmación de baja del newsletter
 */
export function buildUnsubscribeConfirmationHtml(email: string, frontendUrl: string, resubscribeUrl?: string): string {
  const content = `
    <h1>Te has dado de baja</h1>

    <p>Hola,</p>
    <p>
      Confirmamos que el email <strong>${email}</strong> ha sido dado de baja de nuestro newsletter.
    </p>

    <div class="tech-card">
      <h3>Lamentamos verte partir</h3>
      <p>
        Ya no recibirás más emails promocionales de nuestra parte.
        Si fue un error o cambiás de opinión, siempre podés volver a suscribirte.
      </p>
    </div>

    ${resubscribeUrl ? `<div style="text-align: center"><a href="${resubscribeUrl}" class="btn-main">Volver a Suscribirme</a></div>` : ''}

    <p>Si tenés alguna consulta, no dudes en <a href="${frontendUrl}/contacto">contactarnos</a>.</p>
    <p>El equipo de WAT.</p>
  `;

  return buildDarkTechTemplate(content, frontendUrl);
}

/**
 * Genera el HTML de campaña personalizada con productos destacados
 */
export function buildCustomCampaignNewsletterHtml(
  name: string,
  frontendUrl: string,
  campaignData: {
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
  unsubscribeUrl?: string,
): string {
  // Construir HTML de productos destacados
  const productsHtml =
    campaignData.featuredProducts.length > 0
      ? `
      <div class="product-grid">
        <h3 style="font-size: 18px; font-weight: 600; color: #f8fafc; margin-bottom: 16px;">
          Productos Destacados
        </h3>
        ${campaignData.featuredProducts
          .map(
            (product) => `
          <div class="product-item">
            <a href="${frontendUrl}/productos/${product.id}" style="text-decoration: none; color: inherit;">
              <img src="${product.imgUrls[0] || 'https://via.placeholder.com/200'}" alt="${product.name}" />
              <h4>${product.name}</h4>
              ${product.category ? `<p style="font-size: 12px; color: #9ca3af; margin: 4px 0;">${product.category.category_name}</p>` : ''}
              <p class="price">$${product.basePrice.toLocaleString('es-AR')}</p>
            </a>
          </div>
        `,
          )
          .join('')}
      </div>
    `
      : '';

  const content = `
    <h1>${campaignData.title}</h1>

    <p>Hola <strong>${name}</strong>,</p>
    <p>${campaignData.body}</p>

    ${
      campaignData.discountCode
        ? `
    <div class="highlight-card">
      <h2>Código de Descuento Exclusivo</h2>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px; margin-top: 12px;">
        ${campaignData.discountCode}
      </p>
    </div>
    `
        : ''
    }

    ${productsHtml}

    <div style="text-align: center">
      <a href="${frontendUrl}${campaignData.ctaUrl}" class="btn-main">${campaignData.ctaText}</a>
    </div>

    <p>¡Gracias por ser parte de <strong>WorldAssemblyTechnology</strong>!</p>
    <p>El equipo de WAT.</p>
  `;

  return buildDarkTechTemplate(content, frontendUrl, unsubscribeUrl);
}
