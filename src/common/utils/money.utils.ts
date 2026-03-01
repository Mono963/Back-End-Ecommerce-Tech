/**
 * Redondea un valor monetario a 2 decimales de forma consistente.
 * Usar en toda operacion que involucre precios, impuestos, descuentos o totales.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
