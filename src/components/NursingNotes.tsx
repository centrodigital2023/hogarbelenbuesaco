import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { Sparkles, Loader2, Save, Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const NursingNotes = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState("mañana");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const loadHistory = () => {
    const q = supabase.from('nursing_notes').select('*').order('created_at', { ascending: false }).limit(50);
    if (!isConsolidated && selectedResident) q.eq('resident_id', selectedResident);
    else q.eq('is_consolidated', true);
    q.then(({ data }) => { if (data) setHistory(data); });
  };

  useEffect(() => {
    if (!selectedResident && !isConsolidated) return;
    loadHistory();
  }, [selectedResident, isConsolidated]);

  const generateNote = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: { residentId: isConsolidated ? null : selectedResident, dateFrom, dateTo, shift, isConsolidated },
      });
      if (error) throw error;
      if (data?.note) setNote(data.note);
      else toast({ title: "Sin datos", description: "No se encontraron registros para generar la nota", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error generando nota", variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveNote = async () => {
    if (!user || !note.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('nursing_notes').insert({
      resident_id: isConsolidated ? null : selectedResident || null,
      note_date: dateFrom,
      note,
      shift,
      generated_by: user.id,
      is_ai_generated: true,
      is_consolidated: isConsolidated,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Nota guardada" });
      loadHistory();
    }
    setSaving(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const loadHistoryNote = (h: any) => {
    setNote(h.note);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Notas de Enfermería con IA" subtitle="Generación automática de notas profesionales" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={isConsolidated} onChange={e => setIsConsolidated(e.target.checked)} className="w-4 h-4 accent-primary" />
            Nota consolidada (todos los residentes)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!isConsolidated && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
              <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
            <select value={shift} onChange={e => setShift(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
            </select>
          </div>
        </div>

        <button onClick={generateNote}
          disabled={generating || (!isConsolidated && !selectedResident)}
          className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generando...' : 'Generar nota con IA'}
        </button>
      </div>

      {note && (
        <div ref={contentRef} className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-black text-foreground mb-3">Nota generada</h3>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={12}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none font-mono" />
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={saveNote} disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
            <ExportButtons contentRef={contentRef} title="Nota de Enfermería" fileName="nota_enfermeria" textContent={note} />
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-black text-foreground mb-4">Historial de notas ({history.length})</h3>
          <div className="space-y-3">
            {history.map(h => {
              const isExpanded = expandedId === h.id;
              return (
                <div key={h.id} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(h.id)}
                    className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <Calendar size={12} /> <span className="font-bold text-foreground">{h.note_date}</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{h.shift}</span>
                      {h.is_ai_generated && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-md font-bold">IA</span>}
                      {h.is_consolidated && <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-bold">Consolidada</span>}
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>

                  {!isExpanded && (
                    <div className="px-4 py-2 text-sm text-muted-foreground line-clamp-2">{h.note}</div>
                  )}

                  {isExpanded && (
                    <div ref={historyRef} className="p-4 border-t border-border">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed mb-4">{h.note}</div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <button onClick={() => loadHistoryNote(h)}
                          className="text-xs text-primary font-bold hover:underline">
                          Cargar en editor
                        </button>
                        <ExportButtons
                          contentRef={historyRef}
                          title="Nota de Enfermería"
                          fileName={`nota_enfermeria_${h.note_date}`}
                          textContent={h.note}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NursingNotes;
