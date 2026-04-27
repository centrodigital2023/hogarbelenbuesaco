# INFORME INTELIGENTE HB-F22
## Guía de Implementación Completa

### Descripción General
El **Informe Inteligente HB-F22** es un sistema integral de valoración geriátrica que correlaciona **12 escalas clínicas** con análisis de IA para generar un informe profesional exportable en **PDF, Word y Excel**.

---

## 🎯 Características Principales

### 1. **Integración de 12 Escalas Geriátricas**
- **Funcional (ABVD)**: Barthel
- **Instrumental (AIVD)**: Lawton & Brody
- **Cognitivo**: Pfeiffer (SPMSQ), MMSE
- **Movilidad**: Tinetti
- **Nutrición**: MNA
- **Fragilidad**: Fried
- **Estado de Ánimo**: Yesavage (GDS-15)
- **Social**: Gijón
- **Piel**: Braden
- **Comorbilidad**: Charlson
- **Cuidador**: Zarit

### 2. **Análisis Inteligente**
- **Correlación de escalas**: Detecta interconexiones entre evaluaciones
- **Identificación de riesgos**: Genera alertas automáticas (ALTO/MODERADO/BAJO)
- **Perfiles de dependencia**: Calcula estado funcional integral
- **Estado de fragilidad**: Determina si es ROBUSTO, PRE-FRÁGIL o FRÁGIL

### 3. **Plan de Cuidado Personalizado**
- **9 programas multidisciplinarios** basados en hallazgos
- **Intervenciones específicas** para cada riesgo identificado
- **Priorización crítica** (CRITICAL/HIGH/MEDIUM/LOW)
- **Escalas involucradas** documentadas para cada programa

### 4. **Exportación Multi-Formato**

#### **PDF**
- Diseño profesional con logo y colores corporativos
- Márgenes estandarizados (2 cm)
- Encabezados y pies de página con info branding
- Paginación automática
- Tablas formateadas y alertas visuales

#### **Word (DOCX)**
- Editable y personalizablepara reimpresión
- Márgenes: 2 cm (1440 DXA)
- Encabezados y pies de página
- Tablas con colores corporativos
- Campos de firma con líneas
- Compatible con Microsoft Office

#### **Excel (XLSX)**
- **4 hojas de trabajo**:
  1. **Información**: Datos del residente y perfil clínico
  2. **Escalas**: Resultados cuantitativos con porcentajes
  3. **Alertas**: Riesgos detectados con recomendaciones
  4. **Plan de Cuidado**: Programas e intervenciones

---

## 📋 Archivos Creados

### 1. `/src/lib/hb-f22-report.ts`
**Lógica de negocio del informe**

```typescript
// Funciones principales:
- calculateDependencyProfile()        // Calcula dependencia (Barthel + Lawton)
- determineFragilityStatus()          // Estado de fragilidad (Fried)
- assessFallRisk()                    // Riesgo de caídas (Tinetti)
- assessPressureUlcerRisk()          // Riesgo UPP (Braden)
- assessNutritionalStatus()          // Estado nutricional (MNA)
- generateRiskAlerts()               // Genera alertas automáticas
- generateCareplan()                 // Crea plan de cuidado (9 programas)
- buildHBF22Report()                 // Compila informe completo
```

**Tipos principales:**
```typescript
HBF22Report          // Estructura completa del informe
RiskAlert            // Alerta con nivel, categoría, recomendación
CareRecommendation   // Programa de cuidado con intervenciones
ScaleScore           // Puntuación de cada escala
```

### 2. `/src/lib/hb-f22-export.ts`
**Funciones de exportación con estilos corporativos**

```typescript
// Funciones de exportación:
- buildHBF22HTML()          // Genera HTML completo
- exportHBF22PDF()          // Exporta a PDF profesional
- exportHBF22Word()         // Exporta a Word editable
- exportHBF22Excel()        // Exporta a Excel (4 hojas)

// Estilos CSS corporativos incluidos:
CORPORATE_STYLES            // CSS unificado para todos los formatos
BRAND                       // Constantes de marca (colores, contacto, NIT)
```

### 3. `/src/components/GeneradorHBF22.tsx`
**Componente React para interfaz de usuario**

```typescript
<GeneradorHBF22
  residentId="123"
  residentName="ALFREDO CAMILO PAZOS CABRERA"
  residentAge={75}
  residentGender="M"
  residentDocId="12.960.377"
  assessmentResults={allTestResults}
  professionalName="José Fabián Carrera"
  professionalRole="Especialista"
  professionalNit="901.904.984-0"
  onReportGenerated={(report) => console.log(report)}
/>
```

---

## 🚀 Cómo Usar

### Paso 1: Recopilar Datos de Evaluación
```typescript
// Obtener resultados de las 12 escalas
const assessmentResults: AssessmentResults = {
  barthel: { score: 45 },
  lawton: { score: 3 },
  pfeiffer: { score: 4 },
  tinetti: { score: 18 },
  mna: { score: 16 },
  fried: { score: 3 },
  yesavage: { score: 12 },
  gijon: { score: 14 },
  braden: { score: 12 },
  mmse: { score: 22 },
  charlson: { score: 4 },
  zarit: { score: 35 }
};
```

### Paso 2: Compilar el Informe
```typescript
import { buildHBF22Report } from "@/lib/hb-f22-report";

const report = buildHBF22Report(
  {
    id: "res-001",
    fullName: "Juan Pérez",
    documentId: "12345678",
    age: 78,
    gender: "M"
  },
  assessmentResults,
  {
    name: "Dr. José García",
    role: "Geriatra",
    nit: "901.904.984-0"
  }
);
```

### Paso 3: Exportar
```typescript
import { exportHBF22PDF, exportHBF22Word, exportHBF22Excel } from "@/lib/hb-f22-export";

// PDF
await exportHBF22PDF(report, "Informe_Juan_Perez");

// Word
await exportHBF22Word(report, "Informe_Juan_Perez");

// Excel
await exportHBF22Excel(report, "Informe_Juan_Perez");
```

### Paso 4: Usar el Componente (React)
```typescript
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";

<GeneradorHBF22
  residentId={resident.id}
  residentName={resident.name}
  residentAge={resident.age}
  assessmentResults={allResults}
  professionalName="Dr. García"
  professionalRole="Geriatra"
  onReportGenerated={(report) => {
    console.log("Informe generado:", report);
  }}
/>
```

---

## 📊 Estructura del Informe

### Secciones Incluidas

1. **Encabezado Corporativo**
   - Logo de Hogar Belén
   - Nombre, slogan, datos de contacto
   - Información del residente y profesional

2. **Información del Residente**
   - Nombre, documento, edad, sexo
   - Fecha de evaluación
   - Profesional responsable

3. **Resumen Ejecutivo**
   - Síntesis del estado funcional
   - Factores de riesgo principales
   - Recomendación de cuidado general

4. **Estado Funcional y Dependencia**
   - Perfil de dependencia (LEVE/MODERADA/SEVERA)
   - Estado de fragilidad (ROBUSTO/PRE-FRÁGIL/FRÁGIL)
   - Factores de riesgo identificados

5. **Resultados de 12 Escalas**
   - Tabla con: Nombre, Puntuación, Máximo, %, Categoría
   - Comparación de desempeño

6. **Riesgos y Alertas** (automáticas)
   - 🔴 **ALTO**: Requiere intervención inmediata
   - 🟡 **MODERADO**: Requiere monitoreo
   - 🟢 **BAJO**: Supervisión rutinaria

7. **Plan de Cuidado Integral** (hasta 9 programas)
   - Prevención de caídas
   - Prevención de UPP
   - Apoyo nutricional
   - Rehabilitación y movilización
   - Estimulación cognitiva
   - Salud mental
   - Apoyo social
   - Gestión de comorbilidades
   - Apoyo al cuidador

8. **Análisis de Correlaciones Clínicas**
   - Interconexiones detectadas
   - Abordaje multidisciplinario

9. **Firma y Datos Legales**
   - Campo de firma
   - NIT y contacto
   - Pie de página con información institucional

---

## 🎨 Estilos Corporativos

### Colores
- **Primario (Rojo)**: #C8102E (RGB: 200, 16, 46)
- **Secundario (Gris)**: #333333, #555555, #F5F5F5
- **Estados**:
  - 🔴 ALTO: #C8102E (Rojo)
  - 🟡 MODERADO: #D4A017 (Dorado)
  - 🟢 BAJO: #28a745 (Verde)

### Tipografía
- **Fuente**: Arial (profesional y universal)
- **Encabezados**: 14pt, Bold, Rojo corporativo
- **Cuerpo**: 10.5pt, Regular
- **Tablas**: 10pt, Encabezados en blanco sobre rojo

### Márgenes (Estándar Institucional)
- **PDF y Word**: 2 cm en todos los lados
- **Excel**: Ancho de columnas automático ajustado

---

## 🔍 Algoritmos de Análisis

### 1. Dependencia Funcional
```
Barthel >= 60% AND Lawton >= 50% → INDEPENDIENTE
Barthel >= 40% AND Lawton >= 30% → DEPENDENCIA LEVE
Barthel >= 20%                     → DEPENDENCIA MODERADA
Barthel < 20%                      → DEPENDENCIA SEVERA
```

### 2. Fragilidad (Fried)
```
Criterios positivos:
- Pérdida peso involuntaria >4.5 kg
- Agotamiento (≥3-4 días/semana)
- Debilidad (dinamómetro bajo)
- Lentitud marcha (>6-7 seg)
- Baja actividad física (<270-383 kcal/sem)

0 criterios    → ROBUSTO
1-2 criterios  → PRE-FRÁGIL
≥3 criterios   → FRÁGIL
```

### 3. Riesgo de Caídas (Tinetti)
```
< 19  → ALTO RIESGO
19-24 → RIESGO MODERADO
25-28 → BAJO RIESGO
```

### 4. UPP (Braden)
```
≤ 12  → ALTO RIESGO
13-14 → RIESGO MODERADO
15-23 → BAJO RIESGO
```

---

## 🔧 Integración Técnica

### Dependencias Necesarias
```json
{
  "jspdf": "^4.2.1",
  "docx": "9.5.0",
  "exceljs": "^4.4.0",
  "file-saver": "2.0.5"
}
```

### Integración en ValoracionGeriatrica.tsx
```typescript
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
import { AssessmentResults } from "@/lib/hb-f22-report";

// En el componente:
<GeneradorHBF22
  residentId={selectedResident.id}
  residentName={selectedResident.full_name}
  residentAge={calculateAge(selectedResident.date_of_birth)}
  assessmentResults={{
    barthel: { score: barthelScore },
    lawton: { score: lawtonScore },
    // ... resto de escalas
  }}
  professionalName={user?.user_metadata?.name || "Profesional"}
  professionalRole="Especialista"
  onReportGenerated={(report) => {
    // Guardar en Supabase o BD local
  }}
/>
```

### Envío a Supabase (Opcional)
```typescript
// Guardar informe en base de datos
const { data, error } = await supabase
  .from('geriatric_reports')
  .insert({
    resident_id: residentId,
    report_data: JSON.stringify(report),
    created_at: new Date(),
    professional_id: currentUserId
  });
```

---

## ✅ Consideraciones de Implementación

### 1. **Validación de Datos**
- ✓ Verificar que todas escalas tengan puntuaciones válidas
- ✓ Mostrar advertencia si faltan evaluaciones
- ✓ Permitir generación con escalas parciales (mostrar "Pendiente" en exportación)

### 2. **Rendimiento**
- ✓ Generación de PDF/Excel en cliente (evita servidor)
- ✓ Cache de logo en Base64 para reutilización
- ✓ Compresión de imágenes antes de exportar

### 3. **Seguridad**
- ✓ Validar permisos de usuario antes de generar
- ✓ Encriptar datos sensibles del residente en tránsito
- ✓ Auditar generación de informes en base de datos

### 4. **Usabilidad**
- ✓ Feedback visual durante generación (loading)
- ✓ Confirmación de descarga exitosa
- ✓ Opción de vista previa antes de exportar
- ✓ Descargas con nombres descriptivos

---

## 📱 Pantalla de Usuario

El componente `GeneradorHBF22` proporciona:

1. **Contador de escalas**: Muestra progreso (ej: "8 de 12")
2. **Botón principal**: "Generar Informe HB-F22" (deshabilitado si faltan escalas)
3. **Panel de exportación** (cuando se genera):
   - Botón PDF con icono
   - Botón Word con icono
   - Botón Excel con icono
4. **Pestañas de información**:
   - **Exportar**: Opciones de descarga
   - **Resumen**: Vista ejecutiva con alertas
   - **Vista Previa**: Muestra inicio del documento

---

## 🐛 Troubleshooting

### Problema: "Logo no aparece en PDF"
**Solución**: Asegúrar que el logo esté en formato Base64 o en URL accesible

### Problema: "Error al generar Excel"
**Solución**: Verificar que ExcelJS esté correctamente importado

### Problema: "Word no se abre"
**Solución**: Verificar que el DOCX tenga estructura válida (margins, secciones)

### Problema: "Alertas no se generan"
**Solución**: Confirmar que `generateRiskAlerts()` reciba datos válidos

---

## 📞 Contacto y Soporte

- **Centro**: Hogar Belén Buesaco S.A.S.
- **Teléfono**: 3117301245
- **Email**: hogarbelen2022@gmail.com
- **NIT**: 901.904.984-0

---

**Versión**: 1.0  
**Última actualización**: Abril 2026  
**Estado**: Producción
