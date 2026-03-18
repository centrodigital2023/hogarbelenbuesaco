import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { UserPlus, Trash2, Shield } from "lucide-react";

type AppRole = 'super_admin' | 'coordinador' | 'enfermera' | 'cuidadora' | 'terapeuta' | 'psicologo' | 'administrativo';

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  coordinador: 'Coordinador',
  enfermera: 'Enfermera',
  cuidadora: 'Cuidadora',
  terapeuta: 'Terapeuta',
  psicologo: 'Psicólogo',
  administrativo: 'Administrativo',
};

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
}

const UserManagement = ({ onBack }: { onBack: () => void }) => {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>('cuidadora');
  const [creating, setCreating] = useState(false);

  const isSuperAdmin = hasRole('super_admin');

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name');
    const { data: allRoles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles && allRoles) {
      const userMap: Record<string, UserWithRole> = {};
      profiles.forEach(p => {
        userMap[p.user_id] = { user_id: p.user_id, email: '', full_name: p.full_name, roles: [] };
      });
      allRoles.forEach(r => {
        if (userMap[r.user_id]) {
          userMap[r.user_id].roles.push(r.role as AppRole);
        }
      });
      setUsers(Object.values(userMap));
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setCreating(true);

    // Sign up the user via Supabase auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { full_name: newName } },
    });

    if (signUpError) {
      toast({ title: "Error", description: signUpError.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    if (signUpData.user) {
      // Assign role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: signUpData.user.id,
        role: newRole,
      });

      if (roleError) {
        toast({ title: "Usuario creado pero error asignando rol", description: roleError.message, variant: "destructive" });
      } else {
        toast({ title: "Usuario creado", description: `${newName} registrado como ${ROLE_LABELS[newRole]}` });
      }
    }

    setNewEmail("");
    setNewName("");
    setNewPassword("");
    setShowCreate(false);
    setCreating(false);
    fetchUsers();
  };

  const handleDeleteRole = async (userId: string, role: AppRole) => {
    if (!isSuperAdmin) return;
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    toast({ title: "Rol eliminado" });
    fetchUsers();
  };

  if (!isSuperAdmin) {
    return <p className="text-muted-foreground p-8">No tiene permisos para esta sección.</p>;
  }

  return (
    <div className="animate-fade-in">
      <FormHeader title="Gestión de Usuarios" subtitle="Crear, editar y asignar roles" onBack={onBack} />

      <button
        onClick={() => setShowCreate(!showCreate)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 mb-6 min-h-[48px]"
      >
        <UserPlus size={16} />
        Nuevo Usuario
      </button>

      {showCreate && (
        <form onSubmit={handleCreateUser} className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4 max-w-lg">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Nombre completo</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Correo</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Contraseña</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required minLength={6} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Rol</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value as AppRole)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={creating}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase hover:opacity-90 disabled:opacity-50 min-h-[48px]">
            {creating ? "Creando..." : "Crear Usuario"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.user_id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{u.full_name}</p>
                <div className="flex gap-2 mt-1">
                  {u.roles.map(r => (
                    <span key={r} className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      <Shield size={10} />
                      {ROLE_LABELS[r]}
                      <button onClick={() => handleDeleteRole(u.user_id, r)} className="ml-1 hover:text-destructive">
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                  {u.roles.length === 0 && <span className="text-[10px] text-muted-foreground">Sin rol asignado</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
