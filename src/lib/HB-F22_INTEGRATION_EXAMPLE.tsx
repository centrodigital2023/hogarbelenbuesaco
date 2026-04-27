/**
 * EJEMPLO DE INTEGRACIÓN DEL HB-F22 EN ValoracionGeriatrica.tsx
 * 
 * Este archivo muestra cómo integrar el Informe Inteligente HB-F22
 * en el componente ValoracionGeriatrica.tsx existente
 */

// ═════════════════════════════════════════════════════════════════════════════
// PASO 1: IMPORTAR COMPONENTES Y TIPOS
// ═════════════════════════════════════════════════════════════════════════════

import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
import { type HBF22Report, type AssessmentResults } from "@/lib/hb-f22-report";

// ═════════════════════════════════════════════════════════════════════════════
// PASO 2: EN EL COMPONENTE ValoracionGeriatrica
// ═════════════════════════════════════════════════════════════════════════════

export function ValoracionGeriatricaIntegration() {
  // Estados existentes...
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [testResults, setTestResults] = useState<Record<string, number>>({});
  
  // Nuevo estado para generador HBF22
  const [showHBF22Generator, setShowHBF22Generator] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<HBF22Report | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Compilar resultados en formato AssessmentResults
  // ───────────────────────────────────────────────────────────────────────────
  
  const compileAssessmentResults = (): AssessmentResults => {
    return {
      barthel: testResults.barthel ? { score: testResults.barthel } : { score: 0 },
      lawton: testResults.lawton ? { score: testResults.lawton } : { score: 0 },
      pfeiffer: testResults.pfeiffer ? { score: testResults.pfeiffer } : { score: 0 },
      yesavage: testResults.yesavage ? { score: testResults.yesavage } : { score: 0 },
      tinetti: testResults.tinetti ? { score: testResults.tinetti } : { score: 0 },
      mna: testResults.mna ? { score: testResults.mna } : { score: 0 },
      fried: testResults.fried ? { score: testResults.fried } : { score: 0 },
      gijon: testResults.gijon ? { score: testResults.gijon } : { score: 0 },
      braden: testResults.braden ? { score: testResults.braden } : { score: 0 },
      mmse: testResults.mmse ? { score: testResults.mmse } : { score: 0 },
      charlson: testResults.charlson ? { score: testResults.charlson } : { score: 0 },
      zarit: testResults.zarit ? { score: testResults.zarit } : { score: 0 },
    };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Manejar generación del informe
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleReportGenerated = (report: HBF22Report) => {
    setGeneratedReport(report);
    
    // OPCIONAL: Guardar en base de datos
    saveReportToDatabase(report);
    
    // Mostrar notificación de éxito
    toast({
      title: "Informe Generado",
      description: `Informe HB-F22 para ${report.resident.fullName} compilado exitosamente.`,
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: Guardar informe en base de datos (OPCIONAL)
  // ───────────────────────────────────────────────────────────────────────────
  
  const saveReportToDatabase = async (report: HBF22Report) => {
    try {
      // Guardar en tabla de informes geriátricos
      const { data, error } = await supabase
        .from("geriatric_reports_hbf22")
        .insert({
          resident_id: report.resident.id,
          professional_id: user?.id,
          report_data: JSON.stringify(report),
          dependency_profile: report.correlations.dependencyProfile,
          fragility_status: report.correlations.fragilityStatus,
          risk_count: report.riskAlerts.length,
          high_risk_count: report.riskAlerts.filter(a => a.level === "HIGH").length,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      console.log("Informe guardado en base de datos:", data);
    } catch (error) {
      console.error("Error guardando informe:", error);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PASO 3: INTEGRAR EN LA INTERFAZ DE USUARIO
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Resto del componente ValoracionGeriatrica existente... */}

      {/* NUEVA SECCIÓN: Generador HB-F22 */}
      {selectedResident && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-700" />
              <h3 className="text-lg font-bold text-red-700">
                Informe Inteligente HB-F22
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHBF22Generator(!showHBF22Generator)}
            >
              {showHBF22Generator ? "Ocultar" : "Mostrar"}
            </Button>
          </div>

          {showHBF22Generator && (
            <GeneradorHBF22
              residentId={selectedResident.id}
              residentName={selectedResident.full_name}
              residentAge={calculateAge(selectedResident.date_of_birth)}
              residentGender={selectedResident.gender}
              residentDocId={selectedResident.document_id}
              assessmentResults={compileAssessmentResults()}
              professionalName={user?.user_metadata?.name || "Profesional"}
              professionalRole="Especialista en Geriatría"
              professionalNit="901.904.984-0"
              onReportGenerated={handleReportGenerated}
            />
          )}

          {/* Vista de informe generado */}
          {generatedReport && (
            <div className="mt-6 pt-6 border-t space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">Escalas Evaluadas</p>
                  <p className="text-2xl font-bold text-red-700">{generatedReport.scales.length}</p>
                </div>
                <div className="rounded bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">Alertas</p>
                  <p className="text-2xl font-bold text-orange-700">{generatedReport.riskAlerts.length}</p>
                </div>
                <div className="rounded bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">Programas Cuidado</p>
                  <p className="text-2xl font-bold text-blue-700">{generatedReport.carePlan.length}</p>
                </div>
                <div className="rounded bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">Estado</p>
                  <p className="text-sm font-semibold text-green-700">✓ Completo</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información si no hay residente seleccionado */}
      {!selectedResident && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Selecciona un residente para generar el Informe Inteligente HB-F22
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 4: FUNCIONES AUXILIARES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calcula edad a partir de fecha de nacimiento
 */
function calculateAge(dateOfBirth: string | null): number | undefined {
  if (!dateOfBirth) return undefined;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Formatea fecha para mostrar
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 5: SCHEMA DE BASE DE DATOS (SQL PARA SUPABASE)
// ═════════════════════════════════════════════════════════════════════════════

/**
CREATE TABLE geriatric_reports_hbf22 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id),
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  
  report_data JSONB NOT NULL,
  
  dependency_profile TEXT NOT NULL,
  fragility_status TEXT NOT NULL,
  risk_count INTEGER DEFAULT 0,
  high_risk_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT fk_resident FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX idx_hbf22_resident ON geriatric_reports_hbf22(resident_id);
CREATE INDEX idx_hbf22_professional ON geriatric_reports_hbf22(professional_id);
CREATE INDEX idx_hbf22_created ON geriatric_reports_hbf22(created_at);
CREATE INDEX idx_hbf22_risk ON geriatric_reports_hbf22(high_risk_count);

-- Políticas de seguridad (RLS)
ALTER TABLE geriatric_reports_hbf22 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own reports"
  ON geriatric_reports_hbf22
  FOR SELECT
  USING (professional_id = auth.uid());

CREATE POLICY "Users can insert own reports"
  ON geriatric_reports_hbf22
  FOR INSERT
  WITH CHECK (professional_id = auth.uid());
 */

// ═════════════════════════════════════════════════════════════════════════════
// PASO 6: QUERY SUPABASE PARA OBTENER INFORMES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtener historico de informes HBF22 de un residente
 */
export async function getResidentReports(residentId: string) {
  const { data, error } = await supabase
    .from("geriatric_reports_hbf22")
    .select(`
      id,
      created_at,
      dependency_profile,
      fragility_status,
      risk_count,
      high_risk_count,
      professional:professional_id (full_name, email)
    `)
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Obtener informe específico con datos completos
 */
export async function getFullReport(reportId: string) {
  const { data, error } = await supabase
    .from("geriatric_reports_hbf22")
    .select("report_data")
    .eq("id", reportId)
    .single();

  if (error) throw error;
  return data?.report_data;
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 7: HOOK PERSONALIZADO (OPCIONAL)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gestionar HBF22 reports
 */
export function useHBF22Reports(residentId: string | null) {
  const [reports, setReports] = useState<HBF22Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!residentId) return;

    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const data = await getResidentReports(residentId);
        setReports(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [residentId]);

  return { reports, isLoading, error };
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 8: VISTA DE HISTORIAL DE INFORMES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Componente para mostrar historial de informes HBF22
 */
export function ReportHistory({ residentId }: { residentId: string }) {
  const { reports, isLoading } = useHBF22Reports(residentId);

  if (isLoading) {
    return <div>Cargando informes...</div>;
  }

  if (reports.length === 0) {
    return <div className="text-gray-500">No hay informes generados aún.</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Historial de Informes HBF22</h3>
      {reports.map((report) => (
        <div key={report.id} className="rounded border p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-sm">{formatDate(new Date(report.created_at))}</p>
              <p className="text-xs text-gray-600">
                {report.correlations.dependencyProfile} | 
                {report.riskAlerts.length} alertas
              </p>
            </div>
            <Button size="sm" variant="outline">
              Ver Detalles
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FINAL: INTEGRACIÓN COMPLETADA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Checklist de integración:
 * 
 * ✓ Importar GeneradorHBF22
 * ✓ Compilar resultados en AssessmentResults
 * ✓ Pasar datos al componente
 * ✓ Manejar callback onReportGenerated
 * ✓ Guardar en base de datos (opcional)
 * ✓ Mostrar alertas y estado
 * ✓ Permitir exportación a PDF/Word/Excel
 * ✓ Crear tabla en Supabase (opcional)
 * ✓ Implementar historial de informes
 * ✓ Agregar políticas de seguridad (RLS)
 */
