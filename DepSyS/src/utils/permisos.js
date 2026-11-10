/**
 * Utilidades de Permisos y Roles de DepSyS
 * Motos Mendes S.A.
 */

export const MODULOS_SISTEMA = [
  { 
    id: 'ASSIGN_PICKING', 
    label: 'Distribuidor / Asignar Separador', 
    desc: 'Distribución de pedidos confirmados a separadores', 
    defaultRoles: ['ADMIN', 'SUPERVISOR', 'DISTRIBUIDOR'] 
  },
  { 
    id: 'EXCEPCIONES', 
    label: 'Bandeja Unificada de Excepciones', 
    desc: 'Resolución inmediata de esperas de mesa, faltantes y demoras', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  },
  { 
    id: 'CREDIT_APPROVAL', 
    label: 'Pedidos ERP / Créditos', 
    desc: 'Evaluación comercial y retenciones de crédito', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  },
  { 
    id: 'MESAS', 
    label: 'Monitor de 18 Bancadas', 
    desc: 'Control de mesas de guardadores y empaque', 
    defaultRoles: ['ADMIN', 'SUPERVISOR', 'GUARDADOR'] 
  },
  { 
    id: 'CONFIRMACIONES', 
    label: 'Bandeja de Confirmaciones', 
    desc: 'Autorizaciones inmediatas de bancadas en espera', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  },
  { 
    id: 'SEPARADORES', 
    label: 'Separadores en Vivo', 
    desc: 'Monitoreo de operarios en pasillos y picking', 
    defaultRoles: ['ADMIN', 'SUPERVISOR', 'SEPARADOR'] 
  },
  { 
    id: 'RADAR', 
    label: 'Radar de Demoras', 
    desc: 'Tiempos de ciclo y umbrales de demora', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  },
  { 
    id: 'DISCREPANCIAS', 
    label: 'Discrepancias ERP', 
    desc: 'Faltantes y stock físico vs sistema', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  },
  { 
    id: 'REPORTS', 
    label: 'Reportes y Productividad', 
    desc: 'Métricas mensuales y KPI del depósito', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  },
  { 
    id: 'STAFF', 
    label: 'Personal y Seguridad', 
    desc: 'Gestión de operarios, PINs y permisos', 
    defaultRoles: ['ADMIN', 'SUPERVISOR'] 
  }
];

export const FUNCIONES_ROLES = [
  { 
    id: 'DISTRIBUIDOR', 
    label: 'Distribuidor de Pedidos', 
    desc: 'Solo ve y gestiona la distribución de pedidos a separadores', 
    badgeColor: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    defaultModules: ['ASSIGN_PICKING'] 
  },
  { 
    id: 'SUPERVISOR', 
    label: 'Supervisor General', 
    desc: 'Acceso completo a la operación y monitoreo del depósito', 
    badgeColor: 'bg-amber-50 border-amber-200 text-amber-700',
    defaultModules: ['CREDIT_APPROVAL', 'ASSIGN_PICKING', 'EXCEPCIONES', 'MESAS', 'CONFIRMACIONES', 'SEPARADORES', 'RADAR', 'DISCREPANCIAS', 'REPORTS', 'STAFF'] 
  },
  { 
    id: 'ADMIN', 
    label: 'Administrador Maestro', 
    desc: 'Control total e irrestricto de todos los módulos y seguridad', 
    badgeColor: 'bg-purple-50 border-purple-200 text-purple-700',
    defaultModules: ['CREDIT_APPROVAL', 'ASSIGN_PICKING', 'EXCEPCIONES', 'MESAS', 'CONFIRMACIONES', 'SEPARADORES', 'RADAR', 'DISCREPANCIAS', 'REPORTS', 'STAFF'] 
  },
  { 
    id: 'SEPARADOR', 
    label: 'Separador de Pasillos', 
    desc: 'Operario de recolección en estanterías (App Móvil)', 
    badgeColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    defaultModules: ['SEPARADORES'] 
  },
  { 
    id: 'GUARDADOR', 
    label: 'Mesa / Empaque', 
    desc: 'Operario verificador en bancadas físicas (App Mesa)', 
    badgeColor: 'bg-blue-50 border-blue-200 text-blue-700',
    defaultModules: ['MESAS'] 
  }
];

export function getModulosPermitidos(usuario) {
  if (!usuario) return [];
  // Administrador maestro siempre tiene todos los módulos
  if (usuario.codigo === 'SUP008' || usuario.rol === 'ADMIN' || usuario.is_master) {
    return MODULOS_SISTEMA.map(m => m.id);
  }

  // Si tiene permisos_custom definidos en la BD, esos son los que mandan
  if (usuario.permisos_custom && typeof usuario.permisos_custom === 'object') {
    const permitidos = Object.keys(usuario.permisos_custom).filter(k => Boolean(usuario.permisos_custom[k]));
    if (permitidos.length > 0) return permitidos;
  }

  // Si no tiene permisos_custom, recurrir a los permisos por defecto de su función
  const rolDef = FUNCIONES_ROLES.find(r => r.id === usuario.rol);
  if (rolDef) {
    return rolDef.defaultModules;
  }

  return ['ASSIGN_PICKING'];
}

export function tienePermiso(usuario, moduloId) {
  if (!usuario) return false;
  if (usuario.codigo === 'SUP008' || usuario.rol === 'ADMIN' || usuario.is_master) return true;
  const permitidos = getModulosPermitidos(usuario);
  return permitidos.includes(moduloId);
}
