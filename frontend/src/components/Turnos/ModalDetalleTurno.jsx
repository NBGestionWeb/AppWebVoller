import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';
import Swal from 'sweetalert2';

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
                    paciente_id,
                    profesional_id,
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

    // Función auxiliar para verificar si el paciente tiene turnos dobles en la misma fecha
    const verificarTurnosDobles = async () => {
        if (!turno || !turno.fecha_hora || !turno.paciente_id) return;

        try {
            // Extraemos solo la fecha (YYYY-MM-DD) para comparar el día completo
            const fechaDia = turno.fecha_hora.split('T')[0];

            const { data: otrosTurnos, error } = await supabase
                .from('turnos')
                .select(`
                    id,
                    fecha_hora,
                    estado,
                    profesionales (nombre, apellido)
                `)
                .eq('paciente_id', turno.paciente_id)
                .neq('id', turno.id) // Excluimos el turno actual que se está gestionando
                .neq('estado', 'cancelado'); // Solo turnos activos

            if (error) throw error;

            // Filtramos los que coincidan exactamente con la misma fecha
            const turnosMismoDia = (otrosTurnos || []).filter(t => {
                const tFecha = t.fecha_hora ? t.fecha_hora.split('T')[0] : '';
                return tFecha === fechaDia;
            });

            if (turnosMismoDia.length > 0) {
                const profNombre = turnosMismoDia[0].profesionales 
                    ? `Dr./Dra. ${turnosMismoDia[0].profesionales.apellido}` 
                    : 'otro profesional';
                
                const horaTurno = turnosMismoDia[0].fecha_hora.split('T')[1]?.substring(0, 5) || '';

                await Swal.fire({
                    icon: 'warning',
                    title: '¡Atención: Turno Doble Detectado!',
                    text: `El paciente ${turno.pacientes?.nombre} ${turno.pacientes?.apellido} también tiene otro turno agendado para este mismo día a las ${horaTurno} hs con el ${profNombre}. Asegúrate de gestionarlo si tampoco va a asistir.`,
                    confirmButtonColor: '#C05C4B'
                });
            }
        } catch (err) {
            console.error('Error al verificar turnos dobles:', err.message);
        }
    };

    const cambiarEstado = async (nuevoEstado) => {
        try {
            // Si está cancelando el turno, verificamos si tiene turno doble para avisar al operador
            if (nuevoEstado === 'cancelado') {
                await verificarTurnosDobles();
            }

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
            // Verificamos si tiene turno doble antes de eliminarlo físicamente
            await verificarTurnosDobles();

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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col relative">
                
                {/* Modal de confirmación personalizado integrado */}
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
                                className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-100 cursor-pointer font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={eliminarTurno}
                                className="w-full sm:flex-1 px-5 py-2.5 bg-terracota-500 hover:bg-terracota-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-sm"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                )}

                {/* Cabecera del Modal */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">Detalle del Turno</h3>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer p-1 leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Cuerpo desplazable */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-3 text-sm flex-1">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8 text-sm">Cargando detalles...</p>
                    ) : turno ? (
                        <div className="space-y-3">
                            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Paciente</span>
                                <p className="font-medium text-gray-800">
                                    {turno.pacientes?.nombre} {turno.pacientes?.apellido}
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">Tel: {turno.pacientes?.telefono || 'No especificado'}</p>
                            </div>

                            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Profesional</span>
                                <p className="font-medium text-gray-800">
                                    Dr./Dra. {turno.profesionales?.nombre} {turno.profesionales?.apellido}
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">Especialidad: {turno.profesionales?.especialidad}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Fecha y Hora</span>
                                    <p className="font-medium text-gray-800 text-xs sm:text-sm">
                                        {formatearFechaHora(turno.fecha_hora)}
                                    </p>
                                </div>

                                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80 flex flex-col justify-center">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Estado Actual</span>
                                    <div>
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                                            turno.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                            turno.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {turno.estado}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-0.5">Motivo</span>
                                <p className="text-gray-700 text-xs sm:text-sm">{turno.motivo || 'Sin motivo especificado'}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-red-500 py-6 text-sm">No se encontró información del turno.</p>
                    )}
                </div>

                {/* Pie del Modal con botones alineados a la línea estética del sistema */}
                {turno && !loading && (
                    <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2">
                        {turno.estado !== 'confirmado' && (
                            <button 
                                type="button"
                                onClick={() => cambiarEstado('confirmado')}
                                className="w-full sm:flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-medium cursor-pointer shadow-xs transition-colors text-center"
                            >
                                Confirmar Turno
                            </button>
                        )}
                        {turno.estado !== 'cancelado' && (
                            <button 
                                type="button"
                                onClick={() => cambiarEstado('cancelado')}
                                className="w-full sm:flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-medium cursor-pointer shadow-xs transition-colors text-center"
                            >
                                Cancelar Turno
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => setConfirmarEliminacion(true)}
                            className="w-full sm:w-auto px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-colors text-center"
                        >
                            Eliminar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ModalDetalleTurno;