import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props { onBack: () => void; }

// Braden Scale sub-scores
const BRADEN_ITEMS = [
  { key: 'sensory', label: 'Percepción sensorial', options: [
    { val: 1, text: '1 - Completamente limitada' }, { val: 2, text: '2 - Muy limitada' },
    { val: 3, text: '3 - Levemente limitada' }, { val: 4, text: '4 - Sin limitación' },
  ]},
  { key: 'moisture', label: 'Humedad de la piel', options: [
    { val: 1, text: '1 - Constantemente húmeda' }, { val: 2, text: '2 - Muy húmeda' },
    { val: 3, text: '3 - Ocasionalmente húmeda' }, { val: 4, text: '4 - Raramente húmeda' },
  ]},
  { key: 'activity', label: 'Actividad física', options: [
    { val: 1, text: '1 - En cama (confinado)' }, { val: 2, text: '2 - En silla (confinado)' },
    { val: 3, text: '3 - Camina ocasionalmente' }, { val: 4, text: '4 - Camina frecuentemente' },
  ]},
  { key: 'mobility', label: 'Movilidad', options: [
    { val: 1, text: '1 - Completamente inmóvil' }, { val: 2, text: '2 - Muy limitada' },
    { val: 3, text: '3 - Levemente limitada' }, { val: 4, text: '4 - Sin limitación' },
  ]},
  { key: 'nutrition', label: 'Nutrición', options: [
    { val: 1, text: '1 - Muy pobre (menos del 50%)' }, { val: 2, text: '2 - Probablemente inadecuada' },
    { val: 3, text: '3 - Adecuada' }, { val: 4, text: '4 - Excelente' },
  ]},
  { key: 'friction', label: 'Fricción y deslizamiento', options: [
    { val: 1, text: '1 - Problema' }, { val: 2, text: '2 - Problema potencial' },
    { val: 3, text: '3 - Sin problema aparente' },
  ]},
];

const WOUND_TYPES = ['Úlcera por presión', 'Herida quirúrgica', 'Herida traumática', 'Úlcera venosa', 'Úlcera arterial', 'Dermatitis', 'Otra'];
const WOUND_STAGES = ['Estadio I: Eritema no blanqueable', 'Estadio II: Pérdida parcial de grosor', 'Estadio III: Pérdida total de grosor', 'Estadio IV: Pérdida total + tejido expuesto', 'No estadificable'];
const WOUND_EXUDATE = ['Sin exudado', 'Escaso', 'Moderado', 'Abundante'];
const WOUND_TISSUE = ['Epitelización', 'Granulación', 'Esfacelos', 'Necrosis', 'Mixto'];
const BODY_LOCATIONS = ['Sacro/Cóccix', 'Talón derecho', 'Talón izquierdo', 'Trocánter derecho', 'Trocánter izquierdo', 'Glúteo', 'Maléolo', 'Codo', 'Escápula', 'Occipucio', 'Otra'];

const bradenRisk = (score: number) => {
  if (score <= 9) return { label: 'RIESGO ALTO', color: 'text-destructive', bg: 'bg-destructive/10', interventions: ['Cambios de posición cada 2 horas (registro en cronograma)', 'Superficies de alivio de presión (colchón viscoelástico o similar)', 'Protección de zonas de presión (talones, sacro) con apósitos hidrocoloides', 'Nutrición hipercalórica e hiperproteica con suplementos si es necesario', 'Control de humedad: pañales absorbentes, cremas barrera', 'Valorar interconsulta con médico o dermatólogo'] };
  if (score <= 12) return { label: 'RIESGO ALTO', color: 'text-destructive', bg: 'bg-destructive/10', interventions: ['Cambios de posición cada 2-3 horas', 'Superficies de alivio de presión', 'Hidratación cutánea diaria', 'Control nutricional reforzado'] };
  if (score <= 14) return { label: 'RIESGO MODERADO', color: 'text-cat-fragility', bg: 'bg-cat-fragility/10', interventions: ['Cambios de posición cada 4 horas', 'Hidratación cutánea diaria', 'Revisión de zonas de presión en cada turno', 'Monitorizar estado nutricional'] };
  if (score <= 18) return { label: 'RIESGO BAJO', color: 'text-cat-cognitive', bg: 'bg-cat-cognitive/10', interventions: ['Movilización activa según capacidad', 'Higiene cutánea adecuada', 'Revisión semanal de piel intacta'] };
  return { label: 'SIN RIESGO SIGNIFICATIVO', color: 'text-cat-nutritional', bg: 'bg-cat-nutritional/10', interventions: ['Mantener movilización y actividad', 'Hidratación e higiene habituales'] };
};

const WoundCare = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [tab, setTab] = useState<'braden' | 'wound'>('braden');
  const [selectedResident, setSelectedResident] = useState("");
  const [assessDate, setAssessDate] = useState(new Date().toISOString().split('T')[0]);
  const [bradenScores, setBradenScores] = useState<Record<string, number>>({});
  const [aiPlan, setAiPlan] = useState("");
  const [generating, setGenerating] = useState(false);
  const [woundForm, setWoundForm] = useState({
    wound_type: '', stage: '', location: '', exudate: '', tissue_type: '',
    length_cm: '', width_cm: '', depth_cm: '',
    treatment_applied: '', next_dressing_date: '', wound_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('wound_care_records' as any).select('*')
      .eq('resident_id', selectedResident).order('assessment_date', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setHistory(data as any[]); });
  }, [selectedResident]);

  const bradenTotal = Object.values(bradenScores).reduce((a, b) => a + b, 0);
  const risk = bradenTotal >= 6 ? bradenRisk(bradenTotal) : null;

  const generateAIPlan = () => {
    if (!risk) return;
    setGenerating(true);
    const resident = residents.find(r => r.id === selectedResident);
    const lines = [
      `EVALUACIÓN ESCALA DE BRADEN — ${assessDate}`,
      `Residente: ${resident?.full_name || '—'} | Puntaje: ${bradenTotal}/23`,
      `Clasificación: ${risk.label}`,
      '',
      'PLAN DE CUIDADOS PARA INTEGRIDAD CUTÁNEA:',
    ];
    risk.interventions.forEach((int, i) => lines.push(`${i + 1}. ${int}`));
    lines.push('', 'OBSERVACIONES ADICIONALES:');
    lines.push('• Registrar estado de la piel en cada cambio de turno');
    lines.push('• Informar inmediatamente al médico si aparece lesión nueva');
    lines.push('• Fotografiar cualquier lesión existente para seguimiento comparativo');
    setAiPlan(lines.join('\n'));
    setGenerating(false);
  };

  const updateWound = (k: string, v: string) => setWoundForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!user || !selectedResident) return;
    setSaving(true);
    const payload: any = {
      resident_id: selectedResident, assessment_date: assessDate, created_by: user.id,
      record_type: tab,
    };
    if (tab === 'braden') {
      Object.assign(payload, {
        braden_total: bradenTotal, braden_scores: bradenScores,
        risk_level: risk?.label, care_plan: aiPlan || null,
      });
    } else {
      Object.assign(payload, {
        ...woundForm,
        length_cm: parseFloat(woundForm.length_cm) || null,
        width_cm: parseFloat(woundForm.width_cm) || null,
        depth_cm: parseFloat(woundForm.depth_cm) || null,
      });
    }
    const { error } = await supabase.from('wound_care_records' as any).insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: tab === 'braden' ? 'Evaluación Braden guardada' : 'Registro de herida guardado' });
      if (tab === 'braden') { setBradenScores({}); setAiPlan(""); }
      else setWoundForm({ wound_type:'', stage:'', location:'', exudate:'', tissue_type:'', length_cm:'', width_cm:'', depth_cm:'', treatment_applied:'', next_dressing_date:'', wound_notes:'' });
      const { data } = await supabase.from('wound_care_records' as any).select('*').eq('resident_id', selectedResident).order('assessment_date', { ascending: false }).limit(10);
      if (data) setHistory(data as any[]);
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F18: Cuidado de Piel y Heridas" subtitle="Escala de Braden y seguimiento de lesiones" onBack={onBack} />

      {/* Resident + date */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
          <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={assessDate} onChange={e => setAssessDate(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
      </div>

      {selectedResident && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[{ id: 'braden', label: 'Escala Braden (Riesgo)' }, { id: 'wound', label: 'Registro de Herida' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'braden' && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BRADEN_ITEMS.map(item => (
                  <div key={item.key} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs font-bold text-foreground mb-2">{item.label}</p>
                    <div className="space-y-1">
                      {item.options.map(opt => (
                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={item.key} value={opt.val}
                            checked={bradenScores[item.key] === opt.val}
                            onChange={() => setBradenScores(p => ({ ...p, [item.key]: opt.val }))}
                            className="accent-primary" />
                          <span className={`text-xs ${bradenScores[item.key] === opt.val ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {bradenTotal >= 6 && risk && (
                <div className={`${risk.bg} border border-current/20 rounded-2xl p-5`}>
                  <div className="flex items-center gap-3 mb-3">
                    {bradenTotal <= 12 ? <AlertTriangle size={18} className={risk.color} /> : <CheckCircle2 size={18} className={risk.color} />}
                    <div>
                      <p className={`text-sm font-black ${risk.color}`}>{risk.label} — Braden: {bradenTotal}/23</p>
                      <p className="text-xs text-muted-foreground">({Object.keys(bradenScores).length} de {BRADEN_ITEMS.length} ítems completados)</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-muted-foreground uppercase">Plan de cuidados IA</p>
                    <button onClick={generateAIPlan} disabled={generating || Object.keys(bradenScores).length < BRADEN_ITEMS.length}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-40">
                      {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Generar plan
                    </button>
                  </div>
                  <textarea value={aiPlan} onChange={e => setAiPlan(e.target.value)} rows={8}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-none font-mono"
                    placeholder="Complete los 6 ítems de Braden para generar el plan de cuidados automático..." />
                </div>
              )}
            </div>
          )}

          {tab === 'wound' && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de lesión</label>
                  <select value={woundForm.wound_type} onChange={e => updateWound('wound_type', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {WOUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Estadio / Grado</label>
                  <select value={woundForm.stage} onChange={e => updateWound('stage', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {WOUND_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Localización</label>
                  <select value={woundForm.location} onChange={e => updateWound('location', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {BODY_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de tejido</label>
                  <select value={woundForm.tissue_type} onChange={e => updateWound('tissue_type', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {WOUND_TISSUE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Exudado</label>
                  <select value={woundForm.exudate} onChange={e => updateWound('exudate', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                    <option value="">--</option>
                    {WOUND_EXUDATE.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ k: 'length_cm', l: 'Largo (cm)' }, { k: 'width_cm', l: 'Ancho (cm)' }, { k: 'depth_cm', l: 'Profund. (cm)' }].map(f => (
                    <div key={f.k}>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.l}</label>
                      <input type="number" step="0.1" value={(woundForm as any)[f.k]} onChange={e => updateWound(f.k, e.target.value)}
                        className="mt-1 w-full px-2 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Tratamiento aplicado</label>
                <textarea value={woundForm.treatment_applied} onChange={e => updateWound('treatment_applied', e.target.value)} rows={2}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
                  placeholder="Limpieza con SF 0.9%, apósito hidrocoloide, etc." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Próxima cura</label>
                  <input type="date" value={woundForm.next_dressing_date} onChange={e => updateWound('next_dressing_date', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Notas clínicas</label>
                  <input type="text" value={woundForm.wound_notes} onChange={e => updateWound('wound_notes', e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                </div>
              </div>
            </div>
          )}

          <ActionButtons onFinish={handleSave} disabled={saving || (tab === 'braden' && Object.keys(bradenScores).length === 0) || (tab === 'wound' && !woundForm.wound_type)} />

          {/* History */}
          {history.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">
              <h3 className="text-sm font-black text-foreground mb-4">Historial</h3>
              <div className="space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="p-3 bg-muted/50 rounded-xl text-xs">
                    <span className="font-bold">{h.assessment_date}</span>
                    {h.record_type === 'braden' && <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded">Braden: {h.braden_total}/23 — {h.risk_level}</span>}
                    {h.record_type === 'wound' && <span className="ml-2">{h.wound_type} — {h.stage}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WoundCare;
