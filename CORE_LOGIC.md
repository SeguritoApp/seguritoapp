# 🧠 CORE_LOGIC - Sistema de Planes y Seguridad

## 1. DEFINICIÓN DE PLANES (Precios en CLP)
- **FREE ($0):** - Límite: 3 PDFs mensuales.
    - Restricción: Marca de agua obligatoria "Generado por Segurito".
    - Historial: Máximo 5 registros en `miper.ts`.
- **PRO ($4.800/mes):** - Límite: 30 PDFs mensuales.
    - Restricción: Sin marca de agua.
    - Historial: Máximo 50 registros.
- **FULL ($8.900/mes):** - Límite: Ilimitado.
    - Restricción: Sin marca de agua, funciones avanzadas desbloqueadas.

## 2. ESQUEMA DE DATOS (Firestore - /users/{uid})
Para no romper el login de Gmail actual, se **extenderá** el documento del usuario con estos campos:
```json
{
  "subscriptionType": "free" | "pro" | "full",
  "pdfCount": number,
  "lastReset": timestamp,
  "isPremium": boolean,
  "flowOrderId": string (referencia al último pago exitoso)
}