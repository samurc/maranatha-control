# Implementation Plan: Maranatha Control

## Overview

Este plan traduce el diseño (Clean Architecture + DDD sobre Firebase/Next.js) en pasos de código incrementales. El orden sigue estrictamente las capas: **Dominio** (puro, sin Firebase) → **Aplicación** (casos de uso y puertos) → **Infraestructura** (adaptadores Firestore/Auth/SearchChurch/Offline) → **Presentación** (Next.js/React). Cada tarea de código construye sobre la anterior; no hay código huérfano: todo componente de dominio se usa en un caso de uso, todo caso de uso se conecta a un puerto real de infraestructura, y toda infraestructura se conecta finalmente a la interfaz de usuario.

Las pruebas de propiedades (fast-check + Vitest) implementan una a una las 53 Correctness Properties del diseño y se ubican justo después de la implementación que satisfacen. Los criterios listados en "Criterios no cubiertos por Correctness Properties" del diseño se cubren aquí con pruebas de ejemplo, de rendimiento o de análisis estático, marcadas igualmente como opcionales (`*`).

Lenguaje de implementación: **TypeScript** (definido explícitamente en el diseño; no se usó pseudocódigo).

## Tasks

- [x] 1. Configurar estructura del proyecto y herramientas base
  - [x] 1.1 Crear la estructura de carpetas `domain/`, `application/{use-cases,ports,dto}/`, `infrastructure/{repositories,adapters}/`, `presentation/` según el diseño, y configurar TypeScript estricto, ESLint, Vitest y `fast-check` (integración `@fast-check/vitest`)
    - _Requirements: 19.1, 19.2, 19.3_

  - [ ]* 1.2 Configurar `dependency-cruiser` para prohibir que `domain/` importe de `infrastructure/` o `presentation/`, y verificar que los repositorios estén definidos como interfaces en `application/ports/`
    - Regla estructural ejecutada en CI, no es un test generador de datos
    - _Requirements: 19.1, 19.2_

- [x] 2. Implementar núcleo compartido de Dominio/Aplicación
  - [x] 2.1 Implementar el tipo `Result<T, DomainError>` y la taxonomía de errores {validacion, autorizacion, no_encontrado, conflicto, error_interno}
    - _Requirements: 17.4_

  - [ ]* 2.2 Escribir property test para la taxonomía de errores
    - **Property 42: Clasificación exhaustiva de errores**
    - **Validates: Requirements 17.4**

  - [x] 2.3 Implementar el wrapper genérico de ejecución de casos de uso: validación Zod → `canPerform` → regla de dominio → `repo.save` → evento de auditoría, en ese orden y sin excepciones de negocio hacia la capa de Presentación
    - Captura en un único try/catch las excepciones de los puertos de infraestructura y las traduce a `error_interno` sin filtrar el mensaje original
    - _Requirements: 17.1, 17.2, 17.3_

  - [ ]* 2.4 Escribir property test para la validación de DTO contra esquema Zod
    - **Property 39: Validación de DTO contra esquema Zod**
    - **Validates: Requirements 17.1**

  - [ ]* 2.5 Escribir property test para la ausencia de efectos colaterales en validación fallida
    - **Property 40: Ausencia de efectos colaterales en validación fallida**
    - **Validates: Requirements 17.2**

  - [ ]* 2.6 Escribir property test para el encapsulamiento de errores de infraestructura
    - **Property 41: Encapsulamiento de errores de infraestructura**
    - **Validates: Requirements 17.3**

- [x] 3. Implementar Value Objects y cálculo temporal
  - [x] 3.1 Implementar el Value Object `CustomClaims` y los tipos `Role`, `Resource`, `Operation`, `ResourceScope`
    - _Requirements: 1.1, 1.4_

  - [x] 3.2 Implementar la calculadora pura de `SabadoEclesiastico` (trimestre, número de sábado 1-13, fecha calendario) parametrizada por zona horaria IANA de la Iglesia, retornando un error de dominio cuando la zona horaria no está configurada
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ]* 3.3 Escribir property test para el cálculo del sábado eclesiástico en la zona horaria de la Iglesia
    - **Property 47: Cálculo del Sabado_Eclesiastico en la zona horaria de la Iglesia**
    - **Validates: Requirements 20.1**

  - [ ]* 3.4 Escribir property test para la numeración cíclica del sábado dentro del trimestre
    - **Property 48: Numeración cíclica del sábado dentro del trimestre**
    - **Validates: Requirements 20.2**

  - [ ]* 3.5 Escribir property test para el rechazo de cálculo sin zona horaria configurada
    - **Property 49: Rechazo de creación de Registro sin zona horaria configurada**
    - **Validates: Requirements 20.3**

  - [x] 3.6 Implementar la calculadora pura de `Codigo_Visual` a partir de `presente`/`diasEstudio`/`esVisita`
    - _Requirements: 7.2_

- [ ] 4. Implementar el Motor_RBAC (dominio puro)
  - [x] 4.1 Implementar la tabla declarativa `PERMISSION_MATRIX` y las funciones `isAuthorizedForChurch(claims, iglesiaId)` y `hasOperationalRole(claims)`
    - Única fuente de verdad de la Matriz RBAC del Requerimiento 16
    - _Requirements: 12.1, 12.3, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ]* 4.2 Escribir property test para la autorización territorial de lectura y listado
    - **Property 1: Autorización territorial de lectura y listado**
    - **Validates: Requirements 3.7, 5.5, 7.8, 9.5, 12.1, 12.2, 12.5**

  - [x] 4.3 Implementar `canPerform(claims, resource, operation, scope)` y `visibleNavSections(claims)` sobre `PERMISSION_MATRIX`
    - _Requirements: 12.4, 15.4, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ]* 4.4 Escribir property test para la autorización territorial de creación y escritura operativa
    - **Property 2: Autorización territorial de creación y escritura operativa**
    - **Validates: Requirements 5.1, 5.2, 6.1, 6.2, 7.3, 12.3, 12.4, 16.3, 16.4**

  - [ ]* 4.5 Escribir property test para el rechazo de roles no operativos sobre Unidad_Accion
    - **Property 14: Rechazo de roles no operativos sobre Unidad_Accion**
    - **Validates: Requirements 5.3**

- [~] 5. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implementar servicios de dominio del Registro_Sabatico
  - [x] 6.1 Implementar `calcularTotalesRapidos(asistencia)` (presentes, ausentes, visitas)
    - _Requirements: 7.6, 7.7, 7.10_

  - [ ]* 6.2 Escribir property test para el invariante contable de totales_rapidos
    - **Property 18: Invariante contable de totales_rapidos**
    - **Validates: Requirements 7.6, 7.7, 7.10**

  - [x] 6.3 Implementar `validarDiasEstudio(valor)` con rango entero [0, 7]
    - _Requirements: 7.5_

  - [ ]* 6.4 Escribir property test para la validación de rango de días de estudio
    - **Property 23: Validación de rango de días de estudio**
    - **Validates: Requirements 7.5**

  - [x] 6.5 Implementar la calculadora de deserción (ausente en 3 o más Registros_Sabaticos consecutivos y cerrados de la misma Unidad_Accion)
    - _Requirements: 11.6_

  - [ ]* 6.6 Escribir property test para el cálculo de deserción
    - **Property 31: Cálculo de deserción**
    - **Validates: Requirements 11.6**

  - [x] 6.7 Implementar la guardia de estado editable `verificarRegistroEditable(registro)` que rechaza toda mutación de asistencia, días de estudio o Seguimiento_Pastoral cuando `estado=cerrado`
    - _Requirements: 7.4, 8.4, 9.4, 10.5_

  - [ ]* 6.8 Escribir property test para la inmutabilidad del Registro_Sabatico cerrado
    - **Property 19: Inmutabilidad del Registro_Sabatico cerrado**
    - **Validates: Requirements 7.4, 8.4, 9.4, 10.5**

- [~] 7. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implementar puertos de Aplicación, DTOs y dobles en memoria
  - [x] 8.1 Definir las interfaces de repositorio (`IglesiaRepositoryPort`, `DistritoRepositoryPort`, `AsociacionRepositoryPort`, `UnidadAccionRepositoryPort`, `ParticipanteRepositoryPort`, `RegistroSabaticoRepositoryPort`, `AuditoriaRepositoryPort`) en `application/ports/`
    - _Requirements: 19.2_

  - [x] 8.2 Definir los puertos `SearchChurchPort`, `AuthAdminPort` y `ClockPort` en `application/ports/`
    - _Requirements: 4.1, 19.2_

  - [x] 8.3 Definir los esquemas Zod de todos los DTOs de entrada de casos de uso en `application/dto/`
    - _Requirements: 17.1_

  - [x] 8.4 Implementar repositorios y adaptadores en memoria (`InMemory*Repository`, `InMemorySearchChurchPort`, `FakeClockPort`) para uso exclusivo en pruebas de casos de uso
    - _Requirements: 19.3, 19.5_

- [ ] 9. Implementar casos de uso de Autenticación y Custom_Claims
  - [x] 9.1 Implementar `asignar-custom-claims.use-case.ts` (validación de rol, alcance de `admin_asociacion` restringido a su propia `asociacion_id`, invalidación de sesión, auditoría)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 9.2 Escribir property test para la autorización de asignación de Custom_Claims por alcance del actor
    - **Property 3: Autorización de asignación de Custom_Claims por alcance del actor**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 9.3 Escribir property test para el rechazo de rol inválido en asignación de Custom_Claims
    - **Property 4: Rechazo de rol inválido en asignación de Custom_Claims**
    - **Validates: Requirements 1.4**

  - [ ]* 9.4 Escribir property test para la invalidación de sesión tras actualización de Custom_Claims
    - **Property 5: Invalidación de sesión tras actualización de Custom_Claims**
    - **Validates: Requirements 1.5**

  - [ ]* 9.5 Escribir prueba unitaria de exigencia transversal de autenticación: toda operación de lectura o escritura invocada sin sesión válida de Firebase Auth es rechazada
    - Prueba de ejemplo (no PBT), cubre el criterio 1.6 listado como no apto para property-based testing
    - _Requirements: 1.6_

- [ ] 10. Implementar casos de uso de Gestión Territorial
  - [x] 10.1 Implementar `crear-asociacion.use-case.ts` y `crear-distrito.use-case.ts` (rechazo de `asociacion_id` inexistente)
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 10.2 Implementar `asignar-supervisor-distrito.use-case.ts` (asigna `user_uid` con rol `pastor_distrital`/`anciano` como supervisor del Distrito)
    - _Requirements: 2.5_

  - [ ]* 10.3 Escribir prueba unitaria de asignación de supervisor a Distrito (escritura simple de un campo)
    - Prueba de ejemplo (no PBT), cubre el criterio 2.5 listado como no apto para property-based testing
    - _Requirements: 2.5_

  - [x] 10.4 Implementar `crear-iglesia.use-case.ts` (unicidad de `id_oficial`, `fecha_alta`, autorización `admin_global`/`admin_asociacion` restringida a su propia `asociacion_id`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 10.5 Escribir property test para la autorización de creación territorial de nivel superior
    - **Property 7: Autorización de creación territorial de nivel superior**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5, 16.1**

  - [ ]* 10.6 Escribir property test para la unicidad de `id_oficial` de Iglesia
    - **Property 8: Unicidad de `id_oficial` de Iglesia**
    - **Validates: Requirements 3.4**

  - [x] 10.7 Implementar `editar-iglesia.use-case.ts` (actualiza únicamente `nombre`, `distrito_id`, `pais_codigo`)
    - _Requirements: 3.6_

  - [ ]* 10.8 Escribir property test para la edición autorizada de campos de Iglesia
    - **Property 10: Edición autorizada de campos de Iglesia**
    - **Validates: Requirements 3.6**

  - [x] 10.9 Implementar `eliminar-iglesia.use-case.ts` (restringido a `admin_global`)
    - _Requirements: 3.8_

- [ ] 11. Implementar casos de uso de SearchChurch
  - [x] 11.1 Implementar `buscar-iglesia-oficial.use-case.ts` consumiendo `SearchChurchPort`, mapeando cada resultado a un borrador de Iglesia (`id_oficial`, `nombre`, `pais_codigo`)
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ]* 11.2 Escribir property test para el mapeo de resultado SearchChurch a borrador de Iglesia
    - **Property 12: Mapeo de resultado SearchChurch a borrador de Iglesia**
    - **Validates: Requirements 4.2**

  - [ ]* 11.3 Escribir property test para la autorización de búsqueda SearchChurch
    - **Property 13: Autorización de búsqueda SearchChurch**
    - **Validates: Requirements 4.4**

  - [ ]* 11.4 Escribir prueba unitaria del timeout de SearchChurch a los 10 segundos con alternativa de registro manual
    - Prueba de ejemplo (no PBT) contra `InMemorySearchChurchPort` simulando demora
    - _Requirements: 4.3_

- [~] 12. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implementar casos de uso de Unidades de Acción
  - [x] 13.1 Implementar `crear-unidad-accion.use-case.ts` (autorización sobre `iglesia_id` propia, `estado=activa` inicial)
    - _Requirements: 5.1, 5.2_

  - [x] 13.2 Implementar `actualizar-estado-unidad-accion.use-case.ts` (transición `activa`/`inactiva` por Secretario)
    - _Requirements: 5.4_

  - [x] 13.3 Implementar `listar-unidades-por-maestro.use-case.ts`
    - _Requirements: 5.6_

  - [ ]* 13.4 Escribir property test para el filtro de Unidades por maestro asignado
    - **Property 15: Filtro de Unidades por maestro asignado**
    - **Validates: Requirements 5.6**

- [ ] 14. Implementar casos de uso de Participantes y vínculo de cuenta Alumno
  - [x] 14.1 Implementar `crear-participante.use-case.ts` (validación referencial `unidad_id`/`iglesia_id`, `estado=activo` inicial)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 14.2 Escribir property test para la validación referencial de Participante contra su Unidad
    - **Property 16: Validación referencial de Participante contra su Unidad**
    - **Validates: Requirements 6.3**

  - [x] 14.3 Implementar `actualizar-estado-participante.use-case.ts` (marca `inactivo`, excluye al Participante de futuros Registros_Sabaticos)
    - _Requirements: 6.4_

  - [x] 14.4 Implementar `leer-participante.use-case.ts` y `actualizar-participante-propio.use-case.ts` (un Alumno solo lee/edita el Participante vinculado a su `user_uid`; sanitización de `nombre`/`apellido` para roles no autorizados)
    - _Requirements: 6.5, 6.6, 21.2_

  - [ ]* 14.5 Escribir property test para la visibilidad de datos personales restringida por rol
    - **Property 51: Visibilidad de datos personales restringida por rol**
    - **Validates: Requirements 6.5, 6.6, 21.2**

  - [x] 14.6 Implementar `generar-codigo-enlace.use-case.ts` (Participante) y `canjear-codigo-enlace.use-case.ts` (Auth): código de un solo uso que vincula `user_uid` y asigna `role=alumno` con la `iglesia_id` del Participante
    - _Requirements: 1.7, 1.8, 6.7_

  - [ ]* 14.7 Escribir property test para el round-trip de código de enlace de un solo uso
    - **Property 6: Round-trip de código de enlace de un solo uso**
    - **Validates: Requirements 1.7, 1.8, 6.7**

- [~] 15. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implementar el caso de uso del Registro_Sabatico Core (asistencia)
  - [x] 16.1 Implementar `registrar-asistencia.use-case.ts` — camino de creación: genera el ID determinístico `{iglesia_id}_{unidad_id}_{anio}_T{trimestre}_S{sabado}`, `estado=borrador`, `totales_rapidos` iniciales, excluyendo Participantes con `estado=inactivo`
    - _Requirements: 7.1_

  - [ ]* 16.2 Escribir property test para la creación determinística del Registro_Sabatico
    - **Property 21: Creación determinística del Registro_Sabatico**
    - **Validates: Requirements 7.1**

  - [ ]* 16.3 Escribir property test para la exclusión de Participantes inactivos de nuevos Registros
    - **Property 17: Exclusión de Participantes inactivos de nuevos Registros**
    - **Validates: Requirements 6.4**

  - [x] 16.4 Implementar `registrar-asistencia.use-case.ts` — camino de actualización: recalcula `codigo_visual`/`totales_rapidos`, aplica la guardia de estado editable, autoriza únicamente a Secretario/Maestro/Admin_Global sobre su propia `iglesia_id`, valida rango de `dias_estudio`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 16.5 Escribir property test para el recálculo de código visual y totales tras actualización
    - **Property 22: Recalculo de código visual y totales tras actualización**
    - **Validates: Requirements 7.2**

  - [x] 16.6 Implementar `eliminar-registro-sabatico.use-case.ts` (restringido a `admin_global`)
    - _Requirements: 7.9_

  - [ ]* 16.7 Escribir property test para la restricción de eliminación permanente a Admin_Global
    - **Property 9: Restricción de eliminación permanente a Admin_Global**
    - **Validates: Requirements 3.8, 7.9**

- [~] 17. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implementar casos de uso de Cierre semanal
  - [x] 18.1 Implementar `cerrar-registro-sabatico.use-case.ts` (Secretario/Admin_Global; registra `cerradoPor` y `fechaCierre`; rechaza a Maestro)
    - _Requirements: 8.1, 8.2_

  - [x] 18.2 Implementar `reabrir-registro-sabatico.use-case.ts` (Secretario/Admin_Global; devuelve `estado=borrador`)
    - _Requirements: 8.3_

  - [ ]* 18.3 Escribir property test para la transición de cierre y reapertura del Registro_Sabatico
    - **Property 20: Transición de cierre y reapertura del Registro_Sabatico**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 19. Implementar caso de uso de Seguimiento Pastoral
  - [x] 19.1 Implementar `registrar-seguimiento-pastoral.use-case.ts` (enum `accion` en {llamado_telefonico, enfermo_oracion, visitado_en_semana}, autorización de Maestro restringida a Unidades a su cargo, guardia de estado editable)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 19.2 Escribir property test para la validación de enumeración de acción de Seguimiento_Pastoral
    - **Property 24: Validación de enumeración de acción de Seguimiento_Pastoral**
    - **Validates: Requirements 9.2**

  - [ ]* 19.3 Escribir property test para la autorización de registro de Seguimiento_Pastoral
    - **Property 25: Autorización de registro de Seguimiento_Pastoral**
    - **Validates: Requirements 9.3, 16.5**

- [ ] 20. Implementar casos de uso de Check-in de Estudio Diario
  - [x] 20.1 Implementar `autorregistrar-estudio-diario.use-case.ts` (incrementa `dias_estudio` con `autorregistrado=true`, un único registro por día calendario en la zona horaria de la Iglesia, exige identidad propia, aplica guardia de estado editable)
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [ ]* 20.2 Escribir property test para el registro de estudio diario que preserva el origen (`autorregistrado=true` vs `false`)
    - **Property 26: Registro de estudio diario preserva el origen**
    - **Validates: Requirements 10.1, 10.4**

  - [ ]* 20.3 Escribir property test para el rechazo de doble autorregistro el mismo día calendario
    - **Property 27: Rechazo de doble autorregistro el mismo día calendario**
    - **Validates: Requirements 10.2**

  - [ ]* 20.4 Escribir property test para la autorización de identidad para autorregistro
    - **Property 28: Autorización de identidad para autorregistro**
    - **Validates: Requirements 10.3, 16.6**

  - [x] 20.5 Implementar `consultar-mi-progreso.use-case.ts` (Alumno: su propio estado de asistencia/estudio diario más metas agregadas y anónimas de su Unidad_Accion)
    - _Requirements: 10.6_

  - [ ]* 20.6 Escribir property test para la visibilidad restringida del Alumno a su propio estado
    - **Property 29: Visibilidad restringida del Alumno a su propio estado**
    - **Validates: Requirements 10.6**

- [~] 21. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Implementar caso de uso del Dashboard Analítico
  - [x] 22.1 Implementar `consultar-dashboard.use-case.ts` — alcance por rol: Director_ES (su Iglesia), Pastor_Distrital/Anciano (Iglesias de su Distrito, sin datos individuales), Admin_Asociacion (Distritos/Iglesias de su Asociación), Admin_Global (todo el Sistema); rechazo de Secretario/Maestro/Alumno
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 22.2 Escribir property test para el alcance territorial del Dashboard Analítico
    - **Property 30: Alcance territorial del Dashboard Analítico**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 16.2, 16.8**

  - [x] 22.3 Integrar la calculadora de deserción y el filtro a Registros_Sabaticos con `estado=cerrado` en `consultar-dashboard.use-case.ts`, señalando explícitamente los sábados del periodo aún pendientes de cierre
    - _Requirements: 11.6, 11.7_

  - [ ]* 22.4 Escribir property test para el filtrado del Dashboard a registros cerrados
    - **Property 32: Filtrado del Dashboard a registros cerrados**
    - **Validates: Requirements 11.7**

  - [ ]* 22.5 Escribir property test para la no exposición de estatus de menor de edad en agregados
    - **Property 50: No exposición de estatus de menor de edad en agregados**
    - **Validates: Requirements 21.1**

- [ ] 23. Implementar casos de uso de Auditoría
  - [x] 23.1 Implementar el helper transversal `registrarEventoAuditoria` invocado desde el wrapper de casos de uso (tarea 2.3) para toda operación mutadora exitosa
    - _Requirements: 13.1_

  - [ ]* 23.2 Escribir property test para el registro exhaustivo de eventos de auditoría
    - **Property 33: Registro exhaustivo de eventos de auditoría**
    - **Validates: Requirements 13.1**

  - [x] 23.3 Implementar `consultar-auditoria.use-case.ts` (filtros `iglesia_id`/`uid`/rango de fechas para Admin_Global; alcance restringido a la propia `asociacion_id` para Admin_Asociacion; rechazo de otros roles)
    - _Requirements: 13.3, 13.4, 13.5_

  - [ ]* 23.4 Escribir property test para el filtrado de auditoría por alcance del consultante
    - **Property 35: Filtrado de auditoría por alcance del consultante**
    - **Validates: Requirements 13.3, 13.4**

  - [ ]* 23.5 Escribir property test para el rechazo de consulta de auditoría para roles no administrativos
    - **Property 36: Rechazo de consulta de auditoría para roles no administrativos**
    - **Validates: Requirements 13.5**

- [ ] 24. Implementar casos de uso de Privacidad y datos personales
  - [x] 24.1 Implementar `exportar-datos-participante.use-case.ts` y `eliminar-datos-participante.use-case.ts` (restringidos a `admin_global`, registran evento de auditoría)
    - _Requirements: 21.3_

  - [ ]* 24.2 Escribir property test para la completitud y ausencia en operaciones de datos personales
    - **Property 52: Completitud y ausencia en operaciones de datos personales**
    - **Validates: Requirements 21.3**

  - [ ]* 24.3 Escribir property test para el rechazo de exportación/eliminación masiva por rol no autorizado
    - **Property 53: Rechazo de exportación/eliminación masiva por rol no autorizado**
    - **Validates: Requirements 21.4**

- [~] 25. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 26. Implementar repositorios Firestore
  - [x] 26.1 Implementar `FirestoreAsociacionRepository`, `FirestoreDistritoRepository` y `FirestoreIglesiaRepository` (mapeo documento ↔ entidad)
    - _Requirements: 19.2_

  - [x] 26.2 Implementar `FirestoreUnidadAccionRepository` y `FirestoreParticipanteRepository`
    - _Requirements: 19.2_

  - [x] 26.3 Implementar `FirestoreRegistroSabaticoRepository.save()` como una única `setDoc`/`updateDoc` transaccional (`upsert` idempotente por ID determinístico)
    - _Requirements: 7.1, 14.4, 19.2_

  - [ ]* 26.4 Escribir prueba de integración contra el Firebase Emulator Suite: `FirestoreRegistroSabaticoRepository.save()` ejecuta exactamente una escritura por invocación
    - Prueba de ejemplo/integración (no PBT)
    - _Requirements: 7.1_

- [ ] 27. Implementar el adaptador de Autenticación
  - [x] 27.1 Implementar `FirebaseAdminAuthAdapter` (`AuthAdminPort`: `setCustomUserClaims`, `revokeRefreshTokens`)
    - _Requirements: 1.5, 19.2_

  - [ ]* 27.2 Escribir prueba de integración contra el emulador de Auth: la invalidación de sesión revoca efectivamente los tokens del usuario destino
    - Prueba de ejemplo/integración (no PBT)
    - _Requirements: 1.5_

- [ ] 28. Implementar el adaptador SearchChurch
  - [x] 28.1 Implementar `SearchChurchHttpAdapter` (Cloud Function `onCall`, credenciales de API solo en variables de entorno del servidor, `AbortController` con timeout de 10s)
    - _Requirements: 4.1, 4.3_

  - [ ]* 28.2 Escribir property test para que el adaptador SearchChurch nunca exponga credenciales al cliente
    - **Property 11: El adaptador SearchChurch nunca expone credenciales al cliente**
    - **Validates: Requirements 4.1**

  - [ ]* 28.3 Escribir prueba unitaria del timeout de 10 segundos del adaptador HTTP con mocks de la API externa
    - Prueba de ejemplo (no PBT)
    - _Requirements: 4.3_

- [ ] 29. Implementar el adaptador de Auditoría
  - [x] 29.1 Implementar `AuditoriaFirestoreAdapter` (escritura en `/auditoria/{evento_id}`; reglas de Firestore que prohíben `update`/`delete` salvo `admin_global`)
    - _Requirements: 13.2_

  - [ ]* 29.2 Escribir property test para la inmutabilidad de eventos de auditoría
    - **Property 34: Inmutabilidad de eventos de auditoría**
    - **Validates: Requirements 13.2**

- [ ] 30. Implementar la generación de `firestore.rules` desde `PERMISSION_MATRIX`
  - [x] 30.1 Implementar el generador de `firestore.rules` a partir de `PERMISSION_MATRIX` (fuente única de verdad compartida con `canPerform`)
    - _Requirements: 19.4_

  - [ ]* 30.2 Escribir property test de consistencia entre reglas de Firestore y autorización de Aplicación, ejecutando cada caso contra el Firebase Emulator Suite y contra `canPerform`
    - **Property 46: Consistencia entre reglas de Firestore y autorización de Aplicación**
    - **Validates: Requirements 19.4**

- [~] 31. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 32. Implementar el Módulo de Sincronización Offline
  - [x] 32.1 Implementar `OfflineQueue` (persistencia local vía IndexedDB, encolado FIFO de comandos consolidados) sin bloquear la interacción del usuario
    - _Requirements: 18.1_

  - [ ]* 32.2 Escribir property test para la cola offline no bloqueante
    - **Property 43: Cola offline no bloqueante**
    - **Validates: Requirements 18.1**

  - [x] 32.3 Implementar la sincronización automática al reconectar (reintento FIFO invocando `registrar-asistencia.use-case.ts`)
    - _Requirements: 18.2_

  - [ ]* 32.4 Escribir property test para la sincronización automática round-trip
    - **Property 44: Sincronización automática round-trip**
    - **Validates: Requirements 18.2**

  - [x] 32.5 Implementar la detección de conflicto de cierre (mueve el comando a `comandos_en_conflicto` sin aplicarlo ni descartarlo, para revisión manual del Maestro)
    - _Requirements: 18.3_

  - [ ]* 32.6 Escribir property test para el rechazo de sincronización en conflicto de cierre
    - **Property 45: Rechazo de sincronización en conflicto de cierre**
    - **Validates: Requirements 18.3**

- [~] 33. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 34. Implementar middleware y rutas protegidas
  - [x] 34.1 Implementar `proxy.ts` (renombrado de `middleware.ts` en Next.js 16; verificación de sesión de Firebase Auth en rutas del segmento `(protected)`, redirección a `/login`)
    - _Requirements: 15.1_

  - [ ]* 34.2 Escribir prueba unitaria: un usuario no autenticado que accede a una ruta protegida es redirigido a `/login`
    - Prueba de ejemplo (no PBT)
    - _Requirements: 15.1_

  - [x] 34.3 Implementar las guardas de layout por sección (`canPerform` sobre el recurso de la ruta; vista de "Acceso denegado" si es falso)
    - _Requirements: 15.2_

  - [x] 34.4 Implementar la construcción del menú de navegación con `visibleNavSections(claims)`
    - _Requirements: 15.4_

  - [x] 34.5 Implementar el panel principal de Alumno consumiendo `consultar-mi-progreso.use-case.ts` (propio estudio diario, asistencia histórica, metas agregadas de su Unidad)
    - _Requirements: 15.3_

  - [ ]* 34.6 Escribir prueba unitaria: el panel de Alumno muestra únicamente sus propios datos y las metas agregadas de su Unidad, sin datos individuales de otros Participantes
    - Prueba de ejemplo (no PBT)
    - _Requirements: 15.3_

- [ ] 35. Implementar la Interfaz_Grilla_Asistencia
  - [x] 35.1 Implementar el estado local de la grilla (`Record<participanteId, CeldaState>` con `useReducer`/store atómico) y la virtualización de filas para hasta 200 Participantes
    - _Requirements: 14.1, 14.2_

  - [ ]* 35.2 Escribir prueba de rendimiento dedicada: renderizado completo de la grilla con 200 Participantes en menos de 2 segundos bajo throttling de 3 Mbps
    - Prueba de rendimiento (no PBT)
    - _Requirements: 14.1_

  - [ ]* 35.3 Escribir property test para la actualización de celda aislada en la grilla
    - **Property 37: Actualización de celda aislada en la grilla**
    - **Validates: Requirements 14.2**

  - [x] 35.4 Implementar el hook `useGridKeyboardNav` (navegación entre celdas con flechas, `Tab`/`Shift+Tab`, `Enter`)
    - _Requirements: 14.3_

  - [ ]* 35.5 Escribir prueba unitaria de navegación por teclado con Testing Library `userEvent`
    - Prueba de ejemplo (no PBT)
    - _Requirements: 14.3_

  - [x] 35.6 Implementar el botón "Guardar" que recolecta el diff acumulado (`Map<participanteId, CambioParcial>`) y lo envía como un único DTO consolidado a `registrar-asistencia.use-case.ts`, integrado con `OfflineQueue` y su indicador visual de cambios pendientes
    - _Requirements: 14.4, 18.4_

  - [ ]* 35.7 Escribir property test para la consolidación de escritura de la grilla
    - **Property 38: Consolidación de escritura de la grilla**
    - **Validates: Requirements 14.4**

  - [ ]* 35.8 Escribir prueba unitaria del indicador visual de cambios pendientes de sincronización
    - Prueba de ejemplo (no PBT)
    - _Requirements: 18.4_

  - [x] 35.9 Aplicar atributos de accesibilidad (`aria-label`, `role="gridcell"`, contraste AA de tokens Tailwind, foco visible) a los controles de la grilla
    - _Requirements: 14.5_

  - [ ]* 35.10 Configurar auditoría automatizada de accesibilidad con `axe-core` en CI sobre la grilla y las rutas protegidas
    - Análisis estático (no PBT); el cumplimiento total de WCAG 2.1 AA requiere además revisión manual con lector de pantalla
    - _Requirements: 14.5_

- [ ] 36. Implementar la interfaz del Dashboard Analítico
  - [x] 36.1 Implementar las vistas de Dashboard Analítico por rol (Director_ES, Pastor_Distrital/Anciano, Admin_Asociacion, Admin_Global) consumiendo `consultar-dashboard.use-case.ts`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 37. Verificar cumplimiento estructural de la arquitectura
  - [ ]* 37.1 Escribir prueba unitaria que invoque cada caso de uso de forma independiente de Next.js y de Cloud Functions, usando únicamente los repositorios en memoria de la tarea 8.4
    - Prueba de ejemplo (no PBT), cubre el criterio 19.3 listado como no apto para property-based testing
    - _Requirements: 19.3_

  - [ ]* 37.2 Verificar en CI la cobertura de pruebas unitarias sobre casos de uso de Aplicación y de pruebas de integración sobre repositorios de Infraestructura
    - Análisis estático de cobertura (no PBT), cubre el criterio 19.5 listado como no apto para property-based testing
    - _Requirements: 19.5_

- [x] 38. Checkpoint final - Ensure all tests pass, ask the user if questions arise.

- [x] 39. Configurar la inicialización y el entorno de Firebase
  - [x] 39.1 Crear `src/infrastructure/firebase-client.ts` (inicialización del SDK cliente de Firebase a partir de `getApps()[0] ?? initializeApp(...)`, con `leerConfigClienteOLanzar()` validando explícitamente cada una de las variables `NEXT_PUBLIC_FIREBASE_*` y lanzando `Error` con el nombre exacto de la variable faltante; exporta `firebaseAuthClient`)
    - _Requirements: 24.1, 24.5_

  - [x] 39.2 Crear `src/infrastructure/firebase-admin.ts` (importa `server-only`; inicialización de `firebase-admin` a partir de `leerCredencialServidorOLanzar()` validando explícitamente cada variable de credencial de servicio y lanzando `Error` con el nombre exacto de la variable faltante; exporta `firebaseAdminAuth` y una función delgada `verificarIdToken(idToken)` sobre `firebaseAdminAuth.verifyIdToken`)
    - _Requirements: 24.2, 24.3, 24.5_

  - [ ]* 39.3 Escribir property test para la detección exhaustiva de variables de entorno faltantes
    - **Property 60: Detección exhaustiva de variables de entorno de Firebase faltantes**
    - **Validates: Requirements 24.5**

  - [x] 39.4 Crear `.env.example` en la raíz del proyecto, enumerando de forma exhaustiva las variables `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` y `FIREBASE_ADMIN_PRIVATE_KEY`, cada una con un valor de marcador de posición y sin credenciales reales
    - _Requirements: 24.4_

  - [x] 39.5 Documentar en el README, para cada variable de `.env.example`, su propósito, el origen desde el cual obtener su valor real en el proyecto de Firebase, y los pasos para configurar el entorno de desarrollo local
    - _Requirements: 24.6_

- [x] 40. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [x] 41. Implementar el inicio y cierre de sesión de usuario final
  - [x] 41.1 Implementar el Route Handler `app/api/auth/login/route.ts` (valida el body con `LoginRequestSchema`, verifica `idToken` mediante `verificarIdToken` de `firebase-admin.ts`, y fija la `Cookie_Sesion` (`__session`) como `httpOnly`/`secure`/`sameSite=lax`; si la verificación falla responde 401, si la fijación de la cookie falla responde 500 sin dejar cookie fijada)
    - _Requirements: 22.1, 22.7_

  - [x] 41.2 Implementar el Route Handler `app/api/auth/logout/route.ts` (elimina la `Cookie_Sesion` mediante `cookies().delete(COOKIE_SESION)`)
    - _Requirements: 22.3_

  - [x] 41.3 Implementar la página `app/login/page.tsx` (componente de cliente con formulario de correo/contraseña, invoca `signInWithEmailAndPassword` del SDK cliente de `firebase-client.ts`, envía el `idToken` a `POST /api/auth/login`, lee `from` de `searchParams`, redirige a `from` o a `/` tras éxito, invoca `signOut(firebaseAuthClient)` y muestra un mensaje de error descriptivo si la petición al Route Handler falla, y muestra un mensaje de error descriptivo sin fijar cookie si `signInWithEmailAndPassword` rechaza las credenciales)
    - _Requirements: 22.1, 22.2, 22.4, 22.5, 22.7_

  - [ ]* 41.4 Escribir property test para el round-trip del ciclo de vida de la Cookie_Sesion
    - **Property 54: Round-trip del ciclo de vida de la Cookie_Sesion**
    - **Validates: Requirements 22.1, 22.3**

  - [ ]* 41.5 Escribir property test para el rechazo de credenciales inválidas sin fijar cookie
    - **Property 55: Rechazo de credenciales inválidas sin fijar cookie**
    - **Validates: Requirements 22.2**

  - [ ]* 41.6 Escribir property test para el manejo de fallo al fijar la Cookie_Sesion
    - **Property 56: Manejo de fallo al fijar la Cookie_Sesion**
    - **Validates: Requirements 22.7**

  - [ ]* 41.7 Escribir property test para la redirección post-login determinada por el parámetro `from`
    - **Property 57: Redirección post-login determinada por el parámetro `from`**
    - **Validates: Requirements 22.4, 22.5**

  - [x] 41.8 Extender el `matcher`/`PREFIJOS_PROTEGIDOS` de `src/proxy.ts` para incluir `/panel-alumno`
    - _Requirements: 15.1, 23.1_

- [x] 42. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [x] 43. Implementar el enrutamiento y montaje de la aplicación
  - [x] 43.1 Crear el Route Group `src/app/(protected)/layout.tsx` (invoca `obtenerClaimsDeSesion()` y `construirMenuNavegacion(claims)` una sola vez para construir la navegación de todas las rutas protegidas)
    - _Requirements: 23.3_

  - [x] 43.2 Crear `src/app/(protected)/dashboard/page.tsx` montando `<SectionGuard resource="dashboard"><DashboardAnalitico ... /></SectionGuard>` con los datos resueltos por `consultar-dashboard.use-case.ts`
    - _Requirements: 23.1, 23.2_

  - [x] 43.3 Crear `src/app/(protected)/panel-alumno/page.tsx` montando `<SectionGuard resource="participante"><PanelAlumno ... /></SectionGuard>` con los datos resueltos por `consultar-mi-progreso.use-case.ts`
    - _Requirements: 23.1, 23.2_

  - [x] 43.4 Crear `src/app/(protected)/unidades/[unidadId]/registro/page.tsx` montando `<SectionGuard resource="registro_sabatico"><InterfazGrillaAsistencia ... /></SectionGuard>` para el `unidadId` del segmento dinámico
    - _Requirements: 23.1, 23.2_

  - [ ]* 43.5 Escribir property test para la guarda de sección aplicada a las rutas montadas
    - **Property 58: Guarda de sección aplicada a las rutas montadas**
    - **Validates: Requirements 23.2**

  - [ ]* 43.6 Escribir pruebas de ejemplo que rendericen cada una de las tres páginas montadas y comprueben que cada una monta el componente de presentación esperado
    - Prueba de ejemplo (no PBT), cubre el criterio 23.1 listado como no apto para property-based testing
    - _Requirements: 23.1_

  - [x] 43.7 Extraer `resolverDestinoRaiz(claims)` como función pura en `src/presentation/root-redirect.ts` (sin sesión → `/login`; `role=alumno` → `/panel-alumno`; rol analítico del Requirement 15.2 → `/dashboard`; `secretario`/`maestro` → primera entrada de `construirMenuNavegacion(claims)`) y consumirla desde `src/app/page.tsx`, reemplazando el scaffold de create-next-app
    - _Requirements: 23.4, 23.5, 23.6, 23.7_

  - [ ]* 43.8 Escribir property test para la redirección de la ruta raíz según rol
    - **Property 59: Redirección de la ruta raíz según rol**
    - **Validates: Requirements 23.4, 23.5, 23.6, 23.7**

  - [ ]* 43.9 Escribir prueba de ejemplo de que `(protected)/layout.tsx` construye la navegación raíz invocando `construirMenuNavegacion(claims)` a partir de los Custom_Claims del usuario autenticado
    - Prueba de ejemplo (no PBT), cubre el criterio 23.3 listado como no apto para property-based testing
    - _Requirements: 23.3_

- [~] 44. Checkpoint final - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y no deben implementarse junto con la tarea principal salvo que el usuario lo solicite explícitamente.
- Las 60 Correctness Properties del diseño están todas cubiertas, cada una en exactamente una sub-tarea de property test, ubicada inmediatamente después de la implementación que la satisface.
- Los criterios listados en el diseño como "no cubiertos por Correctness Properties" (1.6, 2.5, 14.1, 14.3, 14.5, 15.1, 15.3, 18.4, 19.1, 19.2, 19.3, 19.5, 22.6, 23.1, 23.3, 24.1, 24.2, 24.3, 24.4, 24.6) se cubren con pruebas de ejemplo, de rendimiento o análisis estático, también marcadas como opcionales.
- Cada tarea de implementación referencia los sub-requerimientos exactos que satisface, no solo la historia de usuario.
- Los checkpoints validan que la suite completa (dominio, aplicación, infraestructura, presentación) sigue pasando antes de avanzar a la siguiente capa.
- Las tareas 39-43 cubren la actualización de Requirements 22-24 (login/logout, enrutamiento real, configuración de entorno de Firebase), en el orden Firebase → login/logout → enrutamiento, ya que el enrutamiento de las páginas protegidas depende de que exista el flujo de login.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "3.2", "3.6"] },
    { "id": 2, "tasks": ["2.3", "4.1", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.5", "2.6", "4.3"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.5"] },
    { "id": 5, "tasks": ["6.1", "6.3", "6.5", "6.7"] },
    { "id": 6, "tasks": ["6.2", "6.4", "6.6", "6.8"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4"] },
    { "id": 9, "tasks": ["9.1"] },
    { "id": 10, "tasks": ["9.2", "9.3", "9.4", "9.5"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.4", "10.7", "10.9"] },
    { "id": 12, "tasks": ["10.3", "10.5", "10.6", "10.8"] },
    { "id": 13, "tasks": ["11.1"] },
    { "id": 14, "tasks": ["11.2", "11.3", "11.4"] },
    { "id": 15, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 16, "tasks": ["13.4"] },
    { "id": 17, "tasks": ["14.1", "14.3", "14.4", "14.6"] },
    { "id": 18, "tasks": ["14.2", "14.5", "14.7"] },
    { "id": 19, "tasks": ["16.1", "16.6"] },
    { "id": 20, "tasks": ["16.4"] },
    { "id": 21, "tasks": ["16.2", "16.3", "16.5", "16.7"] },
    { "id": 22, "tasks": ["18.1", "18.2"] },
    { "id": 23, "tasks": ["18.3"] },
    { "id": 24, "tasks": ["19.1"] },
    { "id": 25, "tasks": ["19.2", "19.3"] },
    { "id": 26, "tasks": ["20.1", "20.5"] },
    { "id": 27, "tasks": ["20.2", "20.3", "20.4", "20.6"] },
    { "id": 28, "tasks": ["22.1"] },
    { "id": 29, "tasks": ["22.3"] },
    { "id": 30, "tasks": ["22.2", "22.4", "22.5"] },
    { "id": 31, "tasks": ["23.1", "23.3"] },
    { "id": 32, "tasks": ["23.2", "23.4", "23.5"] },
    { "id": 33, "tasks": ["24.1"] },
    { "id": 34, "tasks": ["24.2", "24.3"] },
    { "id": 35, "tasks": ["26.1", "26.2", "26.3"] },
    { "id": 36, "tasks": ["26.4"] },
    { "id": 37, "tasks": ["27.1"] },
    { "id": 38, "tasks": ["27.2"] },
    { "id": 39, "tasks": ["28.1"] },
    { "id": 40, "tasks": ["28.2", "28.3"] },
    { "id": 41, "tasks": ["29.1"] },
    { "id": 42, "tasks": ["29.2"] },
    { "id": 43, "tasks": ["30.1"] },
    { "id": 44, "tasks": ["30.2"] },
    { "id": 45, "tasks": ["32.1"] },
    { "id": 46, "tasks": ["32.2", "32.3"] },
    { "id": 47, "tasks": ["32.5"] },
    { "id": 48, "tasks": ["32.4", "32.6"] },
    { "id": 49, "tasks": ["34.1"] },
    { "id": 50, "tasks": ["34.2", "34.3", "34.4"] },
    { "id": 51, "tasks": ["34.5"] },
    { "id": 52, "tasks": ["34.6"] },
    { "id": 53, "tasks": ["35.1"] },
    { "id": 54, "tasks": ["35.2", "35.3"] },
    { "id": 55, "tasks": ["35.4"] },
    { "id": 56, "tasks": ["35.5"] },
    { "id": 57, "tasks": ["35.6"] },
    { "id": 58, "tasks": ["35.7", "35.8"] },
    { "id": 59, "tasks": ["35.9"] },
    { "id": 60, "tasks": ["35.10"] },
    { "id": 61, "tasks": ["36.1"] },
    { "id": 62, "tasks": ["37.1", "37.2"] },
    { "id": 63, "tasks": ["39.1", "39.2", "39.4"] },
    { "id": 64, "tasks": ["39.3", "39.5"] },
    { "id": 65, "tasks": ["41.1", "41.2", "41.8"] },
    { "id": 66, "tasks": ["41.3"] },
    { "id": 67, "tasks": ["41.4", "41.5", "41.6", "41.7"] },
    { "id": 68, "tasks": ["43.1", "43.7"] },
    { "id": 69, "tasks": ["43.2", "43.3", "43.4"] },
    { "id": 70, "tasks": ["43.5", "43.6", "43.8", "43.9"] }
  ]
}
```
