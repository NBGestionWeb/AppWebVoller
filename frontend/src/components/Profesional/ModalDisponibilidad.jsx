import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';

function ModalDisponibilidad({ isOpen, onClose, profesional, rolUsuario }) {
    const [disponibilidad, setDisponibilidad] = useState({});
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Permisos según el rol:
    // - administrador: gestión total (modificar horarios)
    // - recepcionista: solo lectura (ver horarios sin modificar)
    const puedeGestionar = rolUsuario === 'administrador';

    useEffect(() => {
        if (isOpen && profesional) {
            cargarDisponibilidad();
        }
    }, [isOpen, profesional]);

    const cargarDisponibilidad = async () => {
        setLoading(true);
        setError('');
        setExito('');
        try {
            const { data, error } = await supabase
                .from('disponibilidad_profesionales')
                .select('*')
                .eq('profesional_id', profesional.id);

            if (error) throw error;

            // Inicializamos la estructura base para los 7 días
            const mapaDisponibilidad = {};
            diasSemana.forEach(dia => {
                const existente = data.find(item => item.dia_semana === dia);
                mapaDisponibilidad[dia] = {
                    activo: !!existente,
                    hora_inicio: existente ? existente.hora_inicio.slice(0, 5) : '08:00',
                    hora_fin: existente ? existente.hora_fin.slice(0, 5) : '14:00',
                    id: existente ? existente.id : null
                };
            });

            setDisponibilidad(mapaDisponibilidad);
        } catch (err) {
            setError('Error al cargar la disponibilidad: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (dia) => {
        if (!puedeGestionar) return;
        setDisponibilidad(prev => ({
            ...prev,
            [dia]: {
                ...prev[dia],
                activo: !prev[dia].activo
            }
        }));
    };

    const handleHoraChange = (dia, campo, valor) => {
        if (!puedeGestionar) return;
        setDisponibilidad(prev => ({
            ...prev,
            [dia]: {
                ...prev[dia],
                [campo]: valor
            }
        }));
    };

    const handleGuardarTodo = async (e) => {
        e.preventDefault();
        if (!puedeGestionar) return;
        setError('');
        setExito('');
        setGuardando(true);

        try {
            for (const dia of diasSemana) {
                const item = disponibilidad[dia];

                if (item.activo) {
                    if (item.hora_inicio >= item.hora_fin) {
                        throw new Error(`En el día ${dia}, la hora de inicio debe ser anterior a la hora de fin.`);
                    }

                    if (item.id) {
                        // Actualizar registro existente
                        const { error: updateError } = await supabase
                            .from('disponibilidad_profesionales')
                            .update({ hora_inicio: item.hora_inicio, hora_fin: item.hora_fin })
                            .eq('id', item.id);

                        if (updateError) throw updateError;
                    } else {
                        // Insertar nuevo registro
                        const { error: insertError } = await supabase
                            .from('disponibilidad_profesionales')
                            .insert([{
                                profesional_id: profesional.id,
                                dia_semana: dia,
                                hora_inicio: item.hora_inicio,
                                hora_fin: item.hora_fin
                            }]);

                        if (insertError) throw insertError;
                    }
                } else {
                    if (item.id) {
                        // Si estaba activo pero se desmarcó, lo borramos de la base de datos
                        const { error: deleteError } = await supabase
                            .from('disponibilidad_profesionales')
                            .delete()
                            .eq('id', item.id);

                        if (deleteError) throw deleteError;
                    }
                }
            }

            setExito('Disponibilidad actualizada correctamente.');
            cargarDisponibilidad();
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            setError(err.message || 'Ocurrió un error al guardar los horarios.');
        } finally {
            setGuardando(false);
        }
    };

    if (!isOpen || !profesional) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden my-8">
                
                {/* Cabecera */}
                <div className="bg-terracota-500 px-6 py-4 flex justify-between items-center text-white">
                    <div>
                        <h3 className="text-lg font-bold">
                            {puedeGestionar ? 'Configurar Disponibilidad Semanal' : 'Disponibilidad Semanal'}
                        </h3>
                        <p className="text-xs text-white/80">Dr./Lic. {profesional.nombre} {profesional.apellido} ({profesional.especialidad})</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleGuardarTodo} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-sm">

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {exito && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg text-sm text-green-700">
                            {exito}
                        </div>
                    )}

                    {loading ? (
                        <p className="text-gray-500 text-xs text-center py-8">Cargando grilla semanal...</p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 mb-2">
                                {puedeGestionar 
                                    ? 'Selecciona los días que atiende el profesional y define sus rangos horarios:'
                                    : 'Días y rangos horarios en los que atiende el profesional:'}
                            </p>
                            
                            {diasSemana.map((dia) => {
                                const configDia = disponibilidad[dia] || { activo: false, hora_inicio: '08:00', hora_fin: '14:00' };
                                
                                return (
                                    <div 
                                        key={dia} 
                                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border transition-colors ${
                                            configDia.activo ? 'bg-terracota-50/40 border-terracota-200' : 'bg-gray-50/60 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3 w-36 mb-2 sm:mb-0">
                                            <input 
                                                type="checkbox"
                                                checked={configDia.activo}
                                                disabled={!puedeGestionar}
                                                onChange={() => handleCheckboxChange(dia)}
                                                className="w-4 h-4 text-terracota-600 rounded border-gray-300 focus:ring-terracota-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className={`font-semibold text-sm ${configDia.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {dia}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                                            <div className="flex items-center space-x-1">
                                                <span className="text-xs text-gray-500">De:</span>
                                                <input 
                                                    type="time" 
                                                    value={configDia.hora_inicio}
                                                    disabled={!puedeGestionar || !configDia.activo}
                                                    onChange={(e) => handleHoraChange(dia, 'hora_inicio', e.target.value)}
                                                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-terracota-500 disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                            </div>

                                            <div className="flex items-center space-x-1">
                                                <span className="text-xs text-gray-500">A:</span>
                                                <input 
                                                    type="time" 
                                                    value={configDia.hora_fin}
                                                    disabled={!puedeGestionar || !configDia.activo}
                                                    onChange={(e) => handleHoraChange(dia, 'hora_fin', e.target.value)}
                                                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-terracota-500 disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pie del Modal */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            {puedeGestionar ? 'Cancelar' : 'Cerrar'}
                        </button>
                        {puedeGestionar && (
                            <button 
                                type="submit"
                                disabled={loading || guardando}
                                className="px-5 py-2 bg-terracota-500 text-white rounded-lg text-sm font-medium hover:bg-terracota-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {guardando ? 'Guardando...' : 'Guardar Horarios'}
                            </button>
                        )}
                    </div>

                </form>

            </div>
        </div>
    );
}

export default ModalDisponibilidad;