import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2, Phone, Users, MessageSquare, Calendar } from "lucide-react";

interface Props { onBack: () => void; }

const COMM_TYPES = ['Visita presencial', 'Llamada telefónica', 'Videollamada', 'Reunión familiar', 'Comunicado escrito', 'Autorización especial'];
const MOODS_AFTER = ['Animado', 'Tranquilo', 'Nostálgico', 'Ansioso', 'Sin cambio notable'];

const AI_SUMMARIES: Record<string, string> = {
  'Visita presencial': 'La visita presencial fortalece el vínculo afectivo y contribuye positivamente al bienestar emocional del residente. Se recomienda mantener la regularidad de las visitas y coordinar con el equipo terapéutico si se observan cambios conductuales post-visita.',
  'Llamada telefónica': 'La comunicación telefónica es un apoyo afectivo importante cuando la visita presencial no es posible. Se sugiere acordar horarios fijos de llamada para generar un sentido de rutina y seguridad en el residente.',
  'Videollamada': 'La videollamada permite el contacto visual y reduce la sensación de abandono. Se recomienda realizarla en un espacio tranquilo y con buena iluminación para una experiencia positiva.',
  'Reunión familiar': 'La reunión familiar permite alinear expectativas, resolver inquietudes y establecer acuerdos en el plan de cuidados. Se debe documentar los compromisos adquiridos y hacer seguimiento en la próxima reunión.',
  'Comunicado escrito': 'El comunicado escrito queda como evidencia formal en el expediente del residente. Se debe archivar en la carpeta de comunicaciones y notificar al coordinador.',
  'Autorización especial': 'La autorización debe quedar firmada y archivada. Verificar que el familiar tenga facultad legal para emitir la autorización. Registrar en el sistema de permisos del residente.',
};

const FamilyCommunication = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    resident_id: '', comm_type: '', family_member_name: '', relationship: '',
    comm_date: new Date().toISOString().split('T')[0], duration_minutes: '',
    topics_discussed: '', resident_mood_after: '', authorized_action: '',
    staff_observations: '', follow_up_required: false, follow_up_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const { data } = await supabase.from('family_communications' as any).select('*, residents(full_name)')
      .order('comm_date', { ascending: false }).limit(30);
    if (data) setRecords(data as any[]);
  };

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const generateAI = () => {
    if (!form.comm_type) return;
    setGenerating(true);
    const resident = residents.find(r => r.id === form.resident_id);
    const base = AI_SUMMARIES[form.comm_type] || 'Registrar el detalle de la comunicación y dar seguimiento según el protocolo institucional.';
    const note = `REGISTRO DE COMUNICACIÓN FAMILIAR — ${form.comm_date}\n` +
      `Residente: ${resident?.full_name || '—'} | Tipo: ${form.comm_type}\n` +
      `Familiar: ${form.family_member_name || '—'} (${form.relationship || '—'})\n\n` +
      `ANÁLISIS:\n${base}\n\n` +
      (form.topics_discussed ? `TEMAS TRATADOS:\n${form.topics_discussed}\n\n` : '') +
      (form.resident_mood_after ? `ESTADO ANÍMICO POST-COMUNICACIÓN: ${form.resident_mood_after}\n\n` : '') +
      (form.follow_up_required ? `⚠️ SEGUIMIENTO REQUERIDO:\n${form.follow_up_notes || 'Pendiente de definir acciones'}\n` : '');
    setAiNote(note);
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!user || !form.resident_id || !form.comm_type) return;
    setSaving(true);
    const { error } = await supabase.from('family_communications' as any).insert({
      ...form, duration_minutes: parseInt(form.duration_minutes) || null,
      created_by: user.id, ai_summary: aiNote || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Comunicación registrada" });
      setShowForm(false);
      setAiNote("");
      setForm({ resident_id: '', comm_type: '', family_member_name: '', relationship: '', comm_date: new Date().toISOString().split('T')[0], duration_minutes: '', topics_discussed: '', resident_mood_after: '', authorized_action: '', staff_observations: '', follow_up_required: false, follow_up_notes: '' });
      loadRecords();
    }
    setSaving(false);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    'Visita presencial': <Users size={14} />,
    'Llamada telefónica': <Phone size={14} />,
    'Videollamada': <MessageSquare size={14} />,
    'Reunión familiar': <Users size={14} />,
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F27: Comunicaciones con Familia" subtitle="Registro de visitas, llamadas y reuniones familiares" onBack={onBack} />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-6 min-h-[48px]">
        <Calendar size={16} /> Nueva Comunicación
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
              <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de comunicación</label>
              <select value={form.comm_type} onChange={e => update('comm_type', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {COMM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Nombre del familiar</label>
              <input type="text" value={form.family_member_name} onChange={e => update('family_member_name', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Parentesco</label>
              <select value={form.relationship} onChange={e => update('relationship', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {['Hijo/a', 'Cónyuge', 'Hermano/a', 'Nieto/a', 'Sobrino/a', 'Acudiente legal', 'Otro'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
              <input type="date" value={form.comm_date} onChange={e => update('comm_date', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Duración (minutos)</label>
              <input type="number" min={1} value={form.duration_minutes} onChange={e => update('duration_minutes', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Temas tratados</label>
            <textarea value={form.topics_discussed} onChange={e => update('topics_discussed', e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="Salud del residente, inquietudes, planes de visita, cambios en el contrato..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Estado anímico del residente después</label>
              <select value={form.resident_mood_after} onChange={e => update('resident_mood_after', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {MOODS_AFTER.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Autorización emitida (si aplica)</label>
              <input type="text" value={form.authorized_action} onChange={e => update('authorized_action', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                placeholder="Permiso de salida, cambio de dieta, etc." />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Observaciones del personal</label>
            <textarea value={form.staff_observations} onChange={e => update('staff_observations', e.target.value)} rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
            <input type="checkbox" checked={form.follow_up_required} onChange={e => update('follow_up_required', e.target.checked)} className="w-5 h-5 accent-primary" />
            <span className="text-sm font-medium">Requiere seguimiento</span>
          </label>
          {form.follow_up_required && (
            <textarea value={form.follow_up_notes} onChange={e => update('follow_up_notes', e.target.value)} rows={2}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="Describir la acción de seguimiento y responsable..." />
          )}

          {/* AI Section */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-primary flex items-center gap-1"><Sparkles size={12} /> Nota de seguimiento con IA</p>
              <button onClick={generateAI} disabled={generating || !form.comm_type}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-40">
                {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                Generar
              </button>
            </div>
            <textarea value={aiNote} onChange={e => setAiNote(e.target.value)} rows={5}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-none font-mono"
              placeholder="La nota se generará automáticamente..." />
          </div>

          <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id || !form.comm_type} />
        </div>
      )}

      {/* Records list */}
      <div className="space-y-3">
        {records.length === 0 && <p className="text-sm text-muted-foreground">Sin comunicaciones registradas.</p>}
        {records.map((r: any) => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                {typeIcons[r.comm_type] ?? <Calendar size={10} />} {r.comm_type}
              </span>
              <span className="text-xs text-muted-foreground"><Calendar size={10} className="inline mr-1" />{r.comm_date}</span>
              {r.follow_up_required && <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-md">Seguimiento</span>}
            </div>
            <p className="text-sm font-bold text-foreground">{(r.residents as any)?.full_name}</p>
            <p className="text-xs text-muted-foreground">{r.family_member_name} ({r.relationship}) {r.duration_minutes ? `• ${r.duration_minutes} min` : ''}</p>
            {r.topics_discussed && <p className="text-xs mt-1 text-foreground line-clamp-2">{r.topics_discussed}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FamilyCommunication;
