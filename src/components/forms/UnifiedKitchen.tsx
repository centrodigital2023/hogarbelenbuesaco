import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const CHECKLIST_ITEMS = [
  { key: 'used_ppe', label: 'Usé gorro, tapabocas y delantal limpio' },
  { key: 'respected_diets', label: 'Respeté las dietas especiales de cada residente' },
  { key: 'washed_produce', label: 'Lavé y desinfecté frutas y verduras' },
  { key: 'cleaned_kitchen', label: 'Limpié y desinfecté toda la cocina al terminar' },
];

const FRIDGES = ['Nevera principal', 'Nevera medicamentos', 'Congelador'];
const DISINFECTION_AREAS = ['Mesones', 'Estufa', 'Lavaplatos', 'Pisos', 'Paredes', 'Campana extractora', 'Utensilios'];

const UnifiedKitchen = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'checklist' | 'temperature' | 'disinfection'>('checklist');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('mañana');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [checkObs, setCheckObs] = useState("");
  const [temps, setTemps] = useState<Record<string, { temp: string; safe: boolean; notes: string }>>(
    Object.fromEntries(FRIDGES.map(f => [f, { temp: '', safe: true, notes: '' }]))
  );
  const [disinfection, setDisinfection] = useState<Record<string, boolean>>(
    Object.fromEntries(DISINFECTION_AREAS.map(a => [a, false]))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const promises = [];

    // Save checklist (HB-F5)
    promises.push(supabase.from('kitchen_checklists').insert({
      created_by: user.id, check_date: checkDate,
      used_ppe: checks.used_ppe || false, respected_diets: checks.respected_diets || false,
      washed_produce: checks.washed_produce || false, cleaned_kitchen: checks.cleaned_kitchen || false,
      observations: checkObs,
    }));

    // Save temps (HB-F7)
    for (const [name, data] of Object.entries(temps)) {
      if (data.temp) {
        const t = parseFloat(data.temp);
        promises.push(supabase.from('fridge_temps').insert({
          created_by: user.id, record_date: checkDate, fridge_name: name,
          shift, temperature: t, is_safe: t >= 0 && t <= 5, notes: data.notes,
        }));
      }
    }

    // Save disinfection (HB-F8)
    for (const [area, completed] of Object.entries(disinfection)) {
      promises.push(supabase.from('disinfection_records').insert({
        created_by: user.id, record_date: checkDate, area,
        completed, record_type: 'cocina',
      }));
    }

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    if (hasError) toast({ title: "Error al guardar algunos registros", variant: "destructive" });
    else { toast({ title: "Control diario de cocina guardado ✅" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="Control Diario de Cocina" subtitle="HB-F5 + HB-F7 + HB-F8 unificados" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-3 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
          <select value={shift} onChange={e => setShift(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
            <option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option>
          </select></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{k:'checklist',l:'✅ Checklist'},{k:'temperature',l:'🌡️ Temperaturas'},{k:'disinfection',l:'🧹 Desinfección'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'checklist' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          {CHECKLIST_ITEMS.map(item => (
            <label key={item.key} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checks[item.key] ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <input type="checkbox" checked={checks[item.key] || false}
                onChange={e => setChecks(p => ({...p, [item.key]: e.target.checked}))} className="w-5 h-5 rounded accent-primary" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </label>
          ))}
          <textarea value={checkObs} onChange={e => setCheckObs(e.target.value)} placeholder="Observaciones del checklist..." rows={2}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
        </div>
      )}

      {tab === 'temperature' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {FRIDGES.map(fridge => {
            const data = temps[fridge];
            const t = parseFloat(data?.temp || '');
            const unsafe = !isNaN(t) && (t < 0 || t > 5);
            return (
              <div key={fridge} className={`p-4 rounded-xl border-2 ${unsafe ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                <p className="text-sm font-bold text-foreground mb-2">{fridge}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-xs text-muted-foreground">Temperatura (°C)</label>
                    <input type="number" step="0.1" value={data?.temp || ''} onChange={e => setTemps(p => ({...p, [fridge]: {...p[fridge], temp: e.target.value}}))}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
                  <div className="col-span-2"><label className="text-xs text-muted-foreground">Notas</label>
                    <input value={data?.notes || ''} onChange={e => setTemps(p => ({...p, [fridge]: {...p[fridge], notes: e.target.value}}))}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
                </div>
                {unsafe && <p className="text-xs font-bold text-destructive mt-2">⚠️ Temperatura fuera de rango seguro (0-5°C)</p>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'disinfection' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          {DISINFECTION_AREAS.map(area => (
            <label key={area} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${disinfection[area] ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <input type="checkbox" checked={disinfection[area] || false}
                onChange={e => setDisinfection(p => ({...p, [area]: e.target.checked}))} className="w-5 h-5 rounded accent-primary" />
              <span className="text-sm font-medium text-foreground">{area}</span>
            </label>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6"><SignaturePad label="Responsable Cocina" /></div>
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default UnifiedKitchen;
