import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';

function ModalDetalleTurno({ isOpen, onClose, turnoId, onTurnoActualizado, rolUsuario }) {
    const [turno, setTurno] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Estado para manejar el modal de confirmación de eliminación personalizado
    const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);

    // Permisos según el rol:
    // - administrador o recepcionista: pueden editar/gestionar estados de turnos
    const puedeCrearEditarTurnos = rolUsuario === 'administrador' || rolUsuario === 'recepcionista';
    
    // Solo el administrador puede eliminar turnos
    const puedeEliminarTurnos = rolUsuario === 'administrador';

    useEffect(() => {
        if (isOpen && turnoId) {
            cargarDetalleTurno();
            setConfirmarEliminacion(false);
        }
    }, [isOpen, turnoId]);

    const cargarDetalleTurno = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('turnos')
                .select(`
                    id,
                    fecha_hora,
                    motivo,
                    estado,
                    pacientes (nombre, apellido, telefono, email),
                    profesionales (nombre, apellido, especialidad)
                `)
                .eq('id', turnoId)
                .single();

            if (error) throw error;
            setTurno(data);
        } catch (err) {
            console.error('Error al cargar detalle del turno:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const cambiarEstado = async (nuevoEstado) => {
        if (!puedeCrearEditarTurnos) return;
        try {
            const { error } = await supabase
                .from('turnos')
                .update({ estado: nuevoEstado })
                .eq('id', turnoId);

            if (error) throw error;
            onTurnoActualizado();
            onClose();
        } catch (err) {
            console.error('Error al actualizar estado:', err.message);
            alert('No se pudo actualizar el estado del turno.');
        }
    };

    const eliminarTurno = async () => {
        if (!puedeEliminarTurnos) return;
        try {
            const { error } = await supabase
                .from('turnos')
                .delete()
                .eq('id', turnoId);

            if (error) throw error;
            onTurnoActualizado();
            onClose();
        } catch (err) {
            console.error('Error al eliminar el turno:', err.message);
            alert('No se pudo eliminar el turno.');
        }
    };

    // Función para formatear la fecha interpretando el texto de forma literal y evitando conversiones UTC
    const formatearFechaHora = (fechaStr) => {
        if (!fechaStr) return '';
        
        // Extraemos año, mes, día, hora y minutos directamente del string crudo que viene de la base de datos
        // Ej formato típico: "2026-08-13T09:00:00" o con "Z"
        const [fechaPart, horaPart] = fechaStr.split('T');
        if (!fechaPart || !horaPart) return fechaStr;

        const [anio, mes, dia] = fechaPart.split('-');
        const [hora, minuto] = horaPart.split(':');

        if (!anio || !mes || !dia || !hora || !minuto) return fechaStr;

        // Construimos un objeto fecha local usando los valores directos
        const fechaLocal = new Date(anio, parseInt(mes, 10) - 1, dia, hora, minuto);

        return fechaLocal.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-5 w-full max-w-md  max-h-[80vh] shadow-2xl border border-gray-100 relative overflow-hidden">
                
                {/* Modal de confirmación personalizado integrado ocupando todo el modal de forma compacta */}
                {confirmarEliminacion && puedeEliminarTurnos && (
                    <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                        <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-lg font-bold mb-2 shadow-inner">
                            !
                        </div>
                        <h4 className="font-bold text-gray-800 text-base mb-1">¿Estás seguro de eliminar este turno?</h4>
                        <p className="text-xs text-gray-500 mb-5">Esta acción no se puede deshacer y borrará los datos del turno permanentemente.</p>
                        <div className="flex space-x-3 w-full">
                            <button 
                                type="button"
                                onClick={() => setConfirmarEliminacion(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={eliminarTurno}
                                className="flex-1 bg-terracota-500 hover:bg-terracota-600 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-800">Detalle del Turno</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
                </div>

                {loading ? (
                    <p className="text-center text-gray-500 py-6">Cargando detalles...</p>
                ) : turno ? (
                    <div className="space-y-3 text-sm">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Paciente</span>
                            <p className="font-medium text-gray-800">
                                {turno.pacientes?.nombre} {turno.pacientes?.apellido}
                            </p>
                            <p className="text-gray-500 text-xs">Tel: {turno.pacientes?.telefono || 'No especificado'}</p>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Profesional</span>
                            <p className="font-medium text-gray-800">
                                Dr./Dra. {turno.profesionales?.nombre} {turno.profesionales?.apellido}
                            </p>
                            <p className="text-gray-500 text-xs">Especialidad: {turno.profesionales?.especialidad}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Fecha y Hora</span>
                                <p className="font-medium text-gray-800">
                                    {formatearFechaHora(turno.fecha_hora)}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Estado Actual</span>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                                    turno.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                                    turno.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {turno.estado}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Motivo</span>
                            <p className="text-gray-700">{turno.motivo}</p>
                        </div>

                        {puedeCrearEditarTurnos && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                {turno.estado !== 'confirmado' && (
                                    <button 
                                        onClick={() => cambiarEstado('confirmado')}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 cursor-pointer shadow-xs"
                                    >
                                        Confirmar
                                    </button>
                                )}
                                {turno.estado !== 'cancelado' && (
                                    <button 
                                        onClick={() => cambiarEstado('cancelado')}
                                        className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-medium hover:bg-amber-700 cursor-pointer shadow-xs"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                {puedeEliminarTurnos && (
                                    <button 
                                        onClick={() => setConfirmarEliminacion(true)}
                                        className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-medium hover:bg-red-100 cursor-pointer"
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-red-500 py-4">No se encontró información del turno.</p>
                )}
            </div>
        </div>
    );
}

export default ModalDetalleTurno;