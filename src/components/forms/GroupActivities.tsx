import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2, Plus, Users, Calendar } from "lucide-react";

interface Props { onBack: () => void; }

const ACTIVITY_CATEGORIES = [
  'Arte y Manualidades', 'Música y Canto', 'Terapia Cognitiva', 'Actividad Física Grupal',
  'Jardinería', 'Lectura / Cuentacuentos', 'Juegos de Mesa', 'Cine / Proyección',
  'Recreación al Aire Libre', 'Festividad Cultural', 'Otra',
];

const OUTCOMES = ['Muy positivo', 'Positivo', 'Neutral', 'Poco motivados', 'Difícil de desarrollar'];

// AI-generated activity suggestions by category
const AI_SUGGESTIONS: Record<string, { objectives: string; materials: string; eval: string }> = {
  'Arte y Manualidades': {
    objectives: 'Estimular la coordinación óculo-manual, la creatividad y la autoexpresión. Fomentar la identidad personal y el logro de resultados tangibles.',
    materials: 'Cartulinas, pinturas, pinceles, tijeras de seguridad, pegante, material reciclable, revistas para collage.',
    eval: 'Observar participación activa, estado anímico durante y después, calidad del producto realizado y verbalización de emociones. Registrar asistentes.',
  },
  'Música y Canto': {
    objectives: 'Activar memoria autobiográfica a través de canciones conocidas. Mejorar estado de ánimo, reducir ansiedad y fomentar el vínculo grupal.',
    materials: 'Reproductor de música, canciones de las décadas de juventud de los residentes, instrumentos simples (maracas, panderetas), letras impresas en letra grande.',
    eval: 'Nivel de participación verbal y gestual, expresión emocional observada, cambio en el estado de ánimo post-sesión.',
  },
  'Terapia Cognitiva': {
    objectives: 'Estimular funciones cognitivas: memoria, atención, lenguaje, orientación temporoespacial y cálculo.',
    materials: 'Fichas de memoria, crucigramas adaptados, juegos de categorías, calendarios, fotografías familiares, periódico local.',
    eval: 'Número de respuestas correctas, tiempo de atención sostenida, comparación con sesiones anteriores. Registrar en ficha individual.',
  },
  'Actividad Física Grupal': {
    objectives: 'Mejorar movilidad articular, fuerza muscular, equilibrio y bienestar cardiovascular. Prevenir el sedentarismo.',
    materials: 'Sillas firmes, pelotas blandas, bandas elásticas suaves, música motivadora. Ropa cómoda.',
    eval: 'Tolerancia al ejercicio, signos de fatiga, participación. Medir FC antes y después si aplica. Registrar ausencias por condición de salud.',
  },
  'Jardinería': {
    objectives: 'Fomentar el contacto con la naturaleza, la responsabilidad, la estimulación sensorial y el sentido de logro.',
    materials: 'Macetas, tierra, semillas o plantas pequeñas, regadera, guantes de jardinería, etiquetas.',
    eval: 'Motivación observada, destreza manual, comentarios espontáneos sobre la actividad, satisfacción expresada.',
  },
  'Lectura / Cuentacuentos': {
    objectives: 'Estimular la imaginación, el lenguaje y la memoria semántica. Fomentar la escucha activa y el debate generacional.',
    materials: 'Libros con letra grande, cuentos ilustrados, poemas regionales, anécdotas locales, láminas.',
    eval: 'Participación en debate posterior, comprensión del relato, interés demostrado.',
  },
  'Juegos de Mesa': {
    objectives: 'Estimular la concentración, el razonamiento, la memoria procedimental y las habilidades sociales.',
    materials: 'Dominó, parqués, cartas, ajedrez adaptado, lotería de imágenes, bingo.',
    eval: 'Nivel de comprensión de reglas, interacción entre participantes, emoción positiva o frustración observada.',
  },
};

const GroupActivities = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    activity_name: '', category: '',
    activity_date: new Date().toISOString().split('T')[0],
    start_time: '10:00', duration_minutes: '60',
    responsible_staff: '', location: 'Sala común',
    objectives: '', materials: '',
    outcome: '', observations: '', eval_notes: '',
  });
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ objectives: string; materials: string; eval: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
    loadActivities();
  }, []);

  const loadActivities = async () => {
    const { data } = await supabase.from('group_activities' as any).select('*')
      .order('activity_date', { ascending: false }).limit(20);
    if (data) setActivities(data as any[]);
  };

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const generateAI = () => {
    if (!form.category) return;
    setGenerating(true);
    const suggestion = AI_SUGGESTIONS[form.category];
    if (suggestion) {
      setAiSuggestion(suggestion);
      setForm(p => ({ ...p, objectives: suggestion.objectives, materials: suggestion.materials, eval_notes: suggestion.eval }));
    }
    setGenerating(false);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user || !form.activity_name || !form.category) return;
    setSaving(true);
    const attendees = selectedAttendees.map(id => ({
      resident_id: id,
      full_name: residents.find(r => r.id === id)?.full_name,
    }));
    const { error } = await supabase.from('group_activities' as any).insert({
      ...form, duration_minutes: parseInt(form.duration_minutes) || 60,
      attendees, attendees_count: attendees.length, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Actividad registrada", description: `${attendees.length} participantes` });
      setShowForm(false);
      setSelectedAttendees([]);
      setAiSuggestion(null);
      setForm({ activity_name:'', category:'', activity_date: new Date().toISOString().split('T')[0], start_time:'10:00', duration_minutes:'60', responsible_staff:'', location:'Sala común', objectives:'', materials:'', outcome:'', observations:'', eval_notes:'' });
      loadActivities();
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F29: Actividades Grupales" subtitle="Programación, registro de asistencia y evaluación de actividades" onBack={onBack} />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-6 min-h-[48px]">
        <Plus size={16} /> Nueva Actividad
      </button>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Nombre de la actividad</label>
              <input type="text" value={form.activity_name} onChange={e => update('activity_name', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                placeholder="Taller de pintura, Sesión de bingo..." />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Categoría</label>
              <select value={form.category} onChange={e => update('category', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {ACTIVITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
              <input type="date" value={form.activity_date} onChange={e => update('activity_date', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Hora inicio</label>
                <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Duración (min)</label>
                <input type="number" min={15} step={15} value={form.duration_minutes} onChange={e => update('duration_minutes', e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Responsable</label>
              <input type="text" value={form.responsible_staff} onChange={e => update('responsible_staff', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Lugar</label>
              <input type="text" value={form.location} onChange={e => update('location', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
          </div>

          {/* AI suggestions */}
          {form.category && (
            <div className="flex items-center gap-3">
              <button onClick={generateAI} disabled={generating}
                className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors min-h-[40px]">
                {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Completar con IA ({form.category})
              </button>
              {aiSuggestion && <span className="text-xs text-primary font-bold">✓ Sugerencias aplicadas</span>}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Objetivos</label>
            <textarea value={form.objectives} onChange={e => update('objectives', e.target.value)} rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="¿Qué se espera lograr con esta actividad?" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Materiales necesarios</label>
            <textarea value={form.materials} onChange={e => update('materials', e.target.value)} rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
          </div>

          {/* Attendees */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
              <Users size={12} /> Asistentes ({selectedAttendees.length} seleccionados)
            </label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {residents.map(r => (
                <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer text-xs transition-all ${selectedAttendees.includes(r.id) ? 'border-primary bg-primary/5 font-bold' : 'border-border text-muted-foreground'}`}>
                  <input type="checkbox" checked={selectedAttendees.includes(r.id)} onChange={() => toggleAttendee(r.id)} className="w-4 h-4 accent-primary" />
                  {r.full_name}
                </label>
              ))}
            </div>
          </div>

          {/* Post-activity evaluation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Resultado general</label>
              <select value={form.outcome} onChange={e => update('outcome', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">--</option>
                {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Observaciones generales</label>
              <input type="text" value={form.observations} onChange={e => update('observations', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Sparkles size={10} className="text-primary" /> Criterios de evaluación (IA)
            </label>
            <textarea value={form.eval_notes} onChange={e => update('eval_notes', e.target.value)} rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="Usar el botón IA para generar criterios de evaluación..." />
          </div>

          <ActionButtons onFinish={handleSave} disabled={saving || !form.activity_name || !form.category} />
        </div>
      )}

      {/* Activities list */}
      <div className="space-y-3">
        {activities.length === 0 && <p className="text-sm text-muted-foreground">Sin actividades registradas.</p>}
        {activities.map((a: any) => (
          <div key={a.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-foreground">{a.activity_name}</p>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">{a.category}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span><Calendar size={10} className="inline mr-1" />{a.activity_date} {a.start_time}</span>
              <span><Users size={10} className="inline mr-1" />{a.attendees_count || 0} participantes</span>
              {a.outcome && <span className="text-foreground font-medium">{a.outcome}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupActivities;
