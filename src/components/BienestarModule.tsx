import { useState } from "react";
import { Heart, ClipboardList, Brain, Star, Calendar, Sparkles } from "lucide-react";
import FormHeader from "@/components/FormHeader";
import DailyLog from "@/components/forms/DailyLog";
import TherapyRecords from "@/components/forms/TherapyRecords";
import TherapySessionForm from "@/components/forms/TherapySessionForm";
import PsychosocialRecord from "@/components/forms/PsychosocialRecord";
import SpiritualRecord from "@/components/forms/SpiritualRecord";

type FormId = 'HB-F4' | 'HB-F9' | 'THERAPY-SESSION' | 'HB-F10' | 'HB-F11';

interface BienestarModuleProps {
  onBack: () => void;
}

const FORMS: { id: FormId; title: string; subtitle: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'HB-F4', title: 'HB-F4: Bitácora Diaria', subtitle: 'Nutrición, hidratación, estado', icon: ClipboardList },
  { id: 'HB-F9', title: 'HB-F9: Terapias', subtitle: 'Registro semanal de terapias', icon: Heart },
  { id: 'THERAPY-SESSION', title: 'Sesión de Terapia', subtitle: 'Actividad con asistentes', icon: Calendar },
  { id: 'HB-F10', title: 'HB-F10: Atención Psicosocial', subtitle: 'Sesiones individuales y grupales', icon: Brain },
  { id: 'HB-F11', title: 'HB-F11: Acomp. Espiritual', subtitle: 'Actividades espirituales', icon: Star },
];

const BienestarModule = ({ onBack }: BienestarModuleProps) => {
  const [form, setForm] = useState<FormId | null>(null);

  if (form === 'HB-F4')         return <DailyLog onBack={() => setForm(null)} />;
  if (form === 'HB-F9')         return <TherapyRecords onBack={() => setForm(null)} />;
  if (form === 'THERAPY-SESSION') return <TherapySessionForm onBack={() => setForm(null)} />;
  if (form === 'HB-F10')        return <PsychosocialRecord onBack={() => setForm(null)} />;
  if (form === 'HB-F11')        return <SpiritualRecord onBack={() => setForm(null)} />;

  return (
    <div className="animate-fade-in">
      <FormHeader
        title="4. Bienestar"
        subtitle="Terapias y actividades"
        onBack={onBack}
      />

      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-primary" />
        <p className="text-sm text-muted-foreground">Selecciona el formulario que deseas registrar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FORMS.map(({ id, title, subtitle, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setForm(id)}
            className="bg-card border-2 border-border rounded-2xl p-5 text-left hover:border-primary transition-all group min-h-[48px]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
              <Icon size={20} />
            </div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BienestarModule;
