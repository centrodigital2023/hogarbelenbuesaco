import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2, Ambulance, CheckCircle2, Clock } from "lucide-react";

interface Props { onBack: () => void; }

const REFERRAL_REASONS = [
  'Fractura', 'Infección grave / Sepsis', 'Descompensación cardiovascular', 'ACV / Evento neurológico',
  'Insuficiencia respiratoria', 'Deshidratación severa', 'Hemorragia', 'Caída con trauma',
  'Cirugía programada', 'Procedimiento diagnóstico', 'Crisis hipertensiva', 'Hipoglucemia severa',
  'Otra causa médica',
];
const REFERRAL_DESTINATIONS = [
  'Hospital Universitario Departamental de Nariño', 'Clínica EMSSANAR', 'Hospital Civil de Ipiales',
  'Hospital San Pedro de Pasto', 'Clínica Uniandes', 'IPS de la EPS', 'Urgencias local', 'Otro',
];
const TRANSPORT_TYPES = ['Ambulancia básica', 'Ambulancia medicalizada', 'Vehículo particular', 'Taxi', 'Traslado propio familiar'];

const generateAISummary = (
  residentName: string, reason: string, destination: string, date: string, companion: string
): string => {
  const lines = [
    `RESUMEN DE REFERENCIA / HOSPITALIZACIÓN — ${date}`,
    `Residente: ${residentName || '—'}`,
    `Motivo: ${reason || '—'}`,
    `Destino: ${destination || '—'}`,
    '',
    'ACCIONES REALIZADAS ANTES DEL TRASLADO:',
    '• Evaluación y estabilización inicial por enfermería',
    '• Notificación al familiar responsable o acudiente legal',
    '• Preparación del resumen clínico y hoja de remisión',
    '• Administración de medicamentos de emergencia según prescripción (si aplica)',
    '• Contacto con la IPS receptora para preanuncio del caso',
    '',
    'DOCUMENTACIÓN ENVIADA CON EL RESIDENTE:',
    '• Resumen de historia clínica del hogar',
    '• Lista de medicamentos activos con dosis y horarios',
    '• Resultado de últimos exámenes de laboratorio / imágenes',
    '• Documento de identidad y carné de EPS',
    '• Datos de contacto del acudiente',
    '',
    companion ? `ACOMPAÑANTE: ${companion}` : 'ACOMPAÑANTE: Pendiente de confirmar',
    '',
    'SEGUIMIENTO POSTERIOR:',
    '• Contactar a la IPS a las 24h para verificar estado del paciente',
    '• Registrar evolución del traslado en bitácora de enfermería',
    '• Planificar reintegro al hogar una vez dado de alta: recibir epicrisis y actualizar plan de cuidados',
    '• Notificar al médico tratante del hogar sobre el traslado',
  ];
  return lines.join('\n');
};

const HospitalizationRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    resident_id: '', event_date: new Date().toISOString().split('T')[0],
    referral_reason: '', referral_destination: '', transport_type: '',
    companion_name: '', companion_relationship: '', family_notified: false,
    family_contact_name: '', pre_admission_actions: '',
    discharge_date: '', discharge_diagnosis: '', reintegration_notes: '',
    status: 'hospitalizado',
  });
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const { data } = await supabase.from('hospitalization_records' as any)
      .select('*, residents(full_name)').order('event_date', { ascending: false }).limit(20);
    if (data) setRecords(data as any[]);
  };

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const generateAI = () => {
    setGenerating(true);
    const resident = residents.find(r => r.id === form.resident_id);
    setAiSummary(generateAISummary(
      resident?.full_name || '', form.referral_reason, form.referral_destination,
      form.event_date, form.companion_name
    ));
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!user || !form.resident_id || !form.referral_reason) return;
    setSaving(true);
    const { error } = await supabase.from('hospitalization_records' as any).insert({
      ...form, created_by: user.id, ai_summary: aiSummary || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Referencia registrada" });
      setShowForm(false); setAiSummary("");
      setForm({ resident_id:'', event_date: new Date().toISOString().split('T')[0], referral_reason:'', referral_destination:'', transport_type:'', companion_name:'', companion_relationship:'', family_notified:false, family_contact_name:'', pre_admission_actions:'', discharge_date:'', discharge_diagnosis:'', reintegration_notes:'', status:'hospitalizado' });
      loadRecords();
    }
    setSaving(false);
  };

  const statusColor: Record<string, string> = {
    hospitalizado: 'bg-destructive/10 text-destructive',
    alta: 'bg-cat-nutritional/10 text-cat-nutritional',
    fallecido: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F19: Referencia y Hospitalización" subtitle="Traslados a urgencias, hospitalizaciones y seguimiento de reintegro" onBack={onBack} />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-6 min-h-[48px]">
        <Ambulance size={16} /> Nueva Referencia
      </button>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
              <select value={form.resident_id} onChange={e => update('resident_id', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Fecha del evento</label>
              <input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Motivo de referencia</label>
              <select value={form.referral_reason} onChange={e => update('referral_reason', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {REFERRAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Destino</label>
              <select value={form.referral_destination} onChange={e => update('referral_destination', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {REFERRAL_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de transporte</label>
              <select value={form.transport_type} onChange={e => update('transport_type', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Estado</label>
              <select value={form.status} onChange={e => update('status', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="hospitalizado">Hospitalizado</option>
                <option value="alta">Dado de alta</option>
                <option value="fallecido">Fallecido</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Acompañante</label>
              <input type="text" value={form.companion_name} onChange={e => update('companion_name', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Parentesco</label>
              <input type="text" value={form.companion_relationship} onChange={e => update('companion_relationship', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
            <input type="checkbox" checked={form.family_notified} onChange={e => update('family_notified', e.target.checked)} className="w-5 h-5 accent-primary" />
            <span className="text-sm">Familia notificada</span>
          </label>
          {form.family_notified && (
            <input type="text" value={form.family_contact_name} onChange={e => update('family_contact_name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
              placeholder="Nombre del familiar contactado" />
          )}

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Acciones previas al traslado</label>
            <textarea value={form.pre_admission_actions} onChange={e => update('pre_admission_actions', e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="Estabilización, medicamentos administrados, documentación enviada..." />
          </div>

          {form.status === 'alta' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Fecha de alta</label>
                  <input type="date" value={form.discharge_date} onChange={e => update('discharge_date', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Diagnóstico de egreso</label>
                  <input type="text" value={form.discharge_diagnosis} onChange={e => update('discharge_diagnosis', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Notas de reintegro</label>
                <textarea value={form.reintegration_notes} onChange={e => update('reintegration_notes', e.target.value)} rows={2}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
                  placeholder="Cambios en medicación, nuevas indicaciones, cuidados especiales post-hospitalización..." />
              </div>
            </>
          )}

          {/* AI Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-primary flex items-center gap-1"><Sparkles size={12} /> Resumen de referencia con IA</p>
              <button onClick={generateAI} disabled={generating || !form.referral_reason}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-40">
                {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                Generar
              </button>
            </div>
            <textarea value={aiSummary} onChange={e => setAiSummary(e.target.value)} rows={8}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-none font-mono"
              placeholder="Seleccione el motivo de referencia para generar el resumen..." />
          </div>

          <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id || !form.referral_reason} />
        </div>
      )}

      {/* Records */}
      <div className="space-y-3">
        {records.length === 0 && <p className="text-sm text-muted-foreground">Sin referencias registradas.</p>}
        {records.map((r: any) => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColor[r.status] || 'bg-muted'}`}>
                {r.status === 'hospitalizado' ? <><Clock size={10} className="inline mr-1" />Hospitalizado</> : r.status === 'alta' ? <><CheckCircle2 size={10} className="inline mr-1" />Alta</> : r.status}
              </span>
              <span className="text-xs text-muted-foreground">{r.event_date}</span>
            </div>
            <p className="text-sm font-bold text-foreground">{(r.residents as any)?.full_name}</p>
            <p className="text-xs text-muted-foreground">{r.referral_reason} → {r.referral_destination}</p>
            {r.discharge_diagnosis && <p className="text-xs mt-1 text-foreground">Alta: {r.discharge_diagnosis}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalizationRecord;
