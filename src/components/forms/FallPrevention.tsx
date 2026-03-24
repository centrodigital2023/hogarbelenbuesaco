import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

interface Props { onBack: () => void; }

// Morse Fall Scale items
const MORSE_ITEMS = [
  {
    key: 'fall_history', label: '¿Ha caído en los últimos 3 meses?',
    options: [{ val: 0, text: 'No' }, { val: 25, text: 'Sí' }],
  },
  {
    key: 'secondary_diagnosis', label: '¿Tiene diagnóstico secundario?',
    options: [{ val: 0, text: 'No' }, { val: 15, text: 'Sí' }],
  },
  {
    key: 'ambulatory_aid', label: 'Ayuda para la deambulación',
    options: [
      { val: 0, text: 'Ninguna / Reposo / Silla de ruedas / Cuidador' },
      { val: 15, text: 'Muletas / Bastón / Andador' },
      { val: 30, text: 'Se apoya en muebles o paredes' },
    ],
  },
  {
    key: 'iv_therapy', label: '¿Tiene suero o medicación intravenosa?',
    options: [{ val: 0, text: 'No' }, { val: 20, text: 'Sí' }],
  },
  {
    key: 'gait', label: 'Marcha',
    options: [
      { val: 0, text: 'Normal / Reposo en cama / Inmovilizado' },
      { val: 10, text: 'Débil' },
      { val: 20, text: 'Deteriorada / Irregular' },
    ],
  },
  {
    key: 'mental_status', label: 'Estado mental',
    options: [
      { val: 0, text: 'Orientado en sus propias capacidades' },
      { val: 15, text: 'Sobreestima sus capacidades o olvida sus limitaciones' },
    ],
  },
];

// Environment checklist (proactive assessment)
const ENV_CHECKS = [
  { key: 'env_lighting', label: 'Iluminación adecuada en habitación y pasillos (incluye noche)' },
  { key: 'env_floor', label: 'Pisos limpios, secos y sin tapetes sueltos' },
  { key: 'env_bed_height', label: 'Cama en posición baja, con frenos y barandas' },
  { key: 'env_call_bell', label: 'Llamado a enfermería accesible desde la cama' },
  { key: 'env_bathroom', label: 'Baño con barras de apoyo y alfombra antideslizante' },
  { key: 'env_footwear', label: 'Calzado cerrado y antideslizante' },
  { key: 'env_glasses', label: 'Lentes o audífonos accesibles si los usa' },
  { key: 'env_clutter', label: 'Vía libre de obstáculos hacia el baño' },
];

const morseRisk = (score: number) => {
  if (score >= 45) return {
    label: 'RIESGO ALTO', color: 'text-destructive', bg: 'bg-destructive/10',
    interventions: [
      'Poner protocolo de caídas activo: pulsera/placa identificadora de riesgo',
      'Acompañamiento en deambulación y transferencias en todos los turnos',
      'Revisar y ajustar medicación (sedantes, hipotensores, diuréticos) con médico',
      'Instalar barandas en ambos lados de la cama',
      'Instalar sensor de cama o alertas de movimiento nocturno',
      'Programa de fisioterapia para fortalecer equilibrio y marcha 3x/semana',
      'Informar a la familia sobre el riesgo y las medidas adoptadas',
      'Revisar entorno ambiental: iluminación, barandas, tapetes, calzado',
    ],
  };
  if (score >= 25) return {
    label: 'RIESGO MODERADO', color: 'text-cat-fragility', bg: 'bg-cat-fragility/10',
    interventions: [
      'Implementar medidas de precaución estándar para caídas',
      'Supervisar deambulación en momentos de mayor riesgo (madrugada, post-comidas)',
      'Fisioterapia preventiva para equilibrio 2x/semana',
      'Revisar calzado y entorno ambiental',
      'Informar al residente y familia sobre precauciones',
    ],
  };
  return {
    label: 'RIESGO BAJO', color: 'text-cat-nutritional', bg: 'bg-cat-nutritional/10',
    interventions: [
      'Mantener medidas generales de prevención',
      'Educación al residente sobre solicitar ayuda para levantarse',
      'Revisión semestral del riesgo',
    ],
  };
};

const FallPrevention = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [assessDate, setAssessDate] = useState(new Date().toISOString().split('T')[0]);
  const [morseScores, setMorseScores] = useState<Record<string, number>>({});
  const [envChecks, setEnvChecks] = useState<Record<string, boolean>>({});
  const [aiPlan, setAiPlan] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('fall_prevention_records' as any).select('*')
      .eq('resident_id', selectedResident).order('assessment_date', { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setHistory(data as any[]); });
  }, [selectedResident]);

  const morseTotal = Object.values(morseScores).reduce((a, b) => a + b, 0);
  const risk = Object.keys(morseScores).length >= 6 ? morseRisk(morseTotal) : null;

  const generateAI = () => {
    if (!risk) return;
    setGenerating(true);
    const resident = residents.find(r => r.id === selectedResident);
    const envIssues = ENV_CHECKS.filter(c => !envChecks[c.key]).map(c => c.label);
    const lines = [
      `EVALUACIÓN ESCALA DE MORSE — ${assessDate}`,
      `Residente: ${resident?.full_name || '—'} | Puntaje: ${morseTotal}/125`,
      `Clasificación: ${risk.label}`,
      '',
      'PLAN DE PREVENCIÓN DE CAÍDAS:',
    ];
    risk.interventions.forEach((int, i) => lines.push(`${i + 1}. ${int}`));

    if (envIssues.length > 0) {
      lines.push('', '⚠️ PROBLEMAS AMBIENTALES DETECTADOS (No conformes):');
      envIssues.forEach(e => lines.push(`   • ${e}`));
      lines.push('   → Corregir estas condiciones antes del siguiente turno.');
    }

    lines.push('', 'VIGENCIA: Reevaluar en 30 días o ante cualquier cambio clínico, nueva medicación o caída.');
    setAiPlan(lines.join('\n'));
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!user || !selectedResident || Object.keys(morseScores).length < MORSE_ITEMS.length) return;
    setSaving(true);
    const { error } = await supabase.from('fall_prevention_records' as any).insert({
      resident_id: selectedResident, assessment_date: assessDate, created_by: user.id,
      morse_total: morseTotal, morse_scores: morseScores, risk_level: risk?.label,
      env_checks: envChecks, prevention_plan: aiPlan || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Evaluación guardada" });
      setMorseScores({}); setEnvChecks({}); setAiPlan("");
      const { data } = await supabase.from('fall_prevention_records' as any).select('*')
        .eq('resident_id', selectedResident).order('assessment_date', { ascending: false }).limit(5);
      if (data) setHistory(data as any[]);
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F21: Prevención de Caídas" subtitle="Escala de Morse + evaluación ambiental" onBack={onBack} />

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
          {/* Morse Scale */}
          <h3 className="text-sm font-black text-foreground mb-3">Escala de Morse (Ítems)</h3>
          <div className="space-y-3 mb-6">
            {MORSE_ITEMS.map(item => (
              <div key={item.key} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-foreground mb-2">{item.label}</p>
                <div className="flex flex-wrap gap-2">
                  {item.options.map(opt => (
                    <label key={opt.val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-xs transition-all ${morseScores[item.key] === opt.val ? 'border-primary bg-primary/5 font-bold' : 'border-border text-muted-foreground'}`}>
                      <input type="radio" name={item.key} value={opt.val}
                        checked={morseScores[item.key] === opt.val}
                        onChange={() => setMorseScores(p => ({ ...p, [item.key]: opt.val }))}
                        className="hidden" />
                      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-current">
                        {morseScores[item.key] === opt.val && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                      <span>{opt.text} <span className="font-black">({opt.val} pts)</span></span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Risk result */}
          {risk && (
            <div className={`${risk.bg} border border-current/20 rounded-2xl p-5 mb-6`}>
              <div className="flex items-center gap-3 mb-3">
                {morseTotal >= 45 ? <AlertTriangle size={18} className={risk.color} /> : <ShieldCheck size={18} className={risk.color} />}
                <p className={`text-sm font-black ${risk.color}`}>{risk.label} — Morse: {morseTotal} pts</p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-muted-foreground uppercase">Plan de prevención con IA</p>
                <button onClick={generateAI} disabled={generating}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-40">
                  {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Generar
                </button>
              </div>
              <textarea value={aiPlan} onChange={e => setAiPlan(e.target.value)} rows={8}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-none font-mono"
                placeholder="Haga clic en 'Generar' para crear el plan de prevención personalizado..." />
            </div>
          )}

          {/* Environment checklist */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-black text-foreground mb-4">Evaluación del Entorno</h3>
            <div className="space-y-2">
              {ENV_CHECKS.map(c => (
                <label key={c.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${envChecks[c.key] ? 'border-cat-nutritional/30 bg-cat-nutritional/5' : 'border-border'}`}>
                  <input type="checkbox" checked={envChecks[c.key] || false}
                    onChange={e => setEnvChecks(p => ({ ...p, [c.key]: e.target.checked }))}
                    className="w-5 h-5 accent-primary" />
                  <span className="text-sm">{c.label}</span>
                  {envChecks[c.key] ? <ShieldCheck size={14} className="text-cat-nutritional ml-auto" /> : <AlertTriangle size={14} className="text-muted-foreground/40 ml-auto" />}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Object.values(envChecks).filter(Boolean).length}/{ENV_CHECKS.length} condiciones conformes
            </p>
          </div>

          <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(morseScores).length < MORSE_ITEMS.length} />

          {/* History */}
          {history.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">
              <h3 className="text-sm font-black mb-4">Historial de evaluaciones</h3>
              <div className="space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="p-3 bg-muted/50 rounded-xl flex items-center gap-3 text-xs">
                    <span className="font-bold">{h.assessment_date}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${h.risk_level?.includes('ALTO') ? 'bg-destructive/10 text-destructive' : h.risk_level?.includes('MODERADO') ? 'bg-cat-fragility/10 text-cat-fragility' : 'bg-cat-nutritional/10 text-cat-nutritional'}`}>
                      {h.risk_level}
                    </span>
                    <span>Morse: {h.morse_total} pts</span>
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

export default FallPrevention;
