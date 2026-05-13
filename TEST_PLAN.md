# Plan de Revisión Exhaustiva - Proyecto "Segurito" 🧡

Este documento detalla los pasos para realizar un control de calidad completo (QA) de la aplicación antes del paso a producción. Se recomienda probar cada sección tanto en **Escritorio** como en **Dispositivos Móviles**.

---

## 🟢 SECCIÓN 1: Autenticación y Perfil
- [ ] **Login con Google**: Verificar que el acceso sea fluido.
- [ ] **Perfil de Usuario**:
    - [ ] Actualizar nombre y cargo.
    - [ ] Subir firma (Archivo o Dibujo).
- [ ] **Plan de Suscripción**: Verificar que el estado de la suscripción se refleje en el Dashboard.

## 🏢 SECCIÓN 2: Gestión de Clientes (CRM)
- [ ] **Crear Empresa**: Verificar campos obligatorios.
- [ ] **Editar Empresa**: Cambiar nombre/RUT y guardar.
- [ ] **Eliminar Empresa**: Verificar que se elimine (o marque como eliminada).
- [ ] **Cambio de Estado**: Activar/Desactivar empresa y ver impacto en Dashboard.

## 👷 SECCIÓN 3: Gestión de Trabajadores
- [ ] **Crear Trabajador**: Ingresar datos básicos y guardar.
- [ ] **Importación Masiva (Excel/CSV)**: Subir archivo y verificar carga.
- [ ] **Registrar Siniestralidad**: 
    - [ ] Agregar accidente/enfermedad a un trabajador.
    - [ ] Verificar generación automática de reporte en Biblioteca.
- [ ] **Eliminar Trabajador**: **(Punto Crítico)** Verificar que el modal de confirmación funcione y la base de datos se actualice.

## 🚽 SECCIÓN 4: Inspecciones Sanitarias (D.S. 594)
- [ ] **Carga de Datos**: Probar el cálculo automático de requerimientos (Servicios higiénicos, duchas, etc).
- [ ] **Gestión de Extintores**: Agregar varios extintores y sus fechas de vencimiento.
- [ ] **Guardar Inspección**: **(Punto Crítico)** Verificar que se guarde el registro maestro y los metadatos del reporte.
- [ ] **Exportar PDF**: Generar el informe y verificar diseño.

## 🧯 SECCIÓN 5: Auditoría Extintores (D.S. 44)
- [ ] **Formulario Checklist**: Responder todas las preguntas.
- [ ] **Guardar Auditoría**: Verificar persistencia.
- [ ] **Exportar PDF**: Verificar que el puntaje de cumplimiento sea correcto.

## 📊 SECCIÓN 6: Matrices de Riesgo (MIPER / IPER)
- [ ] **Estructura de Matriz**: Agregar, editar y eliminar filas de peligros.
- [ ] **Cálculo de Riesgo**: Verificar que Probabilidad x Consecuencia asigne el nivel correcto.
- [ ] **Exportar PDF**: Verificar legibilidad en formato horizontal si aplica.

## 📝 SECCIÓN 7: Obligación de Informar (IRL)
- [ ] **Crear Plantilla**: Diseñar una plantilla por cargo.
- [ ] **Emitir Ticket**: Asignar plantilla a un trabajador y "Emitir".
- [ ] **Verificar Firma**: Asegurar que los datos del relator (usuario) aparezcan en el PDF.

## 🛡️ SECCIÓN 8: Gestión del Riesgo (GRD)
- [ ] **Auditoría GRD**: Responder el cuestionario completo.
- [ ] **Guardar y Finalizar**: **(Punto Crítico)** Verificar actualización de puntaje en la ficha del cliente.

## 🏥 SECCIÓN 9: Protocolos MINSAL
- [ ] **Ejecutar Protocolo**: Realizar auditoría de RUIDO, TMERT, etc.
- [ ] **Plantillas Personalizadas**: Crear un protocolo nuevo y usarlo.

## 📚 SECCIÓN 10: Biblioteca Técnica y Compendios
- [ ] **Ficha del Cliente**: Verificar descarga de cualquier documento previo.
- [ ] **Generar Compendio**: Seleccionar múltiples informes y generar un solo PDF "unificado".
- [ ] **Busqueda DIEP/DIAT**: Buscar trabajadores y generar formularios oficiales.

---

## 🛠️ NOTA SOBRE ERRORES EN MÓVIL
Si un botón falla en móvil, por favor copie el mensaje de error que aparecerá en el nuevo **Banner de Diagnóstico** que estamos implementando. 
