# Reglas Tecnicas de Aplicaciones SSEI
Fecha: 2026-07-20
Estado: Vigente (baseline de normalizacion backend)

## 1. Objetivo
Establecer reglas tecnicas unificadas para Backend, SSEI Admin y SSEI Mobile, con foco en:
- consistencia del modelo de datos
- validaciones obligatorias
- responsabilidad por rol
- trazabilidad y auditoria
- integracion Admin-Mobile sobre una unica fuente de verdad en backend

## 2. Alcance
Estas reglas aplican a:
- API Backend FastAPI
- SSEI Admin (Web)
- SSEI Mobile (App)
- contratos de datos OT Core y OT Ejecucion

## 3. Principios de Arquitectura
- El backend es la fuente de verdad de datos sincronizados.
- SSEI Admin crea y administra OT Core.
- SSEI Mobile completa ejecucion en terreno sobre una OT existente.
- Ningun cliente define el identificador principal de OT.
- Toda accion sensible debe quedar auditada.

## 4. Reglas de Nomenclatura y Contratos
- Backend expone payloads en snake_case.
- Frontends manejan propiedades internas en camelCase.
- Todo frontend debe mapear explicitamente snake_case <-> camelCase.
- Prohibido hardcodear base URL en servicios frontend; usar environments.

## 5. Modelo OT Canonico

## 5.1 OT Core (creada por Coordinador)
Campos obligatorios al crear OT:
- numero_atm
- direccion
- hora_programada
- banco
- tipo_servicio
- tecnico_id

Campos generados por backend:
- id (autoincremental)
- fecha_creacion
- estado_inicial
- creado_por_id (si hay autenticacion)

Regla obligatoria:
- El Coordinador SIEMPRE crea la OT Core.
- El id de OT SIEMPRE lo genera backend.
- Mobile no puede crear OT Core.

## 5.2 OT Ejecucion (completada por Tecnico desde Mobile)
Campos de ejecucion en terreno (ejemplos):
- observaciones
- series de equipo
- mediciones electricas
- evidencias fotograficas
- nombre ucenco
- nombre tecnico
- nombre etv
- nombre alarma
- firmas
- ubicacion
- direcccion o geolocalizacion
- fecha_hora_real_actividad

Regla obligatoria:
- Estos datos se asocian a una OT ya creada.
- Toda evidencia debe referenciar id de OT valido.

## 6. Reglas de Estados de OT
Estados permitidos:
- creada
- asignada
- en_progreso
- pendiente_envio
- sincronizada
- cerrada

Reglas:
- backend valida transiciones permitidas
- no se permite salto de estados fuera del flujo definido
- todo cambio de estado registra usuario, fecha y detalle de accion

## 7. Matriz RBAC Minima
- admin: gestion global, usuarios, auditoria, configuracion
- coordinador: crea OT Core, asigna tecnico, edita OT Core, cambia estados operativos
- tecnico: consulta OTs asignadas, registra ejecucion en terreno y sincroniza evidencias
- externo: solo lectura de OTs autorizadas y estado general

Reglas:
- cada endpoint debe declarar rol minimo requerido
- backend debe rechazar acceso por rol con 403
- acciones de admin/coordinador/tecnico deben registrar auditoria

## 8. Reglas de Validacion de Datos
- Validar obligatorios de OT Core en backend, no solo en frontend.
- Validar formatos de hora_programada y longitud de campos.
- Validar que tecnico_id exista y este activo antes de crear OT.
- Validar que numero_atm y tipo_servicio tengan valores permitidos.
- Validar sanitizacion de strings y limites maximos.
- Responder errores de validacion con estructura consistente.

## 9. Reglas de API y Errores
- Respuestas de exito: 200/201/204 segun operacion.
- Errores funcionales:
- 400 para request invalido
- 401 para no autenticado
- 403 para sin permisos
- 404 para recurso no encontrado
- 409 para conflictos de negocio
- 422 para validacion semantica de payload
- Error body estandar:
- code
- message
- details
- trace_id opcional

## 10. Reglas de Persistencia y ORM
- SQLAlchemy ORM como capa oficial de acceso a datos.
- Alembic obligatorio para migraciones versionadas.
- Prohibido mezclar ORM y SQL suelto para casos transaccionales comunes.
- Una sesion por request en API.
- Commit y rollback controlado por capa de aplicacion/repositorio.
- Entidades de dominio separadas de modelos ORM.

## 11. Reglas de Seguridad
- Password nunca se recibe como hashed_password desde frontend.
- Backend recibe password plano, aplica hash seguro y persiste hash.
- Autenticacion recomendada: JWT con expiracion corta y refresh controlado.
- Autorizacion por rol obligatoria en endpoints administrativos.
- CORS restringido por entorno (dev, qa, prod), no abierto en produccion.
- Datos sensibles en variables de entorno, no en codigo.

## 12. Reglas de Auditoria
Acciones minimas auditables:
- creacion de OT
- asignacion o cambio de tecnico
- cambio de estado OT
- edicion de datos OT Core
- alta/baja de usuario
- acceso a vistas administrativas sensibles

Campos minimos de auditoria:
- user_id
- action
- details
- created_at
- origen (admin o mobile)
- entidad_afectada y entidad_id

## 13. Reglas de Integracion Admin-Mobile
- Admin crea OT Core y asigna tecnico.
- Mobile consume OTs asignadas por tecnico_id.
- Mobile sincroniza ejecucion por id de OT.
- Backend resuelve conflictos con version o updated_at.
- Mobile debe soportar cola de sincronizacion con reintentos y estado de error.

## 14. Reglas de Calidad y Pruebas
- Pruebas unitarias de reglas de negocio.
- Pruebas de integracion API con base de datos de test.
- Pruebas de autorizacion por rol.
- Pruebas de transicion de estados.
- Pruebas de sincronizacion Mobile para casos offline y reintento.

## 15. Definicion de Hecho (DoD) para cambios backend
Un cambio backend se considera terminado cuando:
- cumple estas reglas tecnicas
- incluye migracion si cambia esquema
- incluye pruebas automatizadas
- actualiza contrato API y documentacion
- mantiene compatibilidad con Admin y Mobile o incluye plan de versionado

## 16. Regla Critica Oficial de OT (resumen ejecutivo)
- El Coordinador crea la OT con:
- numero ATM
- direccion
- hora
- banco
- tipo de servicio
- tecnico correspondiente
- El backend genera automaticamente el id de OT.
- El Tecnico completa en Mobile los datos en terreno.
- Sin esta regla, la OT no es valida para el flujo SSEI.
