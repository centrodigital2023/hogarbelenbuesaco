import { useAuth } from "./useAuth";

type Module = 'ingreso' | 'valoracion' | 'alimentacion' | 'bienestar' | 'salud' | 'sistema_salud' | 'higiene' | 'seguridad' | 'egreso' | 'personal' | 'calidad' | 'admin' | 'finanzas' | 'usuarios' | 'residentes' | 'blog' | 'redes' | 'gerencial';
type Action = 'read' | 'create' | 'update' | 'delete';

const MATRIX: Record<string, Record<string, Action[]>> = {
  super_admin: {
    ingreso: ['read','create','update','delete'], valoracion: ['read','create','update','delete'],
    alimentacion: ['read','create','update','delete'], bienestar: ['read','create','update','delete'],
    salud: ['read','create','update','delete'], sistema_salud: ['read','create','update','delete'],
    higiene: ['read','create','update','delete'], seguridad: ['read','create','update','delete'],
    egreso: ['read','create','update','delete'], personal: ['read','create','update','delete'],
    calidad: ['read','create','update','delete'], admin: ['read','create','update','delete'],
    finanzas: ['read','create','update','delete'], usuarios: ['read','create','update','delete'],
    residentes: ['read','create','update','delete'], blog: ['read','create','update','delete'],
    redes: ['read','create','update','delete'], gerencial: ['read','create','update','delete'],
  },
  coordinador: {
    ingreso: ['read','create','update','delete'], valoracion: ['read','create','update','delete'],
    alimentacion: ['read'], bienestar: ['read','create','update','delete'],
    salud: ['read','create','update','delete'], sistema_salud: ['read','create','update','delete'],
    higiene: ['read','create','update','delete'], seguridad: ['read','create','update','delete'],
    egreso: ['read','create','update','delete'], personal: ['read'],
    calidad: ['read','create','update','delete'], admin: ['read'],
    residentes: ['read','create','update','delete'], gerencial: ['read','create','update','delete'],
  },
  enfermera: {
    valoracion: ['read','create','update','delete'], salud: ['read','create','update','delete'],
    bienestar: ['read'], seguridad: ['read','create'], sistema_salud: ['read','create','update','delete'],
    residentes: ['read'],
  },
  cuidadora: {
    residentes: ['read'], salud: ['read'], bienestar: ['read','create'],
    seguridad: ['read','create'],
  },
  terapeuta: {
    valoracion: ['read','create','update','delete'], bienestar: ['read','create','update','delete'],
    residentes: ['read'],
  },
  psicologo: {
    valoracion: ['read','create','update','delete'], bienestar: ['read','create','update','delete'],
    residentes: ['read'],
  },
  administrativo: {
    finanzas: ['read','create','update','delete'], admin: ['read','create','update','delete'],
    blog: ['read','create','update','delete'], redes: ['read','create','update','delete'],
    alimentacion: ['read','create'], gerencial: ['read','create','update','delete'],
  },
  manipuladora: {
    alimentacion: ['read','create','update','delete'],
  },
};

export const usePermissions = () => {
  const { roles } = useAuth();

  const can = (module: Module, action: Action): boolean => {
    return roles.some(role => {
      const perms = MATRIX[role]?.[module];
      return perms?.includes(action) ?? false;
    });
  };

  const canAccess = (module: Module): boolean => can(module, 'read');
  const canEdit = (module: Module): boolean => can(module, 'create') || can(module, 'update');

  return { can, canAccess, canEdit };
};
