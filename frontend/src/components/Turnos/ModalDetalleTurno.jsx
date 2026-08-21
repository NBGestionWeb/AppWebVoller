import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';

function ModalDetalleTurno({ isOpen, onClose, turnoId, onTurnoActualizado }) {
    const [turno, setTurno] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Estado para manejar el modal de confirmación de eliminación personalizado
    const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);

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
        
        const [fechaPart, horaPart] = fechaStr.split('T');
        if (!fechaPart || !horaPart) return fechaStr;

        const [anio, mes, dia] = fechaPart.split('-');
        const [hora, minuto] = horaPart.split(':');

        if (!anio || !mes || !dia || !hora || !minuto) return fechaStr;

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative my-auto">
                
                {/* Modal de confirmación personalizado integrado ocupando todo el modal de forma compacta */}
                {confirmarEliminacion && (
                    <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-5 sm:p-6 text-center animate-fadeIn">
                        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold mb-3 shadow-inner">
                            !
                        </div>
                        <h4 className="font-bold text-gray-800 text-base sm:text-lg mb-1">¿Estás seguro de eliminar este turno?</h4>
                        <p className="text-xs sm:text-sm text-gray-500 mb-6">Esta acción no se puede deshacer y borrará los datos del turno permanentemente.</p>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full">
                            <button 
                                type="button"
                                onClick={() => setConfirmarEliminacion(false)}
                                className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={eliminarTurno}
                                className="w-full sm:flex-1 bg-terracota-500 hover:bg-terracota-600 text-white py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">Detalle del Turno</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl p-1 cursor-pointer">×</button>
                </div>

                {loading ? (
                    <p className="text-center text-gray-500 py-8 text-sm">Cargando detalles...</p>
                ) : turno ? (
                    <div className="space-y-3 text-sm">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Paciente</span>
                            <p className="font-medium text-gray-800">
                                {turno.pacientes?.nombre} {turno.pacientes?.apellido}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">Tel: {turno.pacientes?.telefono || 'No especificado'}</p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Profesional</span>
                            <p className="font-medium text-gray-800">
                                Dr./Dra. {turno.profesionales?.nombre} {turno.profesionales?.apellido}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">Especialidad: {turno.profesionales?.especialidad}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Fecha y Hora</span>
                                <p className="font-medium text-gray-800 text-xs sm:text-sm">
                                    {formatearFechaHora(turno.fecha_hora)}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Estado Actual</span>
                                <div>
                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                                        turno.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                                        turno.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {turno.estado}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Motivo</span>
                            <p className="text-gray-700 text-xs sm:text-sm">{turno.motivo}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100">
                            {turno.estado !== 'confirmado' && (
                                <button 
                                    onClick={() => cambiarEstado('confirmado')}
                                    className="w-full sm:flex-1 px-3 py-2.5 bg-green-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-green-700 cursor-pointer shadow-xs transition-colors"
                                >
                                    Confirmar
                                </button>
                            )}
                            {turno.estado !== 'cancelado' && (
                                <button 
                                    onClick={() => cambiarEstado('cancelado')}
                                    className="w-full sm:flex-1 px-3 py-2.5 bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-amber-700 cursor-pointer shadow-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button 
                                onClick={() => setConfirmarEliminacion(true)}
                                className="w-full sm:w-auto px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs sm:text-sm font-medium hover:bg-red-100 cursor-pointer transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-red-500 py-6 text-sm">No se encontró información del turno.</p>
                )}
            </div>
        </div>
    );
}

export default ModalDetalleTurno;