"""
Tipología de objetivos de reestructuración.

Mapea cada `kind` de RestructuringObjective a:
- required_inputs : lista de insumos necesarios (strings legibles).
- active_modules  : módulos de la plataforma relevantes.
- validators      : lista de códigos de validación R-NNN.
- required_outputs: documentos o resultados esperados.
"""

OBJECTIVE_DEFINITIONS: dict[str, dict] = {
    "FORTALECIMIENTO_INSTITUCIONAL": {
        "label": "Fortalecimiento institucional",
        "required_inputs": [
            "Diagnóstico institucional actualizado",
            "Análisis DOFA con dimensiones Cartilla FP",
            "Análisis de entornos",
            "Acuerdo inicial de reestructuración",
        ],
        "active_modules": ["M6-Diagnóstico", "M8-Procesos", "M9-Estructura"],
        "validators": ["R-001", "R-002", "R-010"],
        "required_outputs": [
            "Informe de diagnóstico",
            "Propuesta de estructura orgánica",
            "Decreto/Acuerdo de nueva estructura",
        ],
    },
    "NIVELACION_SALARIAL": {
        "label": "Nivelación salarial",
        "required_inputs": [
            "Escala salarial vigente (territorial o nacional)",
            "Planta de personal actual",
            "Norma habilitante de nivelación",
        ],
        "active_modules": ["M11-Planta", "M16-Escala salarial"],
        "validators": ["R-020", "R-021"],
        "required_outputs": [
            "Análisis de brechas salariales",
            "Resolución/Decreto de nivelación",
        ],
    },
    "RECLASIFICACION_EMPLEOS": {
        "label": "Reclasificación de empleos",
        "required_inputs": [
            "Manual de funciones actualizado",
            "Decreto de nomenclatura aplicable (785/2005 o 2489/2006)",
            "Planta de personal actual",
        ],
        "active_modules": ["M11-Planta", "M12-Manual", "M15-Hojas de vida"],
        "validators": ["R-015", "R-016"],
        "required_outputs": [
            "Nuevas fichas de empleo",
            "Acto administrativo de reclasificación",
        ],
    },
    "CREACION_DEPENDENCIA": {
        "label": "Creación de dependencia",
        "required_inputs": [
            "Justificación técnica y legal",
            "Análisis de procesos a cargo",
            "Competencias asignadas por ley",
        ],
        "active_modules": ["M8-Procesos", "M9-Estructura", "M11-Planta"],
        "validators": ["R-030", "R-031"],
        "required_outputs": [
            "Propuesta de dependencia con funciones",
            "Decreto/Ordenanza que crea la dependencia",
        ],
    },
    "SUPRESION_DEPENDENCIA": {
        "label": "Supresión de dependencia",
        "required_inputs": [
            "Diagnóstico de duplicidades o inactividad",
            "Retén social actualizado",
            "Inventario de funciones a redistribuir",
        ],
        "active_modules": ["M8-Procesos", "M9-Estructura", "M13-Retén", "M11-Planta"],
        "validators": ["R-032", "R-033", "R-040"],
        "required_outputs": [
            "Acto de supresión de la dependencia",
            "Plan de redistribución de funciones",
        ],
    },
    "SUPRESION_EMPLEOS": {
        "label": "Supresión de empleos",
        "required_inputs": [
            "Planta actual vs propuesta (comparativo)",
            "Retén social actualizado",
            "Estimación de indemnizaciones (Decreto 1083/2015)",
        ],
        "active_modules": ["M11-Planta", "M13-Retén", "M14-Actos", "M15-Hojas de vida"],
        "validators": ["R-040", "R-041", "R-042"],
        "required_outputs": [
            "Acto administrativo de supresión de cargos",
            "Liquidaciones individuales",
        ],
    },
    "LIQUIDACION_ENTIDAD": {
        "label": "Liquidación de entidad",
        "required_inputs": [
            "Acto habilitante de liquidación",
            "Inventario patrimonial",
            "Retén social completo",
        ],
        "active_modules": ["M11-Planta", "M13-Retén", "M14-Actos"],
        "validators": ["R-050", "R-051"],
        "required_outputs": [
            "Decreto de liquidación",
            "Acta de liquidación",
            "Resolución de supresión de cargos",
        ],
    },
    "FUSION_ENTIDADES": {
        "label": "Fusión de entidades",
        "required_inputs": [
            "Diagnósticos de ambas entidades",
            "Norma habilitante de fusión (Ley 489/1998 art. 56)",
            "Inventarios patrimoniales cruzados",
        ],
        "active_modules": ["M6-Diagnóstico", "M9-Estructura", "M11-Planta"],
        "validators": ["R-055", "R-056"],
        "required_outputs": [
            "Decreto/Ordenanza de fusión",
            "Nueva planta unificada",
        ],
    },
    "ESCISION_ENTIDAD": {
        "label": "Escisión de entidad",
        "required_inputs": [
            "Justificación técnica de escisión",
            "Propuesta de separación de funciones y patrimonio",
        ],
        "active_modules": ["M6-Diagnóstico", "M8-Procesos", "M11-Planta"],
        "validators": ["R-057", "R-058"],
        "required_outputs": [
            "Decreto/Acuerdo de escisión",
            "Estatutos de las entidades resultantes",
        ],
    },
    "MODERNIZACION_TECNOLOGICA": {
        "label": "Modernización tecnológica",
        "required_inputs": [
            "Diagnóstico de sistemas de información",
            "Análisis de carga de trabajo por procesos automatizables",
        ],
        "active_modules": ["M6-Diagnóstico", "M8-Procesos", "M10-Cargas"],
        "validators": ["R-060", "R-061"],
        "required_outputs": [
            "Plan de modernización",
            "Ajuste de planta por eficiencias tecnológicas",
        ],
    },
    "CUMPLIMIENTO_COMPETENCIAS": {
        "label": "Cumplimiento de competencias legales",
        "required_inputs": [
            "Marco normativo de competencias (Ley 489/1998, norma sectorial)",
            "Diagnóstico de brecha funcional",
        ],
        "active_modules": ["M5-Base legal", "M6-Diagnóstico", "M8-Procesos"],
        "validators": ["R-010", "R-011"],
        "required_outputs": [
            "Mapa de competencias vs funciones actuales",
            "Propuesta de ajuste estructural",
        ],
    },
    "AJUSTE_ORDEN_JUDICIAL": {
        "label": "Ajuste por orden judicial",
        "required_inputs": [
            "Copia de la providencia judicial (sentencia/auto)",
            "Plan de cumplimiento",
        ],
        "active_modules": ["M5-Base legal", "M14-Actos"],
        "validators": ["R-070", "R-071"],
        "required_outputs": [
            "Informe de cumplimiento de orden judicial",
            "Acto de ajuste emitido",
        ],
    },
    "CUMPLIMIENTO_LEY_617": {
        "label": "Cumplimiento Ley 617/2000 (límites de gasto)",
        "required_inputs": [
            "Estados financieros de los últimos 3 años",
            "ICLD proyectado",
            "Planta de personal con costos",
        ],
        "active_modules": ["M7-Financiero", "M11-Planta", "M16-Escala salarial"],
        "validators": ["R-080", "R-081"],
        "required_outputs": [
            "Análisis Ley 617 con indicadores proyectados",
            "Plan de ajuste de gasto de funcionamiento",
        ],
    },
    "PLANTA_TRANSITORIA": {
        "label": "Planta transitoria",
        "required_inputs": [
            "Justificación de temporalidad (proyecto específico o ley)",
            "Presupuesto asignado",
        ],
        "active_modules": ["M11-Planta", "M15-Hojas de vida"],
        "validators": ["R-090", "R-091"],
        "required_outputs": [
            "Decreto de planta transitoria",
            "Manual de funciones de empleos transitorios",
        ],
    },
    "PLAN_CARRERA_CNSC": {
        "label": "Plan de carrera CNSC",
        "required_inputs": [
            "Diagnóstico del estado de carrera administrativa",
            "Listado de empleados inscritos en carrera",
        ],
        "active_modules": ["M15-Hojas de vida", "M11-Planta"],
        "validators": ["R-100", "R-101"],
        "required_outputs": [
            "Plan de carrera administrativa",
            "Acuerdo CNSC de aprobación",
        ],
    },
    "AJUSTE_NOMENCLATURA": {
        "label": "Ajuste de nomenclatura de empleos",
        "required_inputs": [
            "Decreto de nomenclatura vigente (785/2005 o 2489/2006)",
            "Planta actual con códigos y grados",
        ],
        "active_modules": ["M11-Planta", "M12-Manual"],
        "validators": ["R-015", "R-016", "R-017"],
        "required_outputs": [
            "Planta ajustada con nueva nomenclatura",
            "Acto de adopción de nueva nomenclatura",
        ],
    },
}
