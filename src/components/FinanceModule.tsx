import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Props { onBack: () => void; }

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const FinanceModule = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'transactions' | 'invoices' | 'vouchers'>('dashboard');
  const [newTx, setNewTx] = useState({ description: '', income_amount: '', expense_amount: '', payment_method: 'transferencia', client_supplier: '', cost_center: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [txRes, invRes, vcRes] = await Promise.all([
      supabase.from('financial_transactions').select('*').order('transaction_date', { ascending: false }).limit(100),
      supabase.from('invoices').select('*, residents(full_name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('payment_vouchers' as any).select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (txRes.data) setTransactions(txRes.data);
    if (invRes.data) setInvoices(invRes.data);
    if (vcRes.data) setVouchers(vcRes.data as any[]);
  };

  useEffect(() => { fetchData(); }, []);

  const totalIncome = transactions.reduce((s, t) => s + (t.income_amount || 0), 0);
  const totalExpense = transactions.reduce((s, t) => s + (t.expense_amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const pendingInvoices = invoices.filter(i => i.status === 'pendiente');
  const totalPending = pendingInvoices.reduce((s, i) => s + (i.total || 0), 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth(); const y = d.getFullYear();
    const monthTx = transactions.filter(t => { const td = new Date(t.transaction_date); return td.getMonth() === m && td.getFullYear() === y; });
    return {
      name: d.toLocaleDateString('es', { month: 'short' }),
      ingresos: monthTx.reduce((s, t) => s + (t.income_amount || 0), 0),
      gastos: monthTx.reduce((s, t) => s + (t.expense_amount || 0), 0),
    };
  });

  const addTransaction = async () => {
    if (!user || !newTx.description) return;
    setSaving(true);
    const { error } = await supabase.from('financial_transactions').insert({
      ...newTx, income_amount: parseFloat(newTx.income_amount) || 0,
      expense_amount: parseFloat(newTx.expense_amount) || 0, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Transacción registrada" }); setNewTx({ description: '', income_amount: '', expense_amount: '', payment_method: 'transferencia', client_supplier: '', cost_center: '' }); fetchData(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="💰 Módulo Financiero" subtitle="Ingresos, gastos y control financiero" onBack={onBack} />

      <div className="flex gap-2 flex-wrap">
        {[{k:'dashboard',l:'📊 Dashboard'},{k:'transactions',l:'📋 Transacciones'},{k:'invoices',l:'🧾 Facturas'},{k:'vouchers',l:'💳 Comprobantes'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Saldo', value: balance, icon: DollarSign, color: balance >= 0 ? 'text-primary' : 'text-destructive' },
              { label: 'Ingresos', value: totalIncome, icon: TrendingUp, color: 'text-primary' },
              { label: 'Gastos', value: totalExpense, icon: TrendingDown, color: 'text-destructive' },
              { label: 'Por Cobrar', value: totalPending, icon: CreditCard, color: 'text-muted-foreground' },
            ].map(card => (
              <div key={card.label} className="bg-card border border-border rounded-2xl p-5">
                <card.icon size={20} className={card.color} />
                <p className="text-xs text-muted-foreground mt-2">{card.label}</p>
                <p className={`text-lg font-black ${card.color}`}>${card.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-black text-foreground mb-4">Ingresos vs Gastos (6 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="gastos" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === 'transactions' && (
        <>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-black text-foreground mb-4">Nueva Transacción</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Descripción" value={newTx.description} onChange={e => setNewTx(p => ({...p, description: e.target.value}))} className="px-3 py-2 rounded-xl border border-input bg-background text-sm" />
              <input placeholder="Ingreso $" type="number" value={newTx.income_amount} onChange={e => setNewTx(p => ({...p, income_amount: e.target.value}))} className="px-3 py-2 rounded-xl border border-input bg-background text-sm" />
              <input placeholder="Egreso $" type="number" value={newTx.expense_amount} onChange={e => setNewTx(p => ({...p, expense_amount: e.target.value}))} className="px-3 py-2 rounded-xl border border-input bg-background text-sm" />
              <input placeholder="Cliente/Proveedor" value={newTx.client_supplier} onChange={e => setNewTx(p => ({...p, client_supplier: e.target.value}))} className="px-3 py-2 rounded-xl border border-input bg-background text-sm" />
              <input placeholder="Centro de costo" value={newTx.cost_center} onChange={e => setNewTx(p => ({...p, cost_center: e.target.value}))} className="px-3 py-2 rounded-xl border border-input bg-background text-sm" />
              <select value={newTx.payment_method} onChange={e => setNewTx(p => ({...p, payment_method: e.target.value}))} className="px-3 py-2 rounded-xl border border-input bg-background text-sm">
                <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option>
              </select>
            </div>
            <button onClick={addTransaction} disabled={saving || !newTx.description}
              className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40">
              Registrar
            </button>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-bold text-muted-foreground">Fecha</th>
                <th className="text-left p-3 font-bold text-muted-foreground">Descripción</th>
                <th className="text-right p-3 font-bold text-primary">Ingreso</th>
                <th className="text-right p-3 font-bold text-destructive">Gasto</th>
                <th className="text-left p-3 font-bold text-muted-foreground">Método</th>
              </tr></thead>
              <tbody>{transactions.slice(0, 50).map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">{new Date(t.transaction_date).toLocaleDateString()}</td>
                  <td className="p-3 font-medium text-foreground">{t.description}</td>
                  <td className="p-3 text-right text-primary font-bold">{t.income_amount ? `$${t.income_amount.toLocaleString()}` : ''}</td>
                  <td className="p-3 text-right text-destructive font-bold">{t.expense_amount ? `$${t.expense_amount.toLocaleString()}` : ''}</td>
                  <td className="p-3 capitalize">{t.payment_method}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-bold text-muted-foreground">N°</th>
              <th className="text-left p-3 font-bold text-muted-foreground">Residente</th>
              <th className="text-left p-3 font-bold text-muted-foreground">Período</th>
              <th className="text-right p-3 font-bold text-muted-foreground">Total</th>
              <th className="text-left p-3 font-bold text-muted-foreground">Estado</th>
            </tr></thead>
            <tbody>{invoices.map(inv => (
              <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-mono">{inv.invoice_number}</td>
                <td className="p-3">{(inv.residents as any)?.full_name || '-'}</td>
                <td className="p-3">{inv.period}</td>
                <td className="p-3 text-right font-bold">${(inv.total || 0).toLocaleString()}</td>
                <td className="p-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${inv.status === 'pagada' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{inv.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay facturas</p>}
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-bold text-muted-foreground">N°</th>
              <th className="text-left p-3 font-bold text-muted-foreground">Prestador</th>
              <th className="text-left p-3 font-bold text-muted-foreground">Fecha</th>
              <th className="text-right p-3 font-bold text-muted-foreground">Neto</th>
              <th className="text-left p-3 font-bold text-muted-foreground">Estado</th>
            </tr></thead>
            <tbody>{vouchers.map((v: any) => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-mono">{v.voucher_number}</td>
                <td className="p-3">{v.provider_name}</td>
                <td className="p-3">{new Date(v.payment_date).toLocaleDateString()}</td>
                <td className="p-3 text-right font-bold">${(v.net_paid || 0).toLocaleString()}</td>
                <td className="p-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${v.status === 'pagado' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{v.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {vouchers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay comprobantes</p>}
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
