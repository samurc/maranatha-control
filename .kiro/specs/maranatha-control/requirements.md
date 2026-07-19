# Requirements Document

## Introduction

Maranatha Control es un sistema SaaS multitenant para la automatización y el pastoreo de la Escuela Sabática de la Iglesia Adventista del Séptimo Día (IASD). El sistema evoluciona de un simple registro de asistencia hacia una plataforma integral de gestión eclesiástica y pastoreo de grupos pequeños ("Unidades de Acción"), permitiendo monitorear el "termómetro espiritual" de la iglesia mediante indicadores de estudio de la lección, asistencia sabática y visitación misionera/pastoral.

El sistema respeta la jerarquía territorial estricta de la IASD (Asociación/Misión → Distrito → Iglesia → Unidad de Acción → Participante), aislando los datos operativos por Iglesia (multitenant) y consolidando información hacia los niveles superiores de la jerarquía mediante roles de solo lectura analítica.

El sistema se construye sobre Firebase (Firestore, Auth, Cloud Functions) con Next.js (App Router), React, TypeScript y Tailwind CSS en el frontend, siguiendo Clean Architecture y Domain-Driven Design (DDD), con miras a un empaquetado futuro mediante Capacitor (Android/iOS).

## Glossary

- **Sistema**: El conjunto de la plataforma Maranatha Control (frontend, backend serverless y base de datos).
- **Asociacion_Mision**: Entidad territorial de nivel superior de la IASD que agrupa Distritos e Iglesias de una región geográfica.
- **Distrito**: Subdivisión territorial de una Asociación/Misión que agrupa una o más Iglesias, a cargo de un Pastor Distrital.
- **Iglesia**: Congregación local de la IASD, unidad de aislamiento multitenant del Sistema. Identificada por `id_oficial`.
- **Unidad_Accion**: Grupo pequeño de Escuela Sabática ("clase") perteneciente a una Iglesia, a cargo de un Maestro.
- **Participante**: Persona registrada dentro de una Unidad de Acción (miembro o visita), con o sin cuenta de usuario vinculada.
- **Registro_Sabatico**: Documento único por Unidad de Acción y sábado que contiene la asistencia, el estudio diario y el seguimiento pastoral de todos los Participantes de esa unidad para ese sábado.
- **Seguimiento_Pastoral**: Registro de una acción de visitación misionera/pastoral (llamado telefónico, oración por enfermedad, visita en la semana) realizada sobre un Participante.
- **Estudio_Diario**: Indicador de días de estudio de la lección de Escuela Sabática de un Participante durante la semana previa a un sábado determinado (0 a 7 días).
- **Codigo_Visual**: Código abreviado calculado a partir de la asistencia y el estudio diario de un Participante (por ejemplo "P7", "F") usado para visualización rápida en la grilla.
- **Autorregistro**: Registro de Estudio_Diario realizado directamente por un Alumno sobre su propio Participante vinculado.
- **Cierre_Semanal**: Estado de un Registro_Sabatico que indica que el Secretario ha auditado y finalizado el registro de un sábado, impidiendo modificaciones posteriores salvo reapertura explícita.
- **Custom_Claims**: Atributos de autorización (`role`, `iglesia_id`, `distrito_id`, `asociacion_id`) incrustados en el token de Firebase Auth de un usuario.
- **Rol_Territorial**: Alcance jerárquico (Asociación, Distrito o Iglesia) al que un Custom_Claims restringe la visibilidad de un usuario.
- **Trimestre**: Periodo de trece sábados usado por la Escuela Sabática de la IASD para organizar las lecciones.
- **Sabado_Eclesiastico**: Fecha calendario correspondiente a un sábado dentro de un Trimestre, calculada en la zona horaria local de la Iglesia.
- **Admin_Global**: Rol con control total sobre la infraestructura y el soporte técnico del Sistema, sin restricción territorial.
- **Admin_Asociacion**: Rol de Director de Escuela Sabática de una Asociacion_Mision; administra Iglesias y Pastores de su región.
- **Pastor_Distrital**: Rol supervisor de solo lectura sobre las Iglesias de su Distrito (incluye el rol Anciano con el mismo alcance).
- **Director_ES**: Rol de líder estratégico local con acceso analítico de solo lectura sobre su Iglesia.
- **Secretario**: Rol operativo administrativo de una Iglesia específica; gestiona Unidades, Participantes y audita el Cierre_Semanal.
- **Maestro**: Rol operativo a cargo de una Unidad_Accion; registra asistencia, Estudio_Diario y Seguimiento_Pastoral de su unidad.
- **Alumno**: Rol de autogestión de un Participante vinculado; realiza Autorregistro de su propio Estudio_Diario.
- **Modulo_Autenticacion**: Componente responsable de autenticar usuarios y asignar/actualizar sus Custom_Claims.
- **Modulo_Territorial**: Componente responsable de la gestión de Asociaciones, Distritos e Iglesias.
- **Modulo_Unidades**: Componente responsable de la gestión de Unidades de Acción.
- **Modulo_Participantes**: Componente responsable de la gestión de Participantes.
- **Modulo_Registro_Sabatico**: Componente responsable de la creación, edición, autorregistro y cierre de Registros_Sabaticos.
- **Modulo_Seguimiento_Pastoral**: Componente responsable del registro de Seguimiento_Pastoral sobre Participantes.
- **Modulo_Dashboard**: Componente responsable de la agregación y presentación de indicadores analíticos por Rol_Territorial.
- **Modulo_Auditoria**: Componente responsable de registrar y exponer el historial de acciones (quién, qué, cuándo).
- **Modulo_SearchChurch**: Componente responsable de la integración con la API oficial "SearchChurch" de la IASD para búsqueda e importación de datos oficiales de Iglesias.
- **Motor_RBAC**: Componente de reglas de seguridad de Firestore que autoriza cada operación de lectura/escritura según los Custom_Claims.
- **Interfaz_Grilla_Asistencia**: Componente de interfaz de usuario tipo hoja de cálculo para el registro masivo de asistencia y Estudio_Diario de una Unidad_Accion.
- **Modulo_Sincronizacion_Offline**: Componente responsable de la persistencia local y sincronización diferida de datos cuando no hay conectividad.
- **Cookie_Sesion**: Cookie httpOnly nombrada `__session` que almacena el ID token de Firebase Auth vigente del usuario autenticado, fijada por el Sistema tras un inicio de sesión exitoso.

## Supuestos Explícitos (Ambigüedades de la Especificación Fuente)

La especificación técnica fuente contiene puntos ambiguos o no especificados. Los siguientes supuestos se documentan explícitamente y quedan sujetos a validación por el usuario. Los requerimientos de este documento se basan en estos supuestos:

1. **Permisos de escritura del Director_ES**: La matriz de permisos original solo marca "Sí" para el Director_ES en "Ver Dashboard Analítico". Se asume que el Director_ES tiene acceso de **solo lectura** sobre Unidades, Participantes y Registros_Sabaticos de su Iglesia, sin capacidad de creación/edición. Si esto es incorrecto, se debe ajustar la Matriz RBAC (Requerimiento 15).
2. **Mecanismo de Cierre_Semanal**: Se asume que cada Registro_Sabatico tiene un campo `estado` con valores `borrador` y `cerrado`. El Secretario puede marcar un Registro_Sabatico como `cerrado`; una vez `cerrado`, el Maestro no puede modificarlo, y solo el Secretario (o roles superiores) puede reabrirlo explícitamente.
3. **Integración SearchChurch**: Se asume que la integración es de **solo lectura** (búsqueda e importación), invocada exclusivamente por Admin_Global y Admin_Asociacion desde una Cloud Function intermediaria, sin exponer credenciales de la API al cliente. El contrato exacto de campos y autenticación de la API externa se define como un adaptador de infraestructura aislado (puerto/adaptador DDD) para permitir su ajuste sin impactar el dominio.
4. **Cálculo de Sabado_Eclesiastico y zonas horarias**: Se asume que cada Iglesia almacena una zona horaria IANA (derivada o asociada a `pais_codigo`) y que el Sistema calcula el sábado vigente y los límites del día en la zona horaria local de la Iglesia, no en UTC ni en la zona horaria del cliente.
5. **Protección de datos de menores**: Se asume que los Participantes pueden ser menores de edad y que el Sistema debe registrar el estatus de "menor de edad" de forma opcional, restringir la exposición de datos personales sensibles a roles operativos/analíticos estrictamente autorizados, y ofrecer capacidad de exportación/eliminación de datos personales a solicitud, sin implementar aún un marco legal específico (RGPD/LOPD u otro) hasta que el usuario lo determine.
6. **Asignación de Custom_Claims**: Se asume que existe una Cloud Function administrativa invocable únicamente por Admin_Global (para cualquier usuario) o Admin_Asociacion (limitado a su propia `asociacion_id`) que asigna o actualiza `role`, `iglesia_id`, `distrito_id` y `asociacion_id` de un usuario destino, y que todo cambio de Custom_Claims se registra en el Modulo_Auditoria.
7. **Entidades Asociacion_Mision y Distrito**: La especificación fuente solo detalla la colección `/iglesias` con campos `asociacion_id` y `distrito_id`, sin definir colecciones propias para Asociación o Distrito. Se asume la existencia de las colecciones `/asociaciones/{asociacion_id}` y `/distritos/{distrito_id}` como entidades de referencia para nombre y consolidación, administradas por Admin_Global.
8. **Vínculo de cuenta de Alumno**: Se asume que un Participante puede existir sin `user_uid` (aún no autogestionado). El vínculo entre un Participante y una cuenta de Alumno se realiza mediante un código de enlace generado por el Secretario o Maestro, que el Alumno canjea al crear/vincular su cuenta.

## Requirements

### Requirement 1: Autenticación y asignación de Custom_Claims

**User Story:** Como Admin_Global o Admin_Asociacion, quiero asignar roles y alcance territorial a los usuarios del Sistema, para que cada usuario acceda únicamente a los datos correspondientes a su nivel jerárquico.

#### Acceptance Criteria

1. WHEN un Admin_Global invoca la asignación de Custom_Claims sobre un usuario destino con un `role`, `iglesia_id`, `distrito_id` o `asociacion_id` válidos, THE Modulo_Autenticacion SHALL actualizar los Custom_Claims del usuario destino y registrar la acción en el Modulo_Auditoria.
2. WHEN un Admin_Asociacion invoca la asignación de Custom_Claims sobre un usuario destino cuya `asociacion_id` objetivo coincide con la `asociacion_id` de su propio token, THE Modulo_Autenticacion SHALL actualizar los Custom_Claims del usuario destino y registrar la acción en el Modulo_Auditoria.
3. IF un usuario sin rol `admin_global` intenta asignar Custom_Claims a un usuario destino fuera de su propia `asociacion_id`, THEN THE Modulo_Autenticacion SHALL rechazar la operación y retornar un error de autorización.
4. IF el `role` solicitado no pertenece al conjunto {admin_global, admin_asociacion, pastor_distrital, anciano, director_es, secretario, maestro, alumno}, THEN THE Modulo_Autenticacion SHALL rechazar la operación y retornar un error de validación.
5. WHEN los Custom_Claims de un usuario son actualizados, THE Modulo_Autenticacion SHALL invalidar el token de sesión vigente del usuario destino para forzar la emisión de un nuevo token con los Custom_Claims actualizados.
6. THE Modulo_Autenticacion SHALL exigir autenticación válida de Firebase Auth para toda operación de lectura o escritura sobre cualquier recurso del Sistema.
7. WHEN un Alumno canjea un código de enlace válido generado para un Participante sin `user_uid`, THE Modulo_Autenticacion SHALL vincular el `user_uid` del Alumno al Participante correspondiente y asignar los Custom_Claims `role=alumno` con la `iglesia_id` del Participante.
8. IF un Alumno intenta canjear un código de enlace que ya fue utilizado o que no existe, THEN THE Modulo_Autenticacion SHALL rechazar el canje y retornar un error descriptivo.

### Requirement 2: Gestión de Asociaciones y Distritos

**User Story:** Como Admin_Global, quiero registrar y mantener las Asociaciones/Misiones y sus Distritos, para que la jerarquía territorial esté disponible para la asignación de Iglesias y roles supervisores.

#### Acceptance Criteria

1. WHEN un Admin_Global crea una Asociacion_Mision con nombre y país, THE Modulo_Territorial SHALL almacenar la Asociacion_Mision y registrar la acción en el Modulo_Auditoria.
2. WHEN un Admin_Global crea un Distrito asociado a una `asociacion_id` existente, THE Modulo_Territorial SHALL almacenar el Distrito y registrar la acción en el Modulo_Auditoria.
3. IF un usuario sin rol `admin_global` intenta crear o eliminar una Asociacion_Mision o un Distrito, THEN THE Modulo_Territorial SHALL rechazar la operación y retornar un error de autorización.
4. IF se intenta crear un Distrito referenciando una `asociacion_id` inexistente, THEN THE Modulo_Territorial SHALL rechazar la operación y retornar un error de validación.
5. WHEN un Admin_Global asigna un `user_uid` con rol `pastor_distrital` o `anciano` a un Distrito, THE Modulo_Territorial SHALL registrar dicho `user_uid` como supervisor del Distrito.

### Requirement 3: Gestión de Iglesias

**User Story:** Como Admin_Global o Admin_Asociacion, quiero registrar y administrar las Iglesias de mi región, para habilitar su operación autónoma dentro del Sistema.

#### Acceptance Criteria

1. WHEN un Admin_Global crea una Iglesia con `id_oficial`, `nombre`, `asociacion_id`, `distrito_id` y `pais_codigo` válidos, THE Modulo_Territorial SHALL almacenar la Iglesia con `fecha_alta` igual a la fecha de creación y registrar la acción en el Modulo_Auditoria.
2. WHEN un Admin_Asociacion crea una Iglesia cuya `asociacion_id` coincide con la `asociacion_id` de su propio token, THE Modulo_Territorial SHALL almacenar la Iglesia y registrar la acción en el Modulo_Auditoria.
3. IF un Admin_Asociacion intenta crear una Iglesia con una `asociacion_id` distinta a la de su propio token, THEN THE Modulo_Territorial SHALL rechazar la operación y retornar un error de autorización.
4. IF se intenta crear una Iglesia con un `id_oficial` ya existente, THEN THE Modulo_Territorial SHALL rechazar la operación y retornar un error de validación de duplicado.
5. IF un usuario cuyo rol no es `admin_global` ni `admin_asociacion` intenta crear o eliminar una Iglesia, THEN THE Modulo_Territorial SHALL rechazar la operación y retornar un error de autorización.
6. WHEN un Admin_Global o un Admin_Asociacion autorizado sobre la Iglesia edita los campos `nombre`, `distrito_id` o `pais_codigo` de una Iglesia existente, THE Modulo_Territorial SHALL actualizar la Iglesia y registrar la acción en el Modulo_Auditoria.
7. THE Modulo_Territorial SHALL permitir la lectura de una Iglesia únicamente a usuarios cuyos Custom_Claims sean autorizados sobre esa Iglesia según el Motor_RBAC.
8. ONLY Admin_Global SHALL be authorized to permanently delete an Iglesia record.

### Requirement 4: Búsqueda e importación de Iglesias oficiales vía SearchChurch

**User Story:** Como Admin_Global o Admin_Asociacion, quiero buscar iglesias oficiales de la IASD en la API SearchChurch e importar sus datos, para evitar el registro manual duplicado o incorrecto de Iglesias.

#### Acceptance Criteria

1. WHEN un Admin_Global o Admin_Asociacion envía un criterio de búsqueda de Iglesia oficial, THE Modulo_SearchChurch SHALL consultar la API SearchChurch a través de una Cloud Function intermediaria y retornar los resultados coincidentes sin exponer credenciales de la API al cliente.
2. WHEN un Admin_Global o Admin_Asociacion selecciona un resultado de búsqueda para importar, THE Modulo_SearchChurch SHALL prellenar los campos `id_oficial`, `nombre` y `pais_codigo` de una nueva Iglesia con los datos oficiales retornados.
3. IF la API SearchChurch no responde dentro de un tiempo de espera de 10 segundos, THEN THE Modulo_SearchChurch SHALL retornar un error de disponibilidad y permitir el registro manual de la Iglesia como alternativa.
4. IF un usuario sin rol `admin_global` ni `admin_asociacion` invoca la búsqueda de SearchChurch, THEN THE Modulo_SearchChurch SHALL rechazar la operación y retornar un error de autorización.

### Requirement 5: Gestión de Unidades de Acción

**User Story:** Como Secretario o Maestro, quiero crear y administrar las Unidades de Acción de mi Iglesia, para organizar a los Participantes en grupos pequeños con un responsable asignado.

#### Acceptance Criteria

1. WHEN un Secretario o Maestro crea una Unidad_Accion con `nombre` y `maestro_uid` para una `iglesia_id` que coincide con la `iglesia_id` de su propio token, THE Modulo_Unidades SHALL almacenar la Unidad_Accion con `estado=activa` y registrar la acción en el Modulo_Auditoria.
2. IF un Secretario o Maestro intenta crear una Unidad_Accion con una `iglesia_id` distinta a la de su propio token, THEN THE Modulo_Unidades SHALL rechazar la operación y retornar un error de autorización.
3. IF un usuario con rol `director_es`, `pastor_distrital`, `anciano` o `alumno` intenta crear, editar o eliminar una Unidad_Accion, THEN THE Modulo_Unidades SHALL rechazar la operación y retornar un error de autorización.
4. WHEN un Secretario cambia el `estado` de una Unidad_Accion de `activa` a `inactiva`, THE Modulo_Unidades SHALL actualizar el estado y registrar la acción en el Modulo_Auditoria.
5. THE Modulo_Unidades SHALL permitir la lectura de las Unidades de Acción únicamente a usuarios autorizados según el Motor_RBAC sobre la `iglesia_id` de la Unidad_Accion.
6. WHEN un Maestro consulta sus Unidades de Acción asignadas, THE Modulo_Unidades SHALL retornar únicamente las Unidades cuyo `maestro_uid` coincide con el `uid` del token del Maestro.

### Requirement 6: Gestión de Participantes

**User Story:** Como Secretario o Maestro, quiero registrar y administrar los Participantes de una Unidad de Acción, para mantener actualizado el censo de miembros y visitas de mi Iglesia.

#### Acceptance Criteria

1. WHEN un Secretario o Maestro crea un Participante con `nombre`, `apellido`, `unidad_id` y `es_visita` para una `iglesia_id` que coincide con la `iglesia_id` de su propio token, THE Modulo_Participantes SHALL almacenar el Participante con `estado=activo` y registrar la acción en el Modulo_Auditoria.
2. IF un Secretario o Maestro intenta crear un Participante con una `iglesia_id` distinta a la de su propio token, THEN THE Modulo_Participantes SHALL rechazar la operación y retornar un error de autorización.
3. IF se intenta crear un Participante referenciando una `unidad_id` que no pertenece a la misma `iglesia_id`, THEN THE Modulo_Participantes SHALL rechazar la operación y retornar un error de validación.
4. WHEN un Secretario marca el `estado` de un Participante como `inactivo`, THE Modulo_Participantes SHALL actualizar el estado y excluir al Participante de los nuevos Registros_Sabaticos generados a partir de ese momento.
5. THE Modulo_Participantes SHALL permitir a un Alumno leer y editar únicamente los campos de su propio Participante vinculado mediante `user_uid`.
6. IF un Alumno intenta leer o editar un Participante cuyo `user_uid` no coincide con su propio `uid`, THEN THE Modulo_Participantes SHALL rechazar la operación y retornar un error de autorización.
7. WHEN un Secretario o Maestro genera un código de enlace para un Participante sin `user_uid`, THE Modulo_Participantes SHALL emitir un código de un solo uso y registrar la acción en el Modulo_Auditoria.

### Requirement 7: Registro de asistencia y estudio en el Registro_Sabatico (Core)

**User Story:** Como Maestro, quiero registrar en una única operación por sábado la asistencia y los días de estudio de todos los Participantes de mi Unidad de Acción, para minimizar el tiempo de captura y evitar lecturas costosas de Firestore.

#### Acceptance Criteria

1. WHEN un Maestro registra la asistencia de su Unidad_Accion para un `Sabado_Eclesiastico` sin Registro_Sabatico previo, THE Modulo_Registro_Sabatico SHALL crear el documento `/registros_sabaticos/{iglesia_id}_{unidad_id}_{año}_T{trimestre}_S{sabado}` con el mapa `asistencia` indexado por `participante_id`, el campo `estado=borrador` y los `totales_rapidos` precalculados.
2. WHEN un Maestro actualiza la asistencia o el `dias_estudio` de uno o más Participantes en un Registro_Sabatico existente con `estado=borrador`, THE Modulo_Registro_Sabatico SHALL recalcular el `codigo_visual` y los `totales_rapidos` afectados y registrar la acción en el Modulo_Auditoria.
3. IF un Maestro intenta modificar un Registro_Sabatico cuya `iglesia_id` o `unidad_id` no coincide con una Unidad_Accion a su cargo, THEN THE Modulo_Registro_Sabatico SHALL rechazar la operación y retornar un error de autorización.
4. IF un Maestro intenta modificar un Registro_Sabatico cuyo `estado` es `cerrado`, THEN THE Modulo_Registro_Sabatico SHALL rechazar la operación y retornar un error de estado inválido.
5. IF `dias_estudio` enviado para un Participante está fuera del rango 0 a 7, THEN THE Modulo_Registro_Sabatico SHALL rechazar la operación y retornar un error de validación.
6. WHEN se registra `presente=true` para un Participante en un Registro_Sabatico, THE Modulo_Registro_Sabatico SHALL incrementar el contador `presentes` de `totales_rapidos` y, en caso contrario, incrementar el contador `ausentes`.
7. WHEN se registra un Participante con `es_visita=true` como `presente=true` en un Registro_Sabatico, THE Modulo_Registro_Sabatico SHALL incrementar el contador `visitas` de `totales_rapidos`.
8. THE Modulo_Registro_Sabatico SHALL permitir la lectura de un Registro_Sabatico únicamente a usuarios autorizados según el Motor_RBAC sobre la `iglesia_id` del registro.
9. ONLY Admin_Global SHALL be authorized to permanently delete a Registro_Sabatico document.
10. FOR ALL Registros_Sabaticos válidos, la suma de los contadores `presentes` y `ausentes` de `totales_rapidos` SHALL be equal to the number of entries in the map `asistencia`.

### Requirement 8: Cierre semanal del Registro_Sabatico

**User Story:** Como Secretario, quiero auditar y cerrar el Registro_Sabatico de cada Unidad de Acción al finalizar la semana, para garantizar la integridad de los datos antes de su consolidación en los tableros analíticos.

#### Acceptance Criteria

1. WHEN un Secretario marca un Registro_Sabatico con `estado=borrador` como `cerrado`, THE Modulo_Registro_Sabatico SHALL actualizar el `estado` a `cerrado`, registrar el `uid` del Secretario y la fecha del cierre, y registrar la acción en el Modulo_Auditoria.
2. IF un Maestro intenta cambiar el `estado` de un Registro_Sabatico a `cerrado`, THEN THE Modulo_Registro_Sabatico SHALL rechazar la operación y retornar un error de autorización.
3. WHEN un Secretario reabre un Registro_Sabatico con `estado=cerrado`, THE Modulo_Registro_Sabatico SHALL actualizar el `estado` a `borrador` y registrar la acción en el Modulo_Auditoria.
4. WHILE un Registro_Sabatico tiene `estado=cerrado`, THE Modulo_Registro_Sabatico SHALL rechazar cualquier intento de modificación de la asistencia, el estudio diario o el seguimiento pastoral asociados a dicho registro, excepto la operación de reapertura.

### Requirement 9: Seguimiento Pastoral y Misionero

**User Story:** Como Maestro, quiero registrar las acciones de visitación pastoral y misionera realizadas sobre los Participantes de mi Unidad de Acción, para dar seguimiento espiritual a quienes lo requieren.

#### Acceptance Criteria

1. WHEN un Maestro registra un Seguimiento_Pastoral con `accion` en {llamado_telefonico, enfermo_oracion, visitado_en_semana} para un Participante de una Unidad_Accion a su cargo, THE Modulo_Seguimiento_Pastoral SHALL almacenar el `Seguimiento_Pastoral` dentro del Registro_Sabatico correspondiente con `registrado_por` igual al `uid` del Maestro y registrar la acción en el Modulo_Auditoria.
2. IF un Maestro intenta registrar un Seguimiento_Pastoral con un valor de `accion` fuera del conjunto {llamado_telefonico, enfermo_oracion, visitado_en_semana}, THEN THE Modulo_Seguimiento_Pastoral SHALL rechazar la operación y retornar un error de validación.
3. IF un usuario con rol distinto de `maestro` o `admin_global` intenta registrar un Seguimiento_Pastoral, THEN THE Modulo_Seguimiento_Pastoral SHALL rechazar la operación y retornar un error de autorización.
4. WHILE un Registro_Sabatico tiene `estado=cerrado`, THE Modulo_Seguimiento_Pastoral SHALL rechazar cualquier intento de crear o modificar un Seguimiento_Pastoral asociado a dicho registro.
5. THE Modulo_Seguimiento_Pastoral SHALL permitir la lectura del historial de Seguimiento_Pastoral de un Participante únicamente a usuarios autorizados según el Motor_RBAC sobre la `iglesia_id` del Participante.

### Requirement 10: Check-in de Estudio Diario de la Lección

**User Story:** Como Alumno, quiero registrar diariamente si estudié la lección de Escuela Sabática, para que mi progreso semanal se refleje automáticamente en el Registro_Sabatico de mi Unidad de Acción.

#### Acceptance Criteria

1. WHEN un Alumno realiza un Autorregistro de estudio diario para el día vigente en la zona horaria de su Iglesia, THE Modulo_Registro_Sabatico SHALL incrementar en uno el `dias_estudio` del Participante vinculado dentro del Registro_Sabatico del `Sabado_Eclesiastico` en curso, con `autorregistrado=true`.
2. IF un Alumno intenta realizar más de un Autorregistro de estudio diario para el mismo día calendario, THEN THE Modulo_Registro_Sabatico SHALL rechazar la operación adicional y retornar un error de operación duplicada.
3. IF un Alumno intenta autorregistrar estudio diario para un Participante distinto al vinculado a su propio `user_uid`, THEN THE Modulo_Registro_Sabatico SHALL rechazar la operación y retornar un error de autorización.
4. WHEN un Maestro registra manualmente el `dias_estudio` de un Participante de su Unidad_Accion, THE Modulo_Registro_Sabatico SHALL almacenar el valor con `autorregistrado=false`.
5. WHILE el Registro_Sabatico del `Sabado_Eclesiastico` en curso tiene `estado=cerrado`, THE Modulo_Registro_Sabatico SHALL rechazar el Autorregistro de estudio diario de un Alumno.
6. THE Modulo_Registro_Sabatico SHALL permitir a un Alumno leer únicamente el estado de estudio diario y asistencia de su propio Participante vinculado, y las metas agregadas y anónimas de su Unidad_Accion.

### Requirement 11: Dashboard Analítico por nivel jerárquico

**User Story:** Como Director_ES, Pastor_Distrital, Admin_Asociacion o Admin_Global, quiero visualizar paneles analíticos de asistencia, estudio diario y deserción correspondientes a mi nivel jerárquico, para tomar decisiones pastorales informadas.

#### Acceptance Criteria

1. WHEN un Director_ES solicita el Dashboard Analítico, THE Modulo_Dashboard SHALL calcular y retornar los indicadores agregados de asistencia, estudio diario y visitación de todas las Unidades de Acción de la `iglesia_id` de su propio token.
2. WHEN un Pastor_Distrital o Anciano solicita el Dashboard Analítico, THE Modulo_Dashboard SHALL calcular y retornar los indicadores agregados a nivel de cada Iglesia cuya `distrito_id` coincide con la `distrito_id` de su propio token, sin exponer los datos individuales de Participantes.
3. WHEN un Admin_Asociacion solicita el Dashboard Analítico, THE Modulo_Dashboard SHALL calcular y retornar los indicadores agregados a nivel de cada Distrito e Iglesia cuya `asociacion_id` coincide con la `asociacion_id` de su propio token.
4. WHEN un Admin_Global solicita el Dashboard Analítico, THE Modulo_Dashboard SHALL calcular y retornar los indicadores agregados de todas las Asociaciones, Distritos e Iglesias registradas en el Sistema.
5. IF un Secretario, Maestro o Alumno solicita el Dashboard Analítico de nivel Distrito, Asociación o Global, THEN THE Modulo_Dashboard SHALL rechazar la operación y retornar un error de autorización.
6. THE Modulo_Dashboard SHALL calcular el indicador de deserción de un Participante como la ausencia registrada en tres o más Registros_Sabaticos consecutivos de su Unidad_Accion.
7. THE Modulo_Dashboard SHALL basar sus cálculos exclusivamente en Registros_Sabaticos con `estado=cerrado` al momento de la consulta, indicando explícitamente qué sábados aún están pendientes de cierre dentro del periodo consultado.

### Requirement 12: Multitenancy y aislamiento de datos por Iglesia

**User Story:** Como operador de una Iglesia, quiero que mis datos operativos permanezcan aislados de otras Iglesias del Sistema, para garantizar la confidencialidad de la información de mi congregación.

#### Acceptance Criteria

1. THE Motor_RBAC SHALL evaluar `isAuthorizedForChurch(iglesia_id)` como verdadero únicamente cuando el usuario tiene `role=admin_global`, o cuando la `iglesia_id`, `distrito_id` o `asociacion_id` de sus Custom_Claims corresponde jerárquicamente a la `iglesia_id` del recurso solicitado.
2. IF una operación de lectura o escritura referencia un recurso cuya `iglesia_id` no está autorizada según `isAuthorizedForChurch`, THEN THE Motor_RBAC SHALL rechazar la operación independientemente del rol del usuario.
3. THE Motor_RBAC SHALL evaluar `hasOperationalRole()` como verdadero únicamente cuando el `role` del usuario pertenece al conjunto {secretario, maestro, director_es}.
4. WHEN un Secretario o Maestro crea un recurso de tipo Unidad_Accion, Participante o Registro_Sabatico, THE Motor_RBAC SHALL exigir que el campo `iglesia_id` del recurso creado coincida exactamente con la `iglesia_id` de los Custom_Claims del usuario.
5. THE Sistema SHALL prevenir que una consulta de lista (listado) retorne documentos de una `iglesia_id` distinta a la autorizada para el usuario solicitante, incluso cuando el usuario provee filtros de consulta arbitrarios.

### Requirement 13: Auditoría de acciones

**User Story:** Como Admin_Global o Admin_Asociacion, quiero consultar un historial de auditoría de las acciones realizadas en el Sistema, para investigar incidentes y verificar el cumplimiento de los procesos administrativos.

#### Acceptance Criteria

1. WHEN cualquier operación de creación, actualización o eliminación es ejecutada exitosamente sobre una Iglesia, Distrito, Asociacion_Mision, Unidad_Accion, Participante, Registro_Sabatico, Seguimiento_Pastoral o Custom_Claims, THE Modulo_Auditoria SHALL registrar un evento con `uid` del actor, `accion`, `recurso_afectado`, `iglesia_id` (cuando aplique) y marca de tiempo del servidor.
2. THE Modulo_Auditoria SHALL almacenar cada evento de auditoría como inmutable, sin permitir su edición o eliminación por ningún rol distinto de Admin_Global.
3. WHEN un Admin_Global consulta el historial de auditoría, THE Modulo_Auditoria SHALL retornar los eventos filtrables por `iglesia_id`, `uid` del actor y rango de fechas.
4. WHEN un Admin_Asociacion consulta el historial de auditoría, THE Modulo_Auditoria SHALL retornar únicamente los eventos cuya `iglesia_id` pertenece a Iglesias de la `asociacion_id` de su propio token.
5. IF un usuario con rol `secretario`, `maestro`, `director_es`, `pastor_distrital`, `anciano` o `alumno` intenta consultar el historial de auditoría, THEN THE Modulo_Auditoria SHALL rechazar la operación y retornar un error de autorización.

### Requirement 14: Interfaz de Grilla de Asistencia de alto rendimiento

**User Story:** Como Maestro, quiero registrar la asistencia y el estudio diario de todos los Participantes de mi Unidad de Acción en una única vista tipo hoja de cálculo, para completar el registro sabático en el menor tiempo posible incluso con muchos Participantes.

#### Acceptance Criteria

1. WHEN un Maestro abre la Interfaz_Grilla_Asistencia de una Unidad_Accion con hasta 200 Participantes, THE Interfaz_Grilla_Asistencia SHALL renderizar la grilla completa en menos de 2 segundos en una conexión de red de referencia de 3 Mbps.
2. WHEN un Maestro modifica el valor de asistencia o estudio diario de un Participante en la grilla, THE Interfaz_Grilla_Asistencia SHALL actualizar únicamente la celda afectada en el estado local sin volver a renderizar las filas de los demás Participantes.
3. THE Interfaz_Grilla_Asistencia SHALL permitir la navegación entre celdas mediante teclado (flechas, tabulación) sin requerir el uso del mouse.
4. WHEN un Maestro guarda los cambios de la Interfaz_Grilla_Asistencia, THE Interfaz_Grilla_Asistencia SHALL enviar una única operación de escritura consolidada al Modulo_Registro_Sabatico en lugar de una escritura por cada Participante modificado.
5. THE Interfaz_Grilla_Asistencia SHALL cumplir con los criterios de accesibilidad de teclado y de contraste de color equivalentes al nivel AA de WCAG 2.1 en sus controles interactivos.

### Requirement 15: Rutas protegidas y control de acceso en el frontend

**User Story:** Como usuario del Sistema, quiero que la interfaz me redirija o me niegue el acceso a secciones que no corresponden a mi rol, para evitar confusión y prevenir intentos de acceso no autorizado.

#### Acceptance Criteria

1. WHEN un usuario no autenticado intenta acceder a una ruta protegida del Sistema, THE Sistema SHALL redirigir al usuario a la pantalla de inicio de sesión.
2. WHEN un usuario autenticado intenta acceder a una ruta cuya funcionalidad no corresponde a su `role` según la Matriz RBAC del Requerimiento 16, THE Sistema SHALL denegar la visualización de la ruta y mostrar un mensaje de acceso denegado.
3. WHEN un usuario autenticado con rol `alumno` accede a su panel principal, THE Sistema SHALL mostrar únicamente su propio estado de estudio diario, su asistencia histórica y las metas agregadas de su Unidad_Accion.
4. THE Sistema SHALL ocultar de la navegación principal las secciones para las cuales el `role` del usuario autenticado no tiene ningún permiso otorgado en la Matriz RBAC.

### Requirement 16: Matriz de Permisos (RBAC) explícita

**User Story:** Como responsable de seguridad del Sistema, quiero que los permisos de cada rol estén definidos de forma explícita y verificable, para garantizar que el Motor_RBAC y la interfaz de usuario aplican consistentemente el control de acceso.

#### Acceptance Criteria

1. THE Motor_RBAC SHALL autorizar la creación de Iglesias, Asociaciones y Distritos únicamente a los roles `admin_global` y `admin_asociacion`, este último restringido a su propia `asociacion_id`.
2. THE Motor_RBAC SHALL autorizar la visualización del Dashboard Analítico a los roles `admin_global`, `admin_asociacion`, `pastor_distrital`, `anciano` y `director_es`, cada uno restringido a su alcance territorial correspondiente.
3. THE Motor_RBAC SHALL autorizar la creación de Unidades de Acción y Participantes únicamente a los roles `admin_global`, `secretario` y `maestro`, restringidos a su propia `iglesia_id`.
4. THE Motor_RBAC SHALL autorizar la creación y modificación del Registro_Sabatico Core (asistencia) únicamente a los roles `admin_global`, `secretario` y `maestro`, restringidos a su propia `iglesia_id`.
5. THE Motor_RBAC SHALL autorizar el registro de Seguimiento_Pastoral únicamente a los roles `admin_global` y `maestro`, restringidos a las Unidades de Acción a su cargo.
6. THE Motor_RBAC SHALL autorizar el Check-in de Estudio Diario grupal únicamente a los roles `admin_global` y `maestro`, y el Autorregistro individual únicamente al rol `alumno` sobre su propio Participante vinculado.
7. THE Motor_RBAC SHALL restringir al rol `director_es` a operaciones de lectura sobre Unidades de Acción, Participantes y Registros_Sabaticos de su propia `iglesia_id`, sin autorizar creación, actualización ni eliminación de dichos recursos.
8. THE Motor_RBAC SHALL restringir a los roles `pastor_distrital` y `anciano` a operaciones de lectura agregada sobre las Iglesias de su propio `distrito_id`, sin autorizar el acceso a datos individuales de Participantes.

### Requirement 17: Validación de datos y manejo de errores

**User Story:** Como desarrollador del Sistema, quiero que toda entrada de datos sea validada de forma consistente y que los errores se manejen de manera predecible, para prevenir datos corruptos y facilitar el diagnóstico de fallas.

#### Acceptance Criteria

1. WHEN cualquier caso de uso del Sistema recibe un DTO de entrada, THE Sistema SHALL validar el DTO contra un esquema Zod correspondiente antes de ejecutar la lógica de negocio.
2. IF la validación de un DTO de entrada falla, THEN THE Sistema SHALL rechazar la operación sin efectos colaterales y retornar un error estructurado con el detalle de los campos inválidos.
3. IF una operación de infraestructura (Firestore, Cloud Function, API SearchChurch) falla de forma inesperada, THEN THE Sistema SHALL capturar la excepción, registrar el detalle técnico en el registro de errores del servidor y retornar al cliente un mensaje de error genérico sin exponer detalles internos.
4. THE Sistema SHALL clasificar todo error retornado al cliente en una de las categorías {validacion, autorizacion, no_encontrado, conflicto, error_interno} para permitir un manejo diferenciado en la interfaz.

### Requirement 18: Persistencia local y sincronización offline

**User Story:** Como Maestro que registra asistencia en lugares con conectividad limitada, quiero que mis registros se guarden localmente y se sincronicen automáticamente al recuperar la conexión, para no perder información capturada durante el sábado.

#### Acceptance Criteria

1. WHERE el dispositivo del Maestro pierde conectividad de red durante la edición de la Interfaz_Grilla_Asistencia, THE Modulo_Sincronizacion_Offline SHALL almacenar localmente los cambios pendientes sin bloquear la interacción del Maestro con la grilla.
2. WHEN la conectividad de red se restablece después de cambios pendientes almacenados localmente, THE Modulo_Sincronizacion_Offline SHALL sincronizar automáticamente los cambios pendientes con el Registro_Sabatico correspondiente en el servidor.
3. IF la sincronización de cambios pendientes detecta que el Registro_Sabatico remoto fue cerrado (`estado=cerrado`) mientras el Maestro estaba sin conexión, THEN THE Modulo_Sincronizacion_Offline SHALL rechazar la sincronización de esos cambios y notificar al Maestro para su revisión manual.
4. THE Modulo_Sincronizacion_Offline SHALL indicar visualmente en la Interfaz_Grilla_Asistencia cuándo existen cambios pendientes de sincronización.

### Requirement 19: Arquitectura del sistema y estructura del proyecto

**User Story:** Como desarrollador del Sistema, quiero que el código esté organizado siguiendo Clean Architecture y DDD, para mantener bajo acoplamiento entre la lógica de negocio y la infraestructura de Firebase, facilitando pruebas y evolución futura.

#### Acceptance Criteria

1. THE Sistema SHALL organizar el código fuente en capas separadas de Dominio, Aplicación, Infraestructura y Presentación, donde la capa de Dominio no depende de ningún módulo de Infraestructura o Presentación.
2. THE Sistema SHALL definir los repositorios de Iglesia, Unidad_Accion, Participante, Registro_Sabatico y Seguimiento_Pastoral como interfaces (puertos) en la capa de Aplicación, con sus implementaciones concretas de Firestore residiendo en la capa de Infraestructura.
3. THE Sistema SHALL exponer cada caso de uso de negocio (por ejemplo, registrar asistencia, cerrar semana, asignar Custom_Claims) como una función o clase de la capa de Aplicación invocable de forma independiente de Next.js o de Firebase Functions.
4. THE Sistema SHALL implementar las reglas de seguridad del Motor_RBAC en el archivo de reglas de Firestore de forma consistente con las autorizaciones validadas en la capa de Aplicación, de modo que ninguna operación autorizada por la capa de Aplicación sea rechazada por las reglas de Firestore, y viceversa.
5. THE Sistema SHALL mantener una cobertura de pruebas unitarias sobre los casos de uso de la capa de Aplicación y pruebas de integración sobre los repositorios de la capa de Infraestructura.

### Requirement 20: Cálculo temporal de Trimestre y Sabado_Eclesiastico

**User Story:** Como Secretario, quiero que el Sistema identifique automáticamente el trimestre y el número de sábado vigente según la zona horaria de mi Iglesia, para evitar errores manuales al generar el Registro_Sabatico.

#### Acceptance Criteria

1. WHEN el Modulo_Registro_Sabatico determina el `Sabado_Eclesiastico` vigente para una Iglesia, THE Modulo_Registro_Sabatico SHALL calcular la fecha usando la zona horaria IANA asociada a la Iglesia, no la zona horaria del servidor ni la del cliente.
2. THE Modulo_Registro_Sabatico SHALL calcular el `numero_sabado` dentro de un `Trimestre` como un valor entre 1 y 13, reiniciándose en 1 al inicio de cada nuevo `Trimestre`.
3. IF la Iglesia no tiene una zona horaria asociada configurada, THEN THE Modulo_Registro_Sabatico SHALL rechazar la creación de un nuevo Registro_Sabatico para esa Iglesia y solicitar la configuración de zona horaria.

### Requirement 21: Protección de datos personales y de menores de edad

**User Story:** Como Admin_Global, quiero que los datos personales de los Participantes, especialmente de quienes son menores de edad, estén protegidos y sean auditables, para cumplir con principios básicos de privacidad mientras se define el marco legal específico aplicable.

#### Acceptance Criteria

1. WHERE un Participante es registrado como menor de edad, THE Modulo_Participantes SHALL almacenar dicho estatus en un campo `es_menor_edad` sin exponerlo en ningún Dashboard Analítico agregado a nivel Distrito, Asociación o Global.
2. THE Sistema SHALL restringir la visualización de nombres y apellidos individuales de Participantes a los roles `admin_global`, `secretario`, `maestro`, `director_es` y al propio `alumno` sobre su Participante vinculado.
3. WHEN un Admin_Global recibe una solicitud de exportación o eliminación de los datos personales de un Participante, THE Sistema SHALL proveer una operación administrativa que compile o elimine los datos personales del Participante y registre la operación en el Modulo_Auditoria.
4. IF un rol distinto de `admin_global` intenta ejecutar una operación de exportación o eliminación masiva de datos personales, THEN THE Sistema SHALL rechazar la operación y retornar un error de autorización.

### Requirement 22: Inicio y cierre de sesión de usuario final

**User Story:** Como usuario del Sistema, quiero iniciar sesión con mi correo y contraseña y cerrar sesión cuando termine, para acceder únicamente a los datos y funciones correspondientes a mi rol durante mi sesión activa.

#### Acceptance Criteria

1. WHEN un usuario envía credenciales de correo y contraseña válidas desde la pantalla de inicio de sesión, THE Modulo_Autenticacion SHALL autenticar al usuario contra Firebase Auth y fijar la Cookie_Sesion con el ID token resultante como `httpOnly`.
2. IF un usuario envía credenciales de correo y contraseña inválidas, con formato inválido, con campos vacíos, o correspondientes a una cuenta inexistente, THEN THE Modulo_Autenticacion SHALL rechazar el inicio de sesión y mostrar en la pantalla de inicio de sesión un mensaje de error descriptivo sin fijar la Cookie_Sesion.
3. WHEN un usuario autenticado solicita cerrar sesión, THE Modulo_Autenticacion SHALL eliminar la Cookie_Sesion y redirigir al usuario a la pantalla de inicio de sesión.
4. WHEN un usuario que fue redirigido previamente a la pantalla de inicio de sesión desde una ruta protegida completa un inicio de sesión exitoso, THE Modulo_Autenticacion SHALL redirigir al usuario a la ruta protegida originalmente solicitada.
5. WHEN un usuario completa un inicio de sesión exitoso sin haber sido redirigido previamente a la pantalla de inicio de sesión desde una ruta protegida, THE Modulo_Autenticacion SHALL redirigir al usuario a la ruta raíz del Sistema.
6. IF la Cookie_Sesion es inválida o ha expirado, THEN THE Modulo_Autenticacion SHALL tratar al usuario como no autenticado conforme al criterio 15.1.
7. IF la fijación de la Cookie_Sesion falla tras una autenticación exitosa contra Firebase Auth, THEN THE Modulo_Autenticacion SHALL cerrar la sesión de cliente de Firebase Auth, rechazar el inicio de sesión y mostrar un mensaje de error descriptivo.

### Requirement 23: Enrutamiento y montaje de la aplicación

**User Story:** Como usuario del Sistema, quiero que cada sección funcional a la que tengo acceso esté disponible en una ruta real de la aplicación, para poder usar el Sistema de punta a punta y no solo sus componentes individuales.

#### Acceptance Criteria

1. THE Sistema SHALL exponer los tres componentes de presentación (Dashboard Analítico, Panel_Alumno e Interfaz_Grilla_Asistencia) en una ruta real del App Router perteneciente al segmento protegido correspondiente.
2. THE Sistema SHALL envolver cada ruta protegida con la guarda de sección correspondiente, aplicando la lógica de autorización definida en el Requirement 15.2, de modo que un usuario sin permiso de lectura sobre el recurso de esa ruta visualice la vista de acceso denegado ya implementada en lugar del contenido de la sección.
3. THE Sistema SHALL construir la estructura de navegación raíz de las rutas protegidas a partir del menú de navegación derivado de los Custom_Claims del usuario autenticado, ocultando las entradas hacia secciones sin ningún permiso otorgado.
4. WHEN un usuario autenticado cuyo `role` es alumno accede a la ruta raíz del Sistema, THE Sistema SHALL redirigir al usuario a Panel_Alumno.
5. WHEN un usuario autenticado cuyo `role` corresponde a alguno de los cinco roles con acceso analítico definidos en el Requirement 15.2 accede a la ruta raíz del Sistema, THE Sistema SHALL redirigir al usuario a Dashboard Analítico.
6. WHEN un usuario autenticado cuyo `role` es secretario o maestro accede a la ruta raíz del Sistema, THE Sistema SHALL redirigir al usuario a la primera entrada del menú de navegación correspondiente a su rol.
7. WHEN un usuario no autenticado accede a la ruta raíz del Sistema, THE Sistema SHALL redirigir al usuario a la pantalla de inicio de sesión.

### Requirement 24: Configuración de entorno de Firebase

**User Story:** Como desarrollador del Sistema, quiero disponer de una configuración de entorno documentada para los servicios de Firebase, para poder ejecutar la aplicación de forma local sin comprometer credenciales reales.

#### Acceptance Criteria

1. THE Sistema SHALL inicializar el SDK cliente de Firebase en tiempo de compilación exclusivamente a partir del conjunto de variables de entorno con prefijo `NEXT_PUBLIC_FIREBASE_` enumeradas de forma exhaustiva en el archivo de ejemplo de variables de entorno, sin requerir ninguna variable adicional fuera de ese conjunto documentado.
2. THE Sistema SHALL inicializar `firebase-admin` en el servidor exclusivamente a partir del conjunto de variables de entorno de credenciales de servicio enumeradas de forma exhaustiva en el archivo de ejemplo de variables de entorno.
3. THE Sistema SHALL abstenerse de incluir las variables de entorno de credenciales de servicio de `firebase-admin` en el código ejecutado en el navegador o en el bundle del cliente entregado al navegador.
4. THE Sistema SHALL proveer un archivo de ejemplo de variables de entorno que enumere de forma exhaustiva cada clave requerida por el SDK cliente de Firebase y por `firebase-admin`, con valores de marcador de posición y sin incluir credenciales reales.
5. IF una variable de entorno listada en el archivo de ejemplo no está definida al construir el Sistema, en el caso de las variables con prefijo `NEXT_PUBLIC_FIREBASE_`, o al iniciar el servidor, en el caso de las variables de credenciales de servicio de `firebase-admin`, THEN THE Sistema SHALL impedir la inicialización completa del componente afectado y señalar de forma explícita cuál variable falta, en lugar de continuar con una inicialización parcial o fallar con un error no descriptivo.
6. THE Sistema SHALL documentar en el README, para cada variable de entorno listada en el archivo de ejemplo, su propósito, el origen desde el cual obtener su valor real en el proyecto de Firebase correspondiente, y los pasos para configurar el entorno de desarrollo local del Sistema.
