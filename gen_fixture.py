#!/usr/bin/env python3
"""Generate complete nomenclature fixture from Decreto 785/2005 + 2489/2006."""
import json

records = []
pk = 1

# ============================================================
# TERRITORIAL — Decreto 785 de 2005 (Arts. 16-20)
# ============================================================

directivo_785 = [
    ("005","Alcalde"),("030","Alcalde Local"),("032","Consejero de Justicia"),
    ("036","Auditor Fiscal de Contraloría"),("010","Contralor"),("035","Contralor Auxiliar"),
    ("003","Decano de Escuela o Institución Tecnológica"),("007","Decano de Institución Universitaria"),
    ("008","Decano de Universidad"),
    ("009","Director Administrativo o Financiero o Técnico u Operativo"),
    ("060","Director de Área Metropolitana"),("055","Director de Departamento Administrativo"),
    ("028","Director de Escuela o de Instituto o de Centro de Universidad"),
    ("065","Director de Hospital"),("016","Director Ejecutivo de Asociación de Municipios"),
    ("050","Director o Gerente General de Entidad Descentralizada"),
    ("080","Director Local de Salud"),("024","Director o Gerente Regional o Provincial"),
    ("039","Gerente"),("085","Gerente Empresa Social del Estado"),
    ("001","Gobernador"),("027","Jefe de Departamento de Universidad"),
    ("006","Jefe de Oficina"),("015","Personero"),("017","Personero Auxiliar"),
    ("040","Personero Delegado"),("043","Personero Local de Bogotá"),
    ("071","Presidente Consejo de Justicia"),
    ("042","Rector de Institución Técnica Profesional"),
    ("048","Rector de Institución Universitaria o de Escuela o de Institución Tecnológica"),
    ("067","Rector de Universidad"),("020","Secretario de Despacho"),
    ("054","Secretario General de Entidad Descentralizada"),
    ("058","Secretario General de Institución Técnica Profesional"),
    ("064","Secretario General de Institución Universitaria"),
    ("052","Secretario General de Universidad"),
    ("066","Secretario General de Escuela o de Institución Tecnológica"),
    ("073","Secretario General de Organismo de Control"),
    ("097","Secretario Seccional o Local de Salud"),
    ("025","Subcontralor"),("070","Subdirector"),
    ("068","Subdirector Administrativo o Financiero o Técnico u Operativo"),
    ("072","Subdirector Científico"),("074","Subdirector de Área Metropolitana"),
    ("076","Subdirector de Departamento Administrativo"),
    ("078","Subdirector Ejecutivo de Asociación de Municipios"),
    ("084","Subdirector o Subgerente General de Entidad Descentralizada"),
    ("090","Subgerente"),("045","Subsecretario de Despacho"),
    ("091","Tesorero Distrital"),("094","Veedor Distrital"),
    ("095","Viceveedor Distrital"),("099","Veedor Distrital Delegado"),
    ("096","Vicerrector de Institución Técnica Profesional"),
    ("098","Vicerrector de Institución Universitaria"),
    ("057","Vicerrector de Escuela Tecnológica o de Institución Tecnológica"),
    ("077","Vicerrector de Universidad"),
]

asesor_785 = [
    ("105","Asesor"),
    ("115","Jefe de Oficina Asesora de Jurídica o de Planeación o de Prensa o de Comunicaciones"),
]

profesional_785 = [
    ("215","Almacenista General"),("202","Comisario de Familia"),
    ("203","Comandante de Bomberos"),("204","Copiloto de Aviación"),
    ("227","Corregidor"),("260","Director de Cárcel"),
    ("265","Director de Banda"),("270","Director de Orquesta"),
    ("235","Director de Centro de Institución Universitaria"),
    ("236","Director de Centro de Escuela Tecnológica"),
    ("243","Enfermero"),("244","Enfermero Especialista"),
    ("232","Director de Centro de Institución Técnica Profesional"),
    ("233","Inspector de Policía Urbano Categoría Especial y 1a Categoría"),
    ("234","Inspector de Policía Urbano 2a Categoría"),
    ("206","Líder de Programa"),("208","Líder de Proyecto"),
    ("209","Maestro en Artes"),("211","Médico General"),
    ("213","Médico Especialista"),("231","Músico de Banda"),
    ("221","Músico de Orquesta"),("214","Odontólogo"),
    ("216","Odontólogo Especialista"),("275","Piloto de Aviación"),
    ("222","Profesional Especializado"),("242","Profesional Especializado Área Salud"),
    ("219","Profesional Universitario"),("237","Profesional Universitario Área Salud"),
    ("217","Profesional Servicio Social Obligatorio"),("201","Tesorero General"),
]

tecnico_785 = [
    ("335","Auxiliar de Vuelo"),
    ("303","Inspector de Policía 3a a 6a Categoría"),
    ("306","Inspector de Policía Rural"),
    ("312","Inspector de Tránsito y Transporte"),
    ("313","Instructor"),("336","Subcomandante de Bomberos"),
    ("367","Técnico Administrativo"),("323","Técnico Área Salud"),
    ("314","Técnico Operativo"),
]

asistencial_785 = [
    ("403","Agente de Tránsito"),
    ("407","Auxiliar Administrativo"),("412","Auxiliar Área Salud"),
    ("470","Auxiliar de Servicios Generales"),("472","Ayudante"),
    ("475","Bombero"),("413","Cabo de Bomberos"),
    ("428","Cabo de Prisiones"),("411","Capitán de Bomberos"),
    ("477","Celador"),("480","Conductor"),("482","Conductor Mecánico"),
    ("485","Guardián"),("416","Inspector"),("487","Operario"),
    ("490","Operario Calificado"),("417","Sargento de Bomberos"),
    ("438","Sargento de Prisiones"),("440","Secretario"),
    ("420","Secretario Bilingüe"),("425","Secretario Ejecutivo"),
    ("438","Secretario Ejecutivo del Despacho del Alcalde"),
    ("430","Secretario Ejecutivo del Despacho del Gobernador"),
    ("419","Teniente de Bomberos"),("457","Teniente de Prisiones"),
]

# ============================================================
# NACIONAL — Decreto 2489 de 2006
# ============================================================

nacional_directivo = [
    ("0157","Comisionado Nacional del Servicio Civil"),("0023","Consejero Comercial"),
    ("0004","Contador General de la Nación"),("0047","Cónsul General Central"),
    ("0092","Coordinador Ejecutivo de Comisión Reguladora"),
    ("0160","Decano de Institución Universitaria o de Escuela Tecnológica"),
    ("0085","Decano de Universidad o de Escuela Superior"),
    ("0100","Director Administrativo y/o Financiero o Técnico u Operativo"),
    ("0086","Director de Academia Diplomática"),
    ("0186","Director de Centro de Atención Ambulatoria"),
    ("0010","Director de Departamento Administrativo"),
    ("0131","Director de Centro o de Carrera o Jefe de Departamento de Institución Universitaria"),
    ("0095","Director de Escuela o de Instituto o de Centro o Jefe de Departamento de Universidad"),
    ("0116","Director de Fábrica"),("0136","Director de Museo o de Teatro o de Coro o Cultural"),
    ("0105","Director de Superintendencia"),("0180","Director de Unidad Hospitalaria"),
    ("0141","Director de Unidad de Institución Técnica Profesional"),
    ("0128","Director de Unidad Tecnológica o de Unidad Académica"),
    ("0087","Director General de Protocolo"),
    ("0042","Director o Gerente Territorial o Regional o Seccional"),
    ("0036","Embajador Extraordinario y Plenipotenciario"),
    ("0090","Experto de Comisión Reguladora"),
    ("0015","Gerente, Presidente o Director General o Nacional de Entidad Descentralizada o de UAE"),
    ("0153","Gestor en Ciencia y Tecnología"),("0138","Intendente"),
    ("0137","Jefe de Oficina"),("0005","Ministro"),("0074","Ministro Plenipotenciario"),
    ("0088","Negociador Internacional"),
    ("0151","Rector de Institución Técnica Profesional"),
    ("0052","Rector de Institución Universitaria o de Escuela Tecnológica"),
    ("0045","Rector de Universidad"),("0191","Registrador Principal"),
    ("0192","Registrador Seccional"),
    ("0161","Secretario General de Institución Técnica Profesional"),
    ("0185","Secretario General de Institución Universitaria o de Escuela Tecnológica"),
    ("0035","Secretario General de Ministerio o de Departamento Administrativo"),
    ("0037","Secretario General de UAE o de Superintendencia o de Entidad Descentralizada"),
    ("0008","Subcontador General de la Nación"),
    ("0150","Subdirector Administrativo y/o Financiero o Técnico u Operativo"),
    ("0025","Subdirector de Departamento Administrativo"),
    ("0190","Subdirector de Unidad Hospitalaria"),
    ("0040","Subgerente, Vicepresidente o Subdirector General o Nacional"),
    ("0044","Subsecretario de Relaciones Exteriores"),("0030","Superintendente"),
    ("0110","Superintendente Delegado"),("0108","Superintendente Delegado Adjunto"),
    ("0020","Viceministro"),("0171","Vicerrector de Institución Técnica Profesional"),
    ("0065","Vicerrector o Director Administrativo de Institución Universitaria"),
    ("0060","Vicerrector o Director Administrativo de Universidad"),
    ("0195","Director de Tránsito y Transporte"),("0196","Secretario de Tránsito y Transporte"),
]

nacional_asesor = [
    ("1050","Agregado para Asuntos Aéreos"),("1020","Asesor"),("1060","Asesor Comercial"),
    ("1012","Consejero de Relaciones Exteriores"),
    ("1045","Jefe de Oficina Asesora de Comunicaciones o de Prensa o de Jurídica o de Planeación"),
    ("1014","Ministro Consejero"),
]

nacional_profesional = [
    ("2024","Administrador de Parques Nacionales"),("2001","Capellán"),
    ("2132","Comandante Superior de Prisiones"),("2133","Consejero de Relaciones Exteriores"),
    ("2002","Copiloto de Aviación"),("2125","Defensor de Familia"),
    ("2012","Director de Cárcel"),("2014","Director de Coro"),("2018","Director de Orquesta"),
    ("2003","Enfermero"),("2004","Enfermero Especialista"),("2025","Ingeniero de Minas"),
    ("2085","Líder de Proyecto"),("2120","Maestro en Artes"),
    ("2142","Médico Cirujano"),("2087","Médico Especialista"),("2123","Médico General"),
    ("2052","Músico de Banda"),("2053","Músico de Orquesta"),
    ("2009","Oficial de Prisiones"),("2007","Piloto de Aviación"),
    ("2112","Profesional de Asuntos Internacionales"),
    ("2045","Profesional de Defensa Ciudadana"),
    ("2020","Profesional de Servicio Social Obligatorio"),
    ("2165","Profesional Especializado"),("2028","Profesional Especializado"),
    ("2033","Profesional Especializado Área Salud"),
    ("2044","Profesional Universitario"),("2048","Profesional Universitario Área Salud"),
    ("2152","Subcomandante de Prisiones"),("2168","Suboficial de Prisiones"),
    ("2173","Subteniente de Aviación"),("2094","Tesorero General"),
    ("2186","Teniente de Aviación"),("2102","Terapeuta"),("2103","Trabajador Social"),
    ("2114","Veterinario"),("2116","Zootecnista"),
]

nacional_tecnico = [
    ("3015","Subcomandante de Bomberos"),("3003","Agrimensor"),
    ("3038","Caporal de Prisiones"),("3046","Carabinero"),
    ("3054","Dragoneante de Prisiones"),("3066","Guardián de Prisiones"),
    ("3074","Inspector de Prisiones"),("3078","Inspector de Tránsito y Transporte"),
    ("3080","Instructor"),("3084","Investigador Profesional"),
    ("3092","Monitor de Coro"),("3094","Monitor de Orquesta"),
    ("3070","Músico"),("3102","Paramédico"),("3105","Piloto de Embarcación"),
    ("3110","Suboficial de Prisiones"),("3137","Técnico"),
    ("3010","Técnico Aeronáutico"),("3116","Técnico Administrativo"),
    ("3118","Técnico de Servicios"),("3100","Técnico Operativo"),
    ("3124","Técnico Área Salud"),("3234","Técnico de Ayudas Audiovisuales"),
    ("3128","Tecnólogo"),("3132","Topógrafo"),("3136","Vigía de Prisiones"),
    ("3142","Vigilante Penitenciario"),
]

nacional_asistencial = [
    ("4002","Aprendiz del SENA"),("4006","Archivista"),
    ("4008","Asistente"),("4026","Auxiliar"),
    ("4028","Auxiliar Administrativo"),("4032","Auxiliar Área Salud"),
    ("4034","Auxiliar de Archivista"),("4036","Auxiliar de Enfermería"),
    ("4038","Auxiliar de Laboratorio"),("4070","Auxiliar de Mantenimiento"),
    ("4044","Auxiliar de Servicios Generales"),("4046","Ayudante"),
    ("4048","Bombero Aeronáutico"),("4851","Cajero"),
    ("4071","Camillero"),("4850","Citador"),("4050","Conductor"),
    ("4056","Conductor Mecánico"),("4064","Guardián"),
    ("4069","Mensajero"),("4078","Operario"),
    ("4097","Operario Calificado"),("4103","Portero"),
    ("4112","Secretario"),("4114","Secretario Bilingüe"),
    ("4123","Secretario Ejecutivo"),
    ("4128","Secretario Ejecutivo del Despacho del Ministro"),
    ("4137","Suboficial de Protección y Seguridad"),
    ("4152","Técnico Servicio Civil"),("4158","Telefonista"),
    ("4167","Tramitador"),("4169","Vigía"),
    ("4173","Zapatero de Prisiones"),("4178","Cocinero de Prisiones"),
    ("4182","Conductor de Prisiones"),("4210","Secretario Ejecutivo"),
    ("4212","Secretario Ejecutivo del Despacho del Viceministro"),
    ("4215","Supervisor"),("4220","Técnico"),("4222","Técnico Operativo"),
    ("4225","Vigilante"),
]

# Build all records
levels_map = {
    "TERRITORIAL": [
        ("DIRECTIVO", directivo_785), ("ASESOR", asesor_785),
        ("PROFESIONAL", profesional_785), ("TECNICO", tecnico_785),
        ("ASISTENCIAL", asistencial_785),
    ],
    "NACIONAL": [
        ("DIRECTIVO", nacional_directivo), ("ASESOR", nacional_asesor),
        ("PROFESIONAL", nacional_profesional), ("TECNICO", nacional_tecnico),
        ("ASISTENCIAL", nacional_asistencial),
    ],
}

for scope, level_list in levels_map.items():
    for level, items in level_list:
        for code, denom in items:
            records.append({
                "model": "nomenclatura.jobnomenclature",
                "pk": pk,
                "fields": {
                    "scope": scope,
                    "level": level,
                    "code": code,
                    "denomination": denom,
                },
            })
            pk += 1

# Save fixture
output_path = "plataforma/backend/apps/nomenclatura/fixtures/decreto_785_2005.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

# Stats
by_scope = {}
for r in records:
    key = f"{r['fields']['scope']} - {r['fields']['level']}"
    by_scope[key] = by_scope.get(key, 0) + 1

print(f"Total registros: {len(records)}")
for k in sorted(by_scope.keys()):
    print(f"  {k}: {by_scope[k]}")
