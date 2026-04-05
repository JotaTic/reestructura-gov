"""
Genera el Manual de Usuario de ReEstructura.Gov como archivo .docx.

Reutiliza `apps.common.exports.build_docx` para producir un documento Word
con portada, índice de perfiles de usuario, credenciales, descripción de los
10 módulos y todas las acciones que cada módulo expone en la plataforma.

Uso:
    cd plataforma/backend
    .venv\\Scripts\\python.exe scripts/generate_user_manual.py

El archivo se escribe en la raíz del proyecto como
`Manual_Usuario_ReEstructura.docx`.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Permite ejecutar el script directamente sin Django settings configurado.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402

django.setup()

from apps.common.exports import build_docx  # noqa: E402


# ---------------------------------------------------------------------------
# Datos del manual
# ---------------------------------------------------------------------------

TITLE = 'Manual de Usuario — ReEstructura.Gov'

META = [
    ('Plataforma', 'ReEstructura.Gov'),
    ('Propósito', 'Diseño y rediseño institucional de entidades públicas colombianas'),
    ('Marco legal', 'Ley 489/1998 · Ley 790/2002 · Ley 909/2004 · CPACA (Ley 1437/2011) · '
                    'Decreto 1083/2015 · Decreto 785/2005 · Decreto 2489/2006 · Cartilla FP 2018'),
    ('Versión del manual', '1.0'),
    ('URL frontend', 'http://localhost:3000/'),
    ('URL backend (API)', 'http://localhost:8000/api/'),
    ('Admin Django', 'http://localhost:8000/admin/'),
    ('Documentación API', 'http://localhost:8000/api/docs/'),
]


# ---------------------------------------------------------------------------
# Usuarios de ejemplo (sembrados con `manage.py seed_users`)
# ---------------------------------------------------------------------------

USERS = [
    # (usuario, contraseña, grupo, nombre, email, resumen, alcance)
    ('admin', 'admin123', 'Administrador', 'Administrador Plataforma',
     'admin@reestructura.gov.co',
     'Control total de la plataforma. Crea entidades, usuarios, grupos y '
     'accede al Admin de Django.',
     'Todos los módulos · Gestión de usuarios · Admin de Django · Configuración de Jota'),
    ('planeacion', 'planeacion123', 'Planeación', 'Jefe de Planeación',
     'planeacion@entidad.gov.co',
     'Lidera el diagnóstico institucional, la evaluación de procesos y la '
     'construcción de la estructura orgánica propuesta.',
     'M6 Diagnóstico · M8 Procesos · M9 Estructura Orgánica · M5 Base Legal (lectura)'),
    ('talento', 'talento123', 'Talento Humano', 'Jefe de Talento Humano',
     'talento@entidad.gov.co',
     'Responsable del levantamiento de cargas de trabajo, la planta de '
     'personal, el manual específico de funciones y el retén social.',
     'M10 Matriz de Cargas · M11 Planta de Personal · M12 Manual de Funciones · '
     'M13 Retén Social'),
    ('juridica', 'juridica123', 'Jurídica', 'Jefe Jurídica',
     'juridica@entidad.gov.co',
     'Revisa y valida la base legal aplicable y la redacción de los actos '
     'administrativos (decretos, ordenanzas, acuerdos, resoluciones).',
     'M5 Base Legal · M14 Actos Administrativos · M13 Retén Social (revisión)'),
    ('secretaria', 'secretaria123', 'Secretaría General', 'Secretario General',
     'secretaria@entidad.gov.co',
     'Coordina la expedición de los actos administrativos y la publicación '
     'de los documentos del expediente.',
     'M14 Actos Administrativos · Todos los módulos (lectura)'),
    ('financiera', 'financiera123', 'Financiera', 'Jefe Financiera',
     'financiera@entidad.gov.co',
     'Responsable del análisis financiero, el cumplimiento de la Ley '
     '617/2000 y el costeo de la planta propuesta.',
     'M7 Análisis Financiero · M11 Planta de Personal (costeo)'),
    ('tecnico', 'tecnico123', 'Equipo Técnico', 'Consultor Técnico',
     'tecnico@entidad.gov.co',
     'Consultor externo o equipo técnico que apoya el rediseño. Trabaja en '
     'todos los módulos del estudio técnico.',
     'Todos los módulos transaccionales · M5 Base Legal (lectura)'),
    ('consulta', 'consulta123', 'Consulta', 'Usuario de Consulta',
     'consulta@entidad.gov.co',
     'Rol de solo lectura para auditores, supervisores y stakeholders. '
     'Puede ver toda la información pero no modificarla.',
     'Todos los módulos (solo lectura)'),
]


# ---------------------------------------------------------------------------
# Secciones del manual
# ---------------------------------------------------------------------------

SECTIONS: list[dict] = [
    {
        'heading': '1. Introducción',
        'description': (
            'ReEstructura.Gov es una plataforma web diseñada para acompañar los '
            'procesos de diseño y rediseño institucional de entidades públicas '
            'colombianas. Implementa paso a paso las fases de la Cartilla de '
            'Diseño y Rediseño Institucional de la Función Pública (2018) y '
            'garantiza la trazabilidad entre diagnóstico, procesos, cargas de '
            'trabajo, planta de personal, manual de funciones, retén social y '
            'actos administrativos.'
        ),
        'headers': ['Concepto', 'Descripción'],
        'rows': [
            ['Tenant', 'Cada entidad es un tenant lógico. Los datos están aislados por '
                       'entidad y por reestructuración.'],
            ['Reestructuración', 'Expediente de estudio técnico. Una entidad puede tener '
                                 'varias (por ejemplo: Rediseño 2023, Rediseño 2026).'],
            ['Contexto activo', 'En el topbar siempre está seleccionada una entidad y, '
                                'cuando aplica, una reestructuración. Todos los módulos '
                                'operan dentro de ese contexto.'],
            ['Idioma', 'Español (Colombia).'],
            ['Responsive', 'Funciona en desktop, tablet y móvil.'],
        ],
    },
    {
        'heading': '2. Acceso y autenticación',
        'description': (
            'Para ingresar a la plataforma abre http://localhost:3000/ en tu '
            'navegador. Si no tienes sesión activa, serás redirigido '
            'automáticamente a /login. Ingresa con tu usuario y contraseña (ver '
            'la sección de perfiles más adelante). Marca la casilla '
            '"Recordar usuario" para que la próxima vez se autocomplete el '
            'campo. La contraseña nunca se guarda en el navegador.'
        ),
        'headers': ['Acción', 'Cómo'],
        'rows': [
            ['Iniciar sesión', 'Ir a /login, ingresar usuario y contraseña, hacer clic en Ingresar.'],
            ['Recordar usuario', 'Marcar la casilla en la pantalla de login antes de entrar.'],
            ['Cerrar sesión', 'Menú de usuario en el topbar → Cerrar sesión.'],
            ['Seleccionar entidad activa', 'Selector de entidad en el topbar.'],
            ['Seleccionar reestructuración', 'Selector de reestructuración en el topbar (después de la entidad).'],
            ['Crear nueva reestructuración', 'Selector de reestructuración → Crear nueva reestructuración.'],
            ['Cambiar de contexto', 'Volver a abrir el selector del topbar y elegir otro valor. Los módulos refrescan automáticamente.'],
        ],
        'notes': 'Si un módulo responde con "Debes seleccionar una entidad/reestructuración para continuar", '
                 'abre el selector del topbar.',
    },
    {
        'heading': '3. Perfiles de usuario y credenciales de ejemplo',
        'description': (
            'La plataforma trae 8 usuarios de ejemplo creados por el comando '
            '`python manage.py seed_users`. Se corresponden con los roles '
            'definidos en el numeral 2 de la Fase 1 de la Cartilla FP. Cada '
            'usuario pertenece a un grupo (perfil) que delimita su ámbito de '
            'trabajo en la plataforma.\n\n'
            'IMPORTANTE: Estas credenciales son para ambiente de desarrollo y '
            'pruebas. En producción DEBEN cambiarse antes de abrir el acceso.'
        ),
        'headers': ['Usuario', 'Contraseña', 'Perfil (grupo)', 'Nombre completo', 'Correo'],
        'rows': [[u[0], u[1], u[2], u[3], u[4]] for u in USERS],
    },
    {
        'heading': '4. Resumen de permisos por perfil',
        'description': (
            'Qué puede hacer cada tipo de usuario dentro de la plataforma. '
            'En el MVP actual todos los usuarios autenticados tienen acceso a '
            'las vistas; el aislamiento granular por grupo se activará cuando '
            'se integren los permisos de Django por modelo.'
        ),
        'headers': ['Perfil', 'Puede hacer', 'Alcance en módulos'],
        'rows': [[u[2], u[5], u[6]] for u in USERS],
    },

    # ------------------------------------------------------------------
    # Módulos: uno por sección
    # ------------------------------------------------------------------
    {
        'heading': '5. Módulo Transversal — Entidades',
        'description': (
            'Punto de entrada de la plataforma. Registra las entidades '
            'públicas sobre las que se realizará el rediseño. Cada entidad '
            'actúa como tenant lógico: sus datos están aislados del resto.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Ver listado de entidades', '/entidades', 'Muestra todas las entidades registradas con buscador y filtros.'],
            ['Crear entidad', '/entidades → Nueva entidad',
             'Llenar nombre, sigla, orden (nacional/departamental/distrital/municipal), '
             'categoría municipal, naturaleza jurídica, NIT y norma de creación.'],
            ['Editar entidad', '/entidades/<id>',
             'Completar los 4 interrogantes del acuerdo inicial (problema, objetivos, '
             'enfoque, riesgos) y los insumos vigentes (acto de estructura, de planta y de manual).'],
            ['Eliminar entidad', '/entidades/<id> → Eliminar', 'Requiere confirmación. Elimina también sus reestructuraciones.'],
            ['Seleccionar como activa', 'Topbar → selector de entidad', 'Activa el contexto para los demás módulos.'],
            ['Listar reestructuraciones', '/entidades/<id>/reestructuraciones', 'Ver todas las reestructuraciones (expedientes) asociadas.'],
            ['Exportar estructura orgánica', '/estructura → Excel/Word/PDF/Imprimir',
             'Descarga el árbol de dependencias de la entidad activa en cualquier formato.'],
        ],
    },

    {
        'heading': '6. Módulo Transversal — Reestructuraciones',
        'description': (
            'Una reestructuración es un expediente de estudio técnico '
            'asociado a una entidad. Todos los módulos del estudio técnico '
            '(Diagnóstico, Procesos, Matriz de Cargas, Planta, Manual, Retén '
            'Social y Actos) pertenecen a una reestructuración específica.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Crear reestructuración', 'Topbar → selector de reestructuración → Crear nueva',
             'Nombre, fecha de referencia, descripción.'],
            ['Seleccionar como activa', 'Topbar → selector', 'Activa el contexto del expediente.'],
            ['Cambiar estado', 'Admin Django o API', 'Borrador → En curso → Aprobada → Implementada → Archivada.'],
            ['Eliminar', 'Admin o API', 'Borra todo el expediente (diagnóstico, cargas, planta, actos).'],
        ],
        'notes': 'Al cambiar de entidad en el topbar, la reestructuración activa se limpia automáticamente '
                 'porque pertenece a una entidad específica.',
    },

    {
        'heading': '7. M5 — Base Legal',
        'description': (
            'Catálogo de normas y jurisprudencia aplicables al rediseño '
            'institucional. Incluye Constitución, leyes, decretos, '
            'resoluciones, sentencias de la Corte Constitucional y del '
            'Consejo de Estado, y documentos CONPES. Es el repositorio '
            'consultable por todos los módulos.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Consultar normas', '/base-legal', 'Ver catálogo completo en formato de tarjetas.'],
            ['Buscar norma', '/base-legal → barra de búsqueda', 'Filtra por referencia, título, resumen, artículos clave o aplicación.'],
            ['Filtrar por tipo', '/base-legal → selector de tipo',
             'Constitución, Ley, Decreto, Resolución, Sentencia CC, Sentencia CE, CONPES, Otro.'],
            ['Exportar catálogo a Excel', '/base-legal → Excel', 'Descarga todo el catálogo filtrado.'],
            ['Exportar catálogo a Word', '/base-legal → Word', 'Descarga un documento de Word con el catálogo.'],
            ['Imprimir / PDF', '/base-legal → Imprimir o PDF', 'Abre el diálogo del navegador; para PDF elegir "Guardar como PDF".'],
        ],
        'notes': 'Normas cargadas: Ley 489/1998, Ley 790/2002, Ley 909/2004, CPACA, '
                 'Decretos 785/2005, 1083/2015, 2489/2006, y sentencias T-014/07, T-078/09, 0402-08.',
    },

    {
        'heading': '8. M6 — Diagnóstico Institucional',
        'description': (
            'Fase 2 de la Cartilla FP 2018. Analiza la situación actual de '
            'la entidad en cinco dimensiones: rol institucional, DOFA, marco '
            'legal correlacionado, análisis de entornos y evaluación de '
            'procesos. Es la base técnica del rediseño.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Listar diagnósticos', '/diagnostico', 'Ver todos los diagnósticos del expediente activo.'],
            ['Crear diagnóstico', '/diagnostico → Nuevo diagnóstico', 'Nombre y fecha de referencia.'],
            ['Abrir diagnóstico', '/diagnostico/<id>', 'Editor con 4 pestañas: Rol, DOFA, Marco legal, Entornos.'],
            ['Editar rol institucional', '/diagnostico/<id> → pestaña Rol',
             'Misión, visión, análisis de funciones, duplicidades. Botón Guardar.'],
            ['Agregar ítem DOFA', '/diagnostico/<id> → pestaña DOFA → +',
             'Tipo (F/D/O/A), dimensión (directiva, competitiva, técnica, tecnológica, talento humano), '
             'descripción y prioridad.'],
            ['Editar DOFA existente', '/diagnostico/<id> → DOFA → click en ítem', 'Modifica campos y guarda.'],
            ['Eliminar ítem DOFA', '/diagnostico/<id> → DOFA → ícono papelera', 'Requiere confirmación.'],
            ['Agregar referencia legal', '/diagnostico/<id> → pestaña Marco legal → +',
             'Norma, artículo, tema y la decisión del rediseño que la invoca (obligatoria).'],
            ['Agregar análisis de entorno', '/diagnostico/<id> → pestaña Entornos → +',
             'Dimensión (económico, político, social, tecnológico, cultural, otro), descripción e impacto.'],
            ['Exportar diagnóstico a Excel', '/diagnostico/<id> → Excel',
             'Archivo con Rol, DOFA agrupado por tipo, marco legal y entornos.'],
            ['Exportar diagnóstico a Word', '/diagnostico/<id> → Word', 'Documento Word con el diagnóstico completo.'],
            ['Imprimir / PDF', '/diagnostico/<id> → Imprimir o PDF', 'Versión optimizada para impresión.'],
        ],
    },

    {
        'heading': '9. M7 — Análisis Financiero',
        'description': (
            'Evalúa la sostenibilidad presupuestal de la planta propuesta. '
            'Registra los indicadores fiscales por año y calcula automática- '
            'mente el cumplimiento de la Ley 617/2000 (gastos de funciona- '
            'miento sobre ICLD) y la Ley 358/1997 (capacidad de endeudamiento).'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Ver años fiscales', '/financiero', 'Tabla con ICLD, gastos y cumplimiento por año.'],
            ['Agregar año fiscal', '/financiero → +',
             'Año, ICLD, gastos de funcionamiento, gastos de personal, límite Ley 617, deuda.'],
            ['Editar año existente', '/financiero → click en fila', 'Los indicadores se recalculan al guardar.'],
            ['Ver indicador del último año', '/financiero → tarjeta superior',
             'Muestra el % funcionamiento/ICLD y si cumple el límite según categoría municipal.'],
            ['Eliminar año fiscal', '/financiero → papelera', 'Requiere confirmación.'],
            ['Exportar a Excel', '/financiero → Excel', 'Todos los indicadores por año en una hoja.'],
            ['Exportar a Word', '/financiero → Word', 'Documento con tabla de indicadores fiscales.'],
            ['Imprimir / PDF', '/financiero → Imprimir o PDF', 'Versión impresa para el expediente.'],
        ],
        'notes': 'El límite de la Ley 617/2000 depende de la categoría municipal configurada en la entidad.',
    },

    {
        'heading': '10. M8 — Procesos y Cadena de Valor',
        'description': (
            'Construye el mapa de procesos de la entidad (estratégicos, '
            'misionales, de apoyo y de evaluación) y la cadena de valor '
            '(Insumos → Procesos → Productos → Efectos → Impactos). Es '
            'insumo obligatorio para el levantamiento de cargas de trabajo.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Listar mapas de procesos', '/procesos', 'Ver todos los mapas del expediente (actual y propuesto).'],
            ['Crear mapa de procesos', '/procesos → Nuevo mapa',
             'Nombre, tipo (actual/propuesto), fecha de referencia.'],
            ['Abrir mapa', '/procesos/<id>', 'Editor con pestañas Procesos y Cadena de valor.'],
            ['Agregar proceso', '/procesos/<id> → Procesos → +',
             'Código, nombre, tipo (estratégico/misional/apoyo/evaluación), descripción y los 3 '
             'interrogantes del numeral 3.4: ¿requerido?, ¿lo ejecuta la entidad?, ¿duplicado?'],
            ['Editar proceso', '/procesos/<id> → click en fila', 'Modificar cualquier campo.'],
            ['Eliminar proceso', '/procesos/<id> → papelera', 'Requiere confirmación.'],
            ['Agregar eslabón cadena de valor', '/procesos/<id> → Cadena de valor → +',
             'Eslabón (insumo/proceso/producto/efecto/impacto), descripción y proceso relacionado.'],
            ['Exportar a Excel', '/procesos/<id> → Excel', 'Una hoja por tipo de proceso + hoja de cadena de valor.'],
            ['Exportar a Word', '/procesos/<id> → Word', 'Documento con el mapa completo.'],
            ['Imprimir / PDF', '/procesos/<id> → Imprimir o PDF', 'Versión impresa.'],
        ],
    },

    {
        'heading': '11. M9 — Estructura Orgánica',
        'description': (
            'Diseño y rediseño del organigrama institucional. Permite '
            'visualizar el árbol de dependencias con niveles jerárquicos '
            'y agrupación funcional. Las dependencias se administran en '
            '/dependencias.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Ver organigrama', '/estructura', 'Árbol jerárquico con colapsado/expandido.'],
            ['Administrar dependencias', '/dependencias', 'Listado plano para editar.'],
            ['Crear dependencia', '/dependencias → +',
             'Nombre, código, dependencia padre (opcional, define la jerarquía), orden de presentación.'],
            ['Editar dependencia', '/dependencias → click en fila', 'Modifica nombre, padre u orden.'],
            ['Eliminar dependencia', '/dependencias → papelera',
             'Requiere confirmación. Si tiene hijas se bloquea la eliminación.'],
            ['Exportar estructura a Excel', '/estructura → Excel', 'Tabla plana con indentación por nivel.'],
            ['Exportar estructura a Word', '/estructura → Word', 'Documento con el árbol jerárquico.'],
            ['Imprimir / PDF', '/estructura → Imprimir o PDF', 'Vista imprimible del árbol.'],
        ],
        'notes': 'El árbol alimenta automáticamente la Planta de Personal, el Manual de Funciones y las '
                 'plantillas de Actos Administrativos.',
    },

    {
        'heading': '12. M10 — Matriz de Cargas de Trabajo',
        'description': (
            'Materializa el Anexo 5 de Función Pública. Se levanta actividad '
            'por actividad, por dependencia y por cargo, con frecuencia '
            'mensual y tiempos Tmin/TU/Tmax. La plataforma calcula '
            'automáticamente el Tiempo Estándar y las horas-hombre/mes.\n\n'
            'Fórmula: TE = [(Tmin + 4·TU + Tmax)/6] × 1.07\n'
            'Jornada de referencia: 167 h/mes (44 h × 228 días / 12).'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Listar matrices', '/matrices', 'Ver todas las matrices del expediente activo.'],
            ['Crear matriz', '/matrices → Nueva matriz', 'Nombre y fecha de referencia.'],
            ['Abrir matriz', '/matrices/<id>', 'Editor con grilla de actividades por dependencia.'],
            ['Levantar actividad', '/matrices/<id> → + Nueva actividad',
             'Dependencia, cargo (denominación + código + grado), proceso, actividad, '
             'procedimiento, frecuencia/mes, Tmin, TU, Tmax.'],
            ['Editar actividad', '/matrices/<id> → click en celda', 'Edición inline en la grilla.'],
            ['Eliminar actividad', '/matrices/<id> → papelera de fila', 'Requiere confirmación.'],
            ['Guardar cambios', '/matrices/<id> → Guardar', 'Guarda todas las filas modificadas en un solo request (bulk).'],
            ['Consolidar por nivel', '/matrices/<id> → Consolidar',
             'Muestra totales de empleos por nivel (directivo, asesor, profesional, técnico, asistencial).'],
            ['Consolidar por cargo', '/matrices/<id> → Consolidar → por cargo',
             'Agrupa por denominación + código + grado y suma horas-hombre/mes.'],
            ['Exportar Excel (Anexo 5)', '/matrices/<id> → Excel',
             'Archivo .xlsx con una hoja por dependencia (Formulario 1) y una de resumen '
             '(Formulario 2), compatible con el Anexo 5 de FP.'],
            ['Exportar a Word', '/matrices/<id> → Word', 'Documento Word con la matriz agrupada por dependencia.'],
            ['Imprimir / PDF', '/matrices/<id> → Imprimir o PDF', 'Versión impresa.'],
        ],
    },

    {
        'heading': '13. M11 — Planta de Personal',
        'description': (
            'Diseño de la planta actual y propuesta, con nomenclatura CNSC, '
            'equivalencias (Decreto 785/2005 territorial, Decreto 2489/2006 '
            'nacional), costeo mensual/anual y comparativo automático entre '
            'ambas plantas. Sustenta el numeral 3.9 de la exposición de '
            'motivos del estudio técnico.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Listar plantas', '/planta', 'Ver plantas actuales y propuestas del expediente.'],
            ['Crear planta', '/planta → Nueva planta',
             'Tipo (ACTUAL o PROPUESTA), estructura (global/estructural), nombre, fecha, acto que la adopta.'],
            ['Abrir planta', '/planta/<id>', 'Editor con grilla de cargos y totales.'],
            ['Agregar cargo', '/planta/<id> → + Nuevo cargo',
             'Nivel jerárquico, denominación (autocompletada desde nomenclatura), código, grado, '
             'dependencia, cantidad, asignación básica mensual.'],
            ['Editar cargo', '/planta/<id> → click en celda', 'Edición inline.'],
            ['Eliminar cargo', '/planta/<id> → papelera', 'Requiere confirmación.'],
            ['Ver totales', '/planta/<id>', 'Muestra cargos totales, costo mensual y costo anual (×12).'],
            ['Guardar cambios', '/planta/<id> → Guardar', 'Guardado bulk.'],
            ['Comparar plantas', '/planta/comparar',
             'Selecciona una planta ACTUAL y una PROPUESTA. Muestra delta de cantidad y de costo por cargo.'],
            ['Exportar a Excel', '/planta/<id> → Excel', 'Hoja por nivel jerárquico + hoja de totales.'],
            ['Exportar a Word', '/planta/<id> → Word', 'Documento con la planta agrupada por nivel.'],
            ['Imprimir / PDF', '/planta/<id> → Imprimir o PDF', 'Vista imprimible.'],
        ],
        'notes': 'El cálculo anual aplica 12 × costo mensual. Para valores con prestaciones sociales '
                 'completas se debe ajustar el factor en la fórmula (por ahora constante ×12).',
    },

    {
        'heading': '14. M12 — Manual Específico de Funciones',
        'description': (
            'Genera automáticamente, a partir del levantamiento de cargas '
            '(Módulo 10), una ficha por cargo con propósito principal, '
            'funciones esenciales, competencias laborales (comunes, '
            'comportamentales por nivel según Decreto 815/2018, y '
            'funcionales) y requisitos mínimos (estudios + experiencia).'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Abrir manual', '/manual-funciones', 'Lista de matrices disponibles en el expediente.'],
            ['Seleccionar matriz', '/manual-funciones → selector de matriz', 'El manual se regenera desde los datos de esa matriz.'],
            ['Ver ficha de cargo', '/manual-funciones', 'Cada ficha muestra identificación, propósito, funciones esenciales, competencias y requisitos.'],
            ['Editar ficha', '(en roadmap)', 'Actualmente el manual es generado; la edición manual por ficha está prevista en próxima iteración.'],
            ['Exportar manual a Excel', '/manual-funciones → Excel', 'Un archivo con una sección por cargo.'],
            ['Exportar manual a Word', '/manual-funciones → Word', 'Documento Word con fichas listas para el expediente.'],
            ['Imprimir / PDF', '/manual-funciones → Imprimir o PDF',
             'Abre el diálogo del navegador. Elegir "Guardar como PDF" produce el manual listo para firmar.'],
        ],
        'notes': 'Las competencias comunes y comportamentales por nivel se cargan automáticamente según el '
                 'Decreto 815/2018. Las funcionales son específicas por cargo y se pueden editar.',
    },

    {
        'heading': '15. M13 — Retén Social',
        'description': (
            'Registra los servidores con protección laboral reforzada en '
            'procesos de supresión de empleos: pre-pensionados, madres/padres '
            'cabeza de familia, personas con discapacidad, mujeres en '
            'embarazo o lactancia y aforados sindicales. Marco legal: Ley '
            '790/2002 art. 12, Decreto 190/2003, Ley 361/1997 y jurisprudencia '
            'T-014/07, T-078/09 y 25000-23-25-000-2001-07679-02.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Ver retén', '/reten-social', 'Lista de empleados protegidos con filtros por tipo de protección y estado.'],
            ['Agregar empleado protegido', '/reten-social → + Nuevo',
             'Nombre, tipo y número de documento, cargo, dependencia, tipo de protección, '
             'fechas, soporte documental.'],
            ['Editar registro', '/reten-social → click en fila', 'Modifica cualquier campo del registro.'],
            ['Marcar como inactivo', '/reten-social → desmarcar casilla Vigente',
             'La protección deja de aplicar pero el registro queda histórico.'],
            ['Eliminar registro', '/reten-social → papelera', 'Requiere confirmación. Evitar eliminar por trazabilidad.'],
            ['Filtrar por tipo', '/reten-social → selector',
             'Madre cabeza, Padre cabeza, Discapacidad, Pre-pensionado, Embarazo, Lactancia, Fuero sindical.'],
            ['Exportar a Excel', '/reten-social → Excel', 'Lista completa agrupada por tipo de protección.'],
            ['Exportar a Word', '/reten-social → Word', 'Documento con los empleados protegidos.'],
            ['Imprimir / PDF', '/reten-social → Imprimir o PDF', 'Versión impresa para el expediente.'],
        ],
        'notes': 'La supresión de empleos que afecte a personas del retén debe contar con debido proceso y '
                 'garantizar estabilidad reforzada (art. 44 Ley 909/2004).',
    },

    {
        'heading': '16. M14 — Generador de Actos Administrativos',
        'description': (
            'Produce los borradores de los actos que cierran la Fase 4 '
            '(Implementación): decreto/ordenanza/acuerdo de estructura, '
            'resolución de adopción de planta, acto de supresión y creación '
            'de cargos, manual específico, escala salarial y liquidación de '
            'entidades. Las plantillas traen marcadores que se rellenan con '
            'el contexto de la entidad activa.'
        ),
        'headers': ['Acción', 'Ubicación', 'Descripción'],
        'rows': [
            ['Ver borradores', '/actos', 'Lista de todos los borradores del expediente.'],
            ['Ver plantillas disponibles', '/actos → Plantillas',
             'Catálogo global con Decreto, Ordenanza, Acuerdo, Resolución, Estatutos. Filtrable por tipo, '
             'ámbito y tema.'],
            ['Generar borrador desde plantilla', '/actos → Plantillas → Generar borrador',
             'La plataforma inyecta nombre de entidad, norma de creación, planta propuesta, etc. en '
             'los marcadores {entity_name}, {creation_norm}, etc.'],
            ['Abrir borrador', '/actos/<id>', 'Editor del cuerpo del acto.'],
            ['Editar contenido', '/actos/<id> → Contenido → guardar',
             'Edición libre del cuerpo. Los marcadores no resueltos aparecen entre corchetes.'],
            ['Re-renderizar', '/actos/<id> → Re-renderizar',
             'Vuelve a aplicar la plantilla con el contexto actual de la entidad (útil cuando cambió la '
             'planta o la estructura después de crear el borrador).'],
            ['Cambiar estado', '/actos/<id> → estado', 'Borrador → En revisión → Expedido → Archivado.'],
            ['Registrar expedición', '/actos/<id>',
             'Número del acto, fecha de expedición y firmante. Obligatorios para pasar a Expedido.'],
            ['Exportar acto a Excel', '/actos/<id> → Excel', 'Metadatos + contenido del acto en hoja de cálculo.'],
            ['Exportar acto a Word', '/actos/<id> → Word',
             'Documento Word con el acto listo para revisar, firmar y publicar.'],
            ['Imprimir / PDF', '/actos/<id> → Imprimir o PDF', 'Versión imprimible para archivo físico.'],
        ],
        'notes': 'Los actos deben citar Ley 489/1998 (estructura), Ley 909/2004 (empleo público), '
                 'CPACA (Ley 1437/2011) y la norma habilitante del ordenador del gasto.',
    },

    {
        'heading': '17. Asistente Jota',
        'description': (
            'Widget flotante en la esquina inferior derecha de todas las '
            'páginas. Es un asistente conversacional determinista (no IA) '
            'que responde preguntas sobre cómo usar la plataforma. Conoce '
            'los 10 módulos, el marco legal y los flujos principales.'
        ),
        'headers': ['Acción', 'Descripción'],
        'rows': [
            ['Abrir el widget', 'Clic en el botón flotante circular de la esquina inferior derecha.'],
            ['Preguntar', 'Escribir la pregunta en el campo y presionar Enter. Ejemplos: '
                          '"¿cómo creo una entidad?", "¿cómo calculo el tiempo estándar?", '
                          '"¿quién es pre-pensionado?", "módulo 9".'],
            ['Preguntas sugeridas', 'Hacer clic en una de las preguntas precargadas para respuestas rápidas.'],
            ['Cerrar', 'Clic fuera del widget o en el botón de cerrar.'],
        ],
        'notes': 'Si Jota responde "No encontré información exacta", reformula con términos como módulo, '
                 'diagnóstico, matriz, planta, manual, retén o actos.',
    },

    {
        'heading': '18. Exportación universal',
        'description': (
            'Todos los módulos tienen una barra de exportación con cuatro '
            'botones: Imprimir, PDF, Word y Excel. Los botones aparecen en '
            'el encabezado de cada página de módulo. El PDF se genera desde '
            'el diálogo de impresión del navegador (elegir "Guardar como PDF").'
        ),
        'headers': ['Botón', 'Qué hace', 'Tipo de archivo'],
        'rows': [
            ['Imprimir', 'Abre el diálogo de impresión del navegador con la vista optimizada del módulo.', 'Impresión física'],
            ['PDF', 'Abre el mismo diálogo; elegir "Guardar como PDF" para obtener el archivo.', '.pdf'],
            ['Word', 'Descarga un documento .docx con los datos del módulo, listo para editar.', '.docx'],
            ['Excel', 'Descarga una hoja de cálculo .xlsx con los datos del módulo.', '.xlsx'],
        ],
        'notes': 'Los archivos se nombran automáticamente con la convención '
                 '<modulo>_<entidad>_<fecha>.{xlsx|docx}.',
    },

    {
        'heading': '19. Flujo recomendado para un estudio técnico completo',
        'description': (
            'Secuencia sugerida para construir un expediente completo, '
            'siguiendo las fases de la Cartilla FP 2018.'
        ),
        'headers': ['#', 'Paso', 'Módulo'],
        'rows': [
            [1, 'Registrar la entidad con sus datos generales y los 4 interrogantes del acuerdo inicial.', 'Entidades'],
            [2, 'Crear la reestructuración (expediente) desde el topbar.', 'Reestructuraciones'],
            [3, 'Consultar la base legal aplicable y citar las normas relevantes.', 'M5 Base Legal'],
            [4, 'Levantar el diagnóstico institucional: rol, DOFA, brechas, entornos.', 'M6 Diagnóstico'],
            [5, 'Construir el mapa de procesos y la cadena de valor.', 'M8 Procesos'],
            [6, 'Registrar los años fiscales y validar cumplimiento Ley 617/2000.', 'M7 Financiero'],
            [7, 'Configurar las dependencias y revisar la estructura orgánica propuesta.', 'M9 Estructura'],
            [8, 'Levantar la matriz de cargas de trabajo por actividad.', 'M10 Cargas'],
            [9, 'Crear la planta actual y la propuesta; comparar deltas.', 'M11 Planta'],
            [10, 'Generar el manual específico de funciones desde la matriz.', 'M12 Manual'],
            [11, 'Identificar a los protegidos del retén social antes de supresión.', 'M13 Retén'],
            [12, 'Generar los actos administrativos (decreto/ordenanza/acuerdo, resolución, supresión).', 'M14 Actos'],
            [13, 'Exportar todos los módulos a Word/Excel para armar el expediente definitivo.', 'Exportación universal'],
        ],
    },

    {
        'heading': '20. Preguntas frecuentes y errores comunes',
        'description': (
            'Situaciones que suelen aparecer en los primeros usos de la '
            'plataforma y cómo resolverlas.'
        ),
        'headers': ['Situación', 'Causa', 'Solución'],
        'rows': [
            ['La página se queda en "Cargando…"',
             'La sesión expiró o el backend no responde.',
             'Recargar (F5). Si persiste, cerrar sesión y volver a entrar en /login.'],
            ['Un módulo responde "Debes seleccionar una entidad/reestructuración"',
             'No hay contexto activo en el topbar.',
             'Abrir los selectores del topbar y elegir entidad + reestructuración.'],
            ['No aparece el botón "Word" o "Excel" en un módulo',
             'La vista no tiene datos cargados aún.',
             'Crear al menos un registro en el módulo; los botones se activan automáticamente.'],
            ['El acto administrativo muestra marcadores [entity_name]',
             'El contexto de la entidad no tenía el dato al generar el borrador.',
             'Completar el dato faltante en /entidades/<id> y usar "Re-renderizar" en el acto.'],
            ['Al exportar a Word aparece "No fue posible generar el Word"',
             'Problema de red o sesión expirada.',
             'Recargar la página y reintentar. Si persiste, revisar la consola del navegador.'],
            ['No aparece un cargo esperado en la planta',
             'El cargo no existe en el catálogo de nomenclatura.',
             'Crear el cargo en /nomenclatura (Decreto 785/2005 o 2489/2006) y volver a intentar.'],
            ['La matriz calcula 0 horas-hombre',
             'La frecuencia mensual es 0 o los tiempos están vacíos.',
             'Verificar que Tmin, TU, Tmax y frecuencia mensual sean valores positivos.'],
            ['La supresión de un cargo está bloqueada',
             'El cargo está asignado a una persona del retén social.',
             'Verificar /reten-social y respetar la estabilidad laboral reforzada.'],
        ],
    },

    {
        'heading': '21. Contacto y soporte',
        'description': (
            'Canales de soporte para usuarios y administradores de la '
            'plataforma.'
        ),
        'headers': ['Canal', 'Destinatario', 'Propósito'],
        'rows': [
            ['Admin Django (/admin/)', 'Administrador', 'Crear/editar usuarios, grupos, plantillas, normas, nomenclatura.'],
            ['Swagger UI (/api/docs/)', 'Desarrolladores / integradores', 'Explorar todos los endpoints REST de la API.'],
            ['Widget de Jota', 'Usuarios finales', 'Resolver dudas de uso sin salir de la plataforma.'],
            ['Repositorio del proyecto', 'Equipo técnico', 'Código fuente, issues y despliegues.'],
        ],
        'notes': 'Ante cualquier bug, enviar al equipo técnico el username, el módulo afectado, la URL '
                 'exacta y una captura de la consola del navegador (DevTools → Console).',
    },
]


def main() -> Path:
    content = build_docx(TITLE, META, SECTIONS)
    project_root = BACKEND_DIR.parent.parent  # reestructuracion/
    out_path = project_root / 'Manual_Usuario_ReEstructura.docx'
    out_path.write_bytes(content)
    return out_path


if __name__ == '__main__':
    path = main()
    print(f'OK  {path}  ({path.stat().st_size:,} bytes)')
