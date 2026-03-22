import { useState, useMemo, useEffect } from "react";
import {
  Activity, Brain, Heart, Utensils, AlertTriangle,
  Users, ShieldCheck, Briefcase, ChevronRight, User, History, Save
} from "lucide-react";
import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "./FormHeader";
import SignaturePad from "./SignaturePad";

const iconMap: Record<string, React.ReactNode> = {
  Activity: <Activity size={20} />,
  Brain: <Brain size={20} />,
  Heart: <Heart size={20} />,
  Utensils: <Utensils size={20} />,
  AlertTriangle: <AlertTriangle size={20} />,
  Users: <Users size={20} />,
  ShieldCheck: <ShieldCheck size={20} />,
  Briefcase: <Briefcase size={20} />,
};

const colorMap: Record<string, string> = {
  'cat-functional': 'text-cat-functional bg-cat-functional/10',
  'cat-cognitive': 'text-cat-cognitive bg-cat-cognitive/10',
  'cat-nutritional': 'text-cat-nutritional bg-cat-nutritional/10',
  'cat-mood': 'text-cat-mood bg-cat-mood/10',
  'cat-mobility': 'text-cat-mobility bg-cat-mobility/10',
  'cat-fragility': 'text-cat-fragility bg-cat-fragility/10',
  'cat-social': 'text-cat-social bg-cat-social/10',
  'cat-skin': 'text-cat-skin bg-cat-skin/10',
};

interface Resident {
  id: string;
  full_name: string;
  document_id: string | null;
  status: string;
}

interface AssessmentHistory {
  id: string;
  test_key: string;
  test_name: string;
  score: number;
  max_score: number;
  interpretation: string | null;
  assessment_date: string;
  created_at: string;
}

interface ValoracionGeriatricaProps {
  onBack: () => void;
}

const ValoracionGeriatrica = ({ onBack }: ValoracionGeriatricaProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'select-resident' | 'menu' | 'assessment' | 'summary'>('select-resident');
  const [testKey, setTestKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [sigEval, setSigEval] = useState<string | null>(null);
  const [sigSuper, setSigSuper] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resident selection
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [residentSearch, setResidentSearch] = useState("");
  const [loadingResidents, setLoadingResidents] = useState(true);

  // History
  const [history, setHistory] = useState<AssessmentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const activeTest = useMemo(() => testKey ? TESTS_GERIATRICOS[testKey] : null, [testKey]);

  useEffect(() => {
    const fetchResidents = async () => {
      setLoadingResidents(true);
      const { data } = await supabase.from('residents')
        .select('id, full_name, document_id, status')
        .in('status', ['prueba', 'permanente'])
        .order('full_name');
      if (data) setResidents(data);
      setLoadingResidents(false);
    };
    fetchResidents();
  }, []);

  const fetchHistory = async (residentId: string) => {
    const { data } = await supabase.from('geriatric_assessments')
      .select('id, test_key, test_name, score, max_score, interpretation, assessment_date, created_at')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setHistory(data);
  };

  const handleSelectResident = (r: Resident) => {
    setSelectedResident(r);
    fetchHistory(r.id);
    setStep('menu');
  };

  const handleAnswer = (qId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const getScore = () => Object.values(answers).reduce((a, b) => a + b, 0);

  const getInterpretation = (score: number) => {
    if (testKey === 'barthel') {
      if (score === 100) return "Independiente";
      if (score >= 60) return "Dependencia Leve";
      if (score >= 40) return "Dependencia Moderada";
      if (score >= 20) return "Dependencia Severa";
      return "Dependencia Total";
    }
    if (testKey === 'lawton') {
      if (score === 8) return "Independencia total";
      if (score >= 6) return "Dependencia leve";
      if (score >= 4) return "Dependencia moderada";
      return "Dependencia severa";
    }
    if (testKey === 'pfeiffer') {
      if (score <= 2) return "Normal";
      if (score <= 4) return "Deterioro cognitivo leve";
      if (score <= 7) return "Deterioro cognitivo moderado";
      return "Deterioro cognitivo severo";
    }
    if (testKey === 'yesavage') {
      if (score <= 5) return "Normal – sin depresión";
      if (score <= 9) return "Depresión leve";
      return "Depresión severa";
    }
    if (testKey === 'tinetti') {
      if (score >= 25) return "Bajo riesgo de caídas";
      if (score >= 19) return "Riesgo moderado de caídas";
      return "Alto riesgo de caídas";
    }
    if (testKey === 'mna') {
      if (score >= 24) return "Estado nutricional normal";
      if (score >= 17) return "Riesgo de malnutrición";
      return "Malnutrición";
    }
    if (testKey === 'fried') {
      if (score === 0) return "Robusto – sin fragilidad";
      if (score <= 2) return "Pre-frágil";
      return "Frágil";
    }
    if (testKey === 'gijon') {
      if (score < 10) return "Buena situación social";
      if (score <= 14) return "Riesgo social";
      return "Problema social severo";
    }
    if (testKey === 'braden') {
      if (score >= 17) return "Sin riesgo de UPP";
      if (score >= 15) return "Riesgo bajo de UPP";
      if (score >= 13) return "Riesgo moderado de UPP";
      return "Alto riesgo de UPP";
    }
    if (testKey === 'mmse') {
      if (score >= 27) return "Normal";
      if (score >= 24) return "Sospecha patológica";
      if (score >= 12) return "Deterioro cognitivo";
      return "Demencia";
    }
    if (testKey === 'charlson') {
      if (score === 0) return "Sin comorbilidad";
      if (score <= 2) return "Comorbilidad baja";
      if (score <= 4) return "Comorbilidad alta";
      return "Comorbilidad muy alta";
    }
    if (testKey === 'zarit') {
      if (score < 21) return "No sobrecarga";
      if (score <= 40) return "Sobrecarga leve";
      if (score <= 60) return "Sobrecarga moderada";
      return "Sobrecarga severa";
    }
    return "Pendiente de interpretación clínica";
  };

  const handleSave = async () => {
    if (!selectedResident || !activeTest || !testKey || !user) return;
    setSaving(true);
    const score = getScore();
    const interpretation = getInterpretation(score);

    const { error } = await supabase.from('geriatric_assessments').insert({
      resident_id: selectedResident.id,
      created_by: user.id,
      test_key: testKey,
      test_name: activeTest.name,
      score,
      max_score: activeTest.max,
      interpretation,
      answers: answers as any,
      signature_evaluator: sigEval,
      signature_supervisor: sigSuper,
    });

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Valoración guardada", description: `${activeTest.name} - ${selectedResident.full_name}` });
      fetchHistory(selectedResident.id);
    }
    setSaving(false);
  };

  const filteredResidents = residents.filter(r =>
    r.full_name.toLowerCase().includes(residentSearch.toLowerCase()) ||
    (r.document_id || '').toLowerCase().includes(residentSearch.toLowerCase())
  );

  // Step: Select Resident
  if (step === 'select-resident') {
    return (
      <div className="animate-fade-in">
        <FormHeader title="2. Valoración Geriátrica" subtitle="Seleccione un residente para valorar" onBack={onBack} />
        <div className="relative max-w-md mb-6">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="Buscar residente por nombre o documento..."
            value={residentSearch} onChange={e => setResidentSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm"
          />
        </div>
        {loadingResidents ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredResidents.map(r => (
              <button key={r.id} onClick={() => handleSelectResident(r)}
                className="bg-card border-2 border-border rounded-2xl p-5 text-left hover:border-primary transition-all group min-h-[48px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{r.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.document_id || 'Sin documento'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  VALORAR <ChevronRight size={14} />
                </div>
              </button>
            ))}
            {filteredResidents.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">No se encontraron residentes activos.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Step: Summary
  if (step === 'summary' && activeTest) {
    const score = getScore();
    return (
      <div className="animate-fade-in">
        <FormHeader
          title={`Resultado: ${activeTest.name}`}
          subtitle={`Residente: ${selectedResident?.full_name}`}
          onBack={() => setStep('menu')}
        />
        <div className="bg-card rounded-4xl p-8 shadow-sm border border-border text-center max-w-md mx-auto">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Puntaje Final</p>
          <div className="text-6xl font-black text-primary mb-1">
            {score}
            <span className="text-2xl text-muted-foreground font-medium">/ {activeTest.max}</span>
          </div>
          <div className="mt-6 bg-muted rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Interpretación</p>
            <p className="text-lg font-black text-foreground">{getInterpretation(score)}</p>
          </div>
        </div>

        <div className="flex justify-center gap-8 mt-8">
          <SignaturePad label="Evaluador" onSave={setSigEval} />
          <SignaturePad label="Supervisor" onSave={setSigSuper} />
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 min-h-[48px]"
          >
            <Save size={16} />
            {saving ? "Guardando..." : "Guardar Valoración"}
          </button>
          <button
            onClick={() => setStep('menu')}
            className="bg-secondary text-secondary-foreground px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors min-h-[48px]"
          >
            Volver a Escalas
          </button>
        </div>
      </div>
    );
  }

  // Step: Assessment
  if (step === 'assessment' && activeTest) {
    const isComplete = Object.keys(answers).length === activeTest.questions.length;
    return (
      <div className="animate-fade-in">
        <FormHeader
          title={activeTest.name}
          subtitle={`${selectedResident?.full_name} — ${activeTest.cat}`}
          onBack={() => setStep('menu')}
        />
        {activeTest.instructions && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-xs text-foreground leading-relaxed">
            <p className="font-bold text-primary mb-1 uppercase tracking-widest text-[10px]">Instrucciones</p>
            {activeTest.instructions}
          </div>
        )}
        <div className="space-y-4 max-w-2xl">
          {activeTest.questions.map((q, idx) => (
            <div key={q.id} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-foreground">{q.text}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.opts.map(opt => {
                  const isSelected = answers[q.id] !== undefined && answers[q.id] === opt.v;
                  return (
                    <button
                      key={`${opt.l}-${opt.v}`}
                      onClick={() => handleAnswer(q.id, opt.v)}
                      className={`p-3 rounded-xl text-xs font-bold text-left transition-all min-h-[48px] ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-muted text-muted-foreground hover:bg-accent border border-transparent'
                      }`}
                    >
                      {opt.l}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setStep('summary')}
            disabled={!isComplete}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 min-h-[48px]"
          >
            Ver Resultado
          </button>
        </div>
      </div>
    );
  }

  // Step: Menu (test selection) with history
  return (
    <div className="animate-fade-in">
      <FormHeader
        title="2. Valoración Geriátrica"
        subtitle={`Residente: ${selectedResident?.full_name}`}
        onBack={() => { setSelectedResident(null); setStep('select-resident'); }}
      />

      {/* Resident info bar */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{selectedResident?.full_name}</p>
            <p className="text-[10px] text-muted-foreground">{selectedResident?.document_id || 'Sin documento'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 bg-muted text-muted-foreground px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-accent min-h-[36px]"
          >
            <History size={14} />
            Historial ({history.length})
          </button>
          <button
            onClick={() => { setSelectedResident(null); setStep('select-resident'); }}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-primary hover:text-primary-foreground transition-colors min-h-[36px]"
          >
            Cambiar Residente
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-black text-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-primary" /> Historial de Valoraciones
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-foreground">{h.test_name}</p>
                  <p className="text-[10px] text-muted-foreground">{h.assessment_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">{h.score}/{h.max_score}</p>
                  <p className="text-[10px] text-muted-foreground">{h.interpretation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showHistory && history.length === 0 && (
        <div className="bg-muted rounded-2xl p-6 mb-6 text-center">
          <p className="text-xs text-muted-foreground">No hay valoraciones previas para este residente.</p>
        </div>
      )}

      {/* Test grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.keys(TESTS_GERIATRICOS).map(key => {
          const test = TESTS_GERIATRICOS[key];
          const classes = colorMap[test.colorClass] || 'text-muted-foreground bg-muted';
          const [textClass, bgClass] = classes.split(' ');
          const lastResult = history.find(h => h.test_key === key);
          return (
            <button
              key={key}
              onClick={() => { setTestKey(key); setAnswers({}); setSigEval(null); setSigSuper(null); setStep('assessment'); }}
              className="bg-card p-5 rounded-4xl border-2 border-border hover:border-primary transition-all text-left shadow-sm group active:scale-[0.97] min-h-[48px]"
            >
              <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center mb-3 ${textClass}`}>
                {iconMap[test.iconName] || <Activity size={20} />}
              </div>
              <p className="text-sm font-bold text-foreground">{test.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{test.cat}</p>
              {lastResult && (
                <p className="text-[10px] text-primary font-bold mt-1">
                  Último: {lastResult.score}/{lastResult.max_score} ({lastResult.assessment_date})
                </p>
              )}
              <div className="flex items-center gap-1 mt-3 text-xs font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                INICIAR <ChevronRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ValoracionGeriatrica;
