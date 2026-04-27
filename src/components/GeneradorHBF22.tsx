/**
 * COMPONENTE: Generador de Informe HB-F22
 * Interfaz para compilar evaluaciones y generar informe integral con exportación multi-formato
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  buildHBF22Report,
  type HBF22Report,
  type AssessmentResults,
} from "@/lib/hb-f22-report";
import {
  exportHBF22PDF,
  exportHBF22Word,
  exportHBF22Excel,
  buildHBF22HTML,
} from "@/lib/hb-f22-export";

interface GeneradorHBF22Props {
  residentId: string;
  residentName: string;
  residentAge?: number;
  residentGender?: string;
  residentDocId?: string;
  assessmentResults: AssessmentResults;
  professionalName: string;
  professionalRole: string;
  professionalNit?: string;
  onReportGenerated?: (report: HBF22Report) => void;
}

export const GeneradorHBF22: React.FC<GeneradorHBF22Props> = ({
  residentId,
  residentName,
  residentAge,
  residentGender,
  residentDocId,
  assessmentResults,
  professionalName,
  professionalRole,
  professionalNit,
  onReportGenerated,
}) => {
  const [report, setReport] = useState<HBF22Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "word" | "excel" | null>(null);
  const { toast } = useToast();

  // Contar escalas completadas
  const completedScales = Object.values(assessmentResults).filter(
    (r) => r.score !== undefined
  ).length;
  const totalScales = Object.keys(assessmentResults).length;

  // Generar informe
  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);

      const newReport = buildHBF22Report(
        {
          id: residentId,
          fullName: residentName,
          documentId: residentDocId,
          age: residentAge,
          gender: residentGender,
        },
        assessmentResults,
        {
          name: professionalName,
          role: professionalRole,
          nit: professionalNit,
        }
      );

      setReport(newReport);
      onReportGenerated?.(newReport);

      toast({
        title: "Informe generado",
        description: `Informe HBF22 compilado con ${completedScales} escalas evaluadas.`,
      });
    } catch (error) {
      console.error("Error generando informe:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el informe.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!report) return;
    try {
      setIsExporting(true);
      setExportFormat("pdf");
      await exportHBF22PDF(report, `HBF22_${residentName.replace(/\s/g, "_")}`);
      toast({
        title: "PDF Exportado",
        description: "El informe se descargó en formato PDF.",
      });
    } catch (error) {
      console.error("Error exportando PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar a PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  // Exportar a Word
  const handleExportWord = async () => {
    if (!report) return;
    try {
      setIsExporting(true);
      setExportFormat("word");
      await exportHBF22Word(report, `HBF22_${residentName.replace(/\s/g, "_")}`);
      toast({
        title: "Word Exportado",
        description: "El informe se descargó en formato Word.",
      });
    } catch (error) {
      console.error("Error exportando Word:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar a Word.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!report) return;
    try {
      setIsExporting(true);
      setExportFormat("excel");
      await exportHBF22Excel(report, `HBF22_${residentName.replace(/\s/g, "_")}`);
      toast({
        title: "Excel Exportado",
        description: "El informe se descargó en formato Excel.",
      });
    } catch (error) {
      console.error("Error exportando Excel:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar a Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  // Vista previa en HTML
  const htmlContent = report ? buildHBF22HTML(report) : null;

  return (
    <div className="w-full space-y-4">
      {/* Estado de Evaluación */}
      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          Escalas completadas: <strong>{completedScales}</strong> de{" "}
          <strong>{totalScales}</strong>
          {completedScales === totalScales ? " ✓" : " - Faltan completar"}
        </AlertDescription>
      </Alert>

      {/* Botón Generar Informe */}
      <Button
        onClick={handleGenerateReport}
        disabled={isGenerating || completedScales === 0}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generando Informe...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Generar Informe HB-F22
          </>
        )}
      </Button>

      {/* Informe Generado */}
      {report && (
        <div className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✓ Informe compilado correctamente. Disponible para exportación.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="export">Exportar</TabsTrigger>
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            </TabsList>

            {/* Pestaña Exportar */}
            <TabsContent value="export" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isExporting && exportFormat === "pdf" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleExportWord}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isExporting && exportFormat === "word" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Word
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isExporting && exportFormat === "excel" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </>
                  )}
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Los documentos se generan automáticamente con estilos corporativos
                  profesionales, márgenes estandarizados y logo de Hogar Belén.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Pestaña Resumen */}
            <TabsContent value="summary" className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-lg text-red-700">
                  RESUMEN EJECUTIVO
                </h3>
                <p className="text-sm leading-relaxed">{report.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-xs text-gray-600 mb-1">Perfil de Dependencia</p>
                  <p className="font-bold text-red-700">
                    {report.correlations.dependencyProfile}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
                  <p className="text-xs text-gray-600 mb-1">Estado de Fragilidad</p>
                  <p className="font-bold text-orange-700">
                    {report.correlations.fragilityStatus}
                  </p>
                </div>
              </div>

              {/* Alertas */}
              {report.riskAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Alertas Detectadas ({report.riskAlerts.length})</h4>
                  {report.riskAlerts.slice(0, 3).map((alert, idx) => (
                    <Alert
                      key={idx}
                      className={
                        alert.level === "HIGH"
                          ? "border-red-300 bg-red-50"
                          : alert.level === "MODERATE"
                            ? "border-yellow-300 bg-yellow-50"
                            : "border-green-300 bg-green-50"
                      }
                    >
                      <AlertCircle
                        className={`h-4 w-4 ${
                          alert.level === "HIGH"
                            ? "text-red-600"
                            : alert.level === "MODERATE"
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      />
                      <AlertDescription className="text-xs ml-2">
                        {alert.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                  {report.riskAlerts.length > 3 && (
                    <p className="text-xs text-gray-600 italic">
                      + {report.riskAlerts.length - 3} alertas más en el informe completo
                    </p>
                  )}
                </div>
              )}

              {/* Plan de Cuidado */}
              {report.carePlan.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Plan de Cuidado ({report.carePlan.length} programas)</h4>
                  {report.carePlan.slice(0, 2).map((plan, idx) => (
                    <div key={idx} className="rounded border p-2 bg-gray-50">
                      <p className="font-semibold text-xs text-red-700 mb-1">
                        {plan.title}
                      </p>
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {plan.description}
                      </p>
                    </div>
                  ))}
                  {report.carePlan.length > 2 && (
                    <p className="text-xs text-gray-600 italic">
                      + {report.carePlan.length - 2} programas más en el informe completo
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Pestaña Preview */}
            <TabsContent value="preview" className="space-y-4">
              {htmlContent && (
                <div
                  className="rounded-lg border bg-white p-4 max-h-96 overflow-y-auto text-xs"
                  dangerouslySetInnerHTML={{
                    __html: htmlContent.substring(0, 2000) + "...",
                  }}
                />
              )}
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  La vista previa muestra las primeras líneas del informe. Descargue el
                  documento completo en PDF, Word o Excel para ver todo el contenido.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default GeneradorHBF22;
