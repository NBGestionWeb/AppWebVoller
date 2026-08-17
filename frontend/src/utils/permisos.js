export const PERMISOS = {
    administrador: {
        verAgenda: true,
        editarTurnos: true,
        verPacientes: true,
        editarPacientes: true, // Crear o Editar
        gestionarHistorias: true, // Crear o Editar
        verProfesionales: true,
    },
    profesional: {
        verAgenda: true,      // Solo vista
        editarTurnos: false,  // No crea/edita turnos
        verPacientes: true,   // Solo vista de pacientes
        editarPacientes: false, // No puede crear/editar pacientes
        gestionarHistorias: true, // Crear o Editar historias clínicas
        verProfesionales: false,
    },
    recepcionista: {
        verAgenda: true,
        editarTurnos: true,   // Crear o Editar turnos
        verPacientes: true,
        editarPacientes: true, // Crear o Editar pacientes
        gestionarHistorias: false, // Sin acceso a historias clínicas
        verProfesionales: false,
    }
};

export const tienePermiso = (rol, permiso) => {
    if (!rol) return false;
    // Si es administrador, tiene acceso total
    if (rol === 'administrador') return true;
    return PERMISOS[rol]?.[permiso] || false;
};