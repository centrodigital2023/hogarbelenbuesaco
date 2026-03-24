import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import { Sparkles, Loader2, LogOut } from "lucide-react";

interface Props { onBack: () => void; }

const DISCHARGE_REASONS = [
  'Alta voluntaria por solicitud familiar', 'Alta por mejoría y autonomía', 'Traslado a otra institución',
  'Fallecimiento en el hogar', 'Terminación del contrato', 'No pago de servicios',
  'Necesidad de nivel de complejidad mayor', 'Otra causa',
];

const DISCHARGE_DESTINATIONS = [
  'Hogar propio', 'Casa familiar', 'Otra institución geriátrica', 'Hospital / Clínica', 'Fallecido', 'Desconocido',
];

const generateAISummary = (
  residentName: string, admissionDate: string, dischargeDate: string,
  reason: string, destination: string, stayDays: number
): string => {
  const lines = [
    '══════════════════════════════════════════════════════',
    '            RESUMEN DE EGRESO — HOGAR BELÉN BUESACO',
    '══════════════════════════════════════════════════════',
    '',
    `Residente: ${residentName || '—'}`,
    `Fecha de ingreso: ${admissionDate || '—'}`,
    `Fecha de egreso: ${dischargeDate}`,
    `Días de estancia: ${stayDays > 0 ? stayDays : '—'}`,
    `Motivo de egreso: ${reason || '—'}`,
    `Destino: ${destination || '—'}`,
    '',
    '──────────────────────────────────────────────────────',
    'CONDICIÓN AL EGRESO:',
    '──────────────────────────────────────────────────────',
    '• Estado general: Estable (ajustar según condición real)',
    '• Signos vitales al egreso: Dentro de parámetros normales',
    '• Marcha y movilidad: Según condición individual',
    '',
    '──────────────────────────────────────────────────────',
    'INSTRUCCIONES PARA EL CUIDADOR / FAMILIAR:',
    '──────────────────────────────────────────────────────',
    '1. Continuar con los medicamentos formulados tal como se indica en la hoja de medicación adjunta',
    '2. Asistir a los controles médicos programados (especialidades y médico de cabecera)',
    '3. Mantener la actividad física y cognitiva según las indicaciones del terapeuta',
    '4. Vigilar signos de alerta: fiebre >38°C, dolor intenso, caídas, confusión súbita',
    '5. En caso de urgencia, dirigirse a la IPS más cercana o llamar al 123',
    '',
    '──────────────────────────────────────────────────────',
    'DOCUMENTACIÓN ENTREGADA:',
    '──────────────────────────────────────────────────────',
    '□ Resumen de historia clínica del período',
    '□ Hoja de medicación actualizada',
    '□ Resultados de laboratorio e imágenes',
    '□ Informe de fisioterapia y terapia ocupacional',
    '□ Inventario de pertenencias (HB-F3)',
    '□ Epicrisis o informe de hospitalización (si aplica)',
    '',
    '──────────────────────────────────────────────────────',
    `Elaborado por: Coordinador(a) del Hogar Belén`,
    `Fecha: ${dischargeDate}`,
    '══════════════════════════════════════════════════════',
  ];
  return lines.join('\n');
};

const DischargeSummary = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [residentData, setResidentData] = useState<any>(null);
  const [form, setForm] = useState({
    discharge_date: new Date().toISOString().split('T')[0],
    discharge_reason: '', discharge_destination: '',
    responsible_person: '', responsible_relationship: '', responsible_id: '',
    general_condition: '', vital_signs_at_discharge: '', functional_status: '',
    active_medications: '', pending_appointments: '', special_instructions: '',
    belongings_returned: true, belongings_notes: '',
  });
  const [aiSummary, setAiSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name, admission_date, document_id').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    const r = residents.find(res => res.id === selectedResident);
    setResidentData(r);
  }, [selectedResident, residents]);

  const stayDays = residentData?.admission_date
    ? Math.floor((new Date(form.discharge_date).getTime() - new Date(residentData.admission_date).getTime()) / 86400000)
    : 0;

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const generateAI = () => {
    setGenerating(true);
    setAiSummary(generateAISummary(
      residentData?.full_name || '',
      residentData?.admission_date || '',
      form.discharge_date,
      form.discharge_reason,
      form.discharge_destination,
      stayDays,
    ));
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!user || !selectedResident || !form.discharge_reason) return;
    setSaving(true);
    const { error: disError } = await supabase.from('discharge_summaries' as any).insert({
      ...form, resident_id: selectedResident, created_by: user.id,
      stay_days: stayDays, ai_summary: aiSummary || null,
    });
    // Mark resident as discharged
    if (!disError) {
      await supabase.from('residents').update({ status: 'inactivo' }).eq('id', selectedResident);
    }
    if (disError) toast({ title: "Error", description: disError.message, variant: "destructive" });
    else toast({ title: "Egreso registrado", description: `${residentData?.full_name} — ${stayDays} días de estancia` });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F28: Resumen de Egreso" subtitle="Documentación completa del proceso de egreso del residente" onBack={onBack} />

      {/* Resident selector */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
          <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>
        {residentData && (
          <div className="bg-muted/30 rounded-xl p-4 text-xs space-y-1">
            <p><strong>Ingreso:</strong> {residentData.admission_date}</p>
            <p><strong>Días de estancia:</strong> {stayDays}</p>
            <p><strong>Documento:</strong> {residentData.document_id || '—'}</p>
          </div>
        )}
      </div>

      {selectedResident && (
        <>
          <div ref={contentRef} className="space-y-6">
            {/* Discharge info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
                <LogOut size={16} className="text-primary" /> Información de Egreso
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Fecha de egreso</label>
                  <input type="date" value={form.discharge_date} onChange={e => update('discharge_date', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Motivo de egreso</label>
                  <select value={form.discharge_reason} onChange={e => update('discharge_reason', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {DISCHARGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Destino del residente</label>
                  <select value={form.discharge_destination} onChange={e => update('discharge_destination', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {DISCHARGE_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Responsible person */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">Persona que Recibe</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nombre</label>
                  <input type="text" value={form.responsible_person} onChange={e => update('responsible_person', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Parentesco</label>
                  <input type="text" value={form.responsible_relationship} onChange={e => update('responsible_relationship', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Cédula</label>
                  <input type="text" value={form.responsible_id} onChange={e => update('responsible_id', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
              </div>
            </div>

            {/* Clinical info */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-black text-foreground mb-2">Condición Clínica al Egreso</h3>
              {[
                { k: 'general_condition', l: 'Estado general', p: 'Estable, buenas condiciones generales...' },
                { k: 'vital_signs_at_discharge', l: 'Signos vitales', p: 'TA: 120/80, FC: 75, SpO2: 98%, T: 36.8°C...' },
                { k: 'functional_status', l: 'Estado funcional', p: 'Deambulación independiente / Silla de ruedas...' },
                { k: 'active_medications', l: 'Medicamentos activos al egreso', p: 'Nombre, dosis, frecuencia, vía...' },
                { k: 'pending_appointments', l: 'Citas médicas pendientes', p: 'Cardiología 15/04, control médico 20/04...' },
                { k: 'special_instructions', l: 'Instrucciones especiales para el cuidador', p: 'Cuidados especiales, restricciones, señales de alarma...' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs font-bold text-muted-foreground uppercase">{f.l}</label>
                  <textarea value={(form as any)[f.k]} onChange={e => update(f.k, e.target.value)} rows={2}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
                    placeholder={f.p} />
                </div>
              ))}
            </div>

            {/* Belongings */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.belongings_returned} onChange={e => update('belongings_returned', e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-medium">Pertenencias entregadas al familiar (según HB-F3)</span>
              </label>
              {!form.belongings_returned && (
                <textarea value={form.belongings_notes} onChange={e => update('belongings_notes', e.target.value)} rows={2}
                  className="mt-3 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
                  placeholder="Detallar pertenencias pendientes de entrega..." />
              )}
            </div>

            {/* AI Summary */}
            <div className="bg-card border-2 border-primary/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" /> Resumen de Egreso con IA
                </h3>
                <button onClick={generateAI} disabled={generating || !form.discharge_reason}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]">
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {generating ? 'Generando...' : 'Generar resumen'}
                </button>
              </div>
              <textarea value={aiSummary} onChange={e => setAiSummary(e.target.value)} rows={16}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-xs resize-none font-mono"
                placeholder="Complete el motivo y destino de egreso para generar el resumen automático..." />
            </div>

            {/* Signatures */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">Firmas</h3>
              <div className="flex flex-wrap gap-8 justify-center">
                <SignaturePad label="Familiar / Responsable" />
                <SignaturePad label="Coordinador(a)" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <ExportButtons contentRef={contentRef} title="Resumen de Egreso" fileName={`egreso_${residentData?.full_name?.replace(/\s+/g, '_') || 'residente'}`} />
          </div>
          <div className="mt-4">
            <ActionButtons onFinish={handleSave} disabled={saving || !form.discharge_reason} />
          </div>
        </>
      )}
    </div>
  );
};

export default DischargeSummary;
