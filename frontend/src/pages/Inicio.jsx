import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
// import ModalRecordatorioWa from '../components/turnos/ModalRecordatorioWa';

function Inicio() {
    const [turnosSemana, setTurnosSemana] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [turnoSeleccionadoWa, setTurnoSeleccionadoWa] = useState(null);

    useEffect(() => {
        cargarTurnosDeLaSemana();
    }, []);

    const cargarTurnosDeLaSemana = async () => {
        try {
            setCargando(true);

            // Obtener fecha actual local ajustada a las 00:00:00
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            // Calcular exactamente 7 días en adelante (hoy + 6 días para completar una ventana de 7 días)
            const ultimoDia = new Date(hoy);
            ultimoDia.setDate(hoy.getDate() + 6);
            ultimoDia.setHours(23, 59, 59, 999);

            // Consultar a Supabase incluyendo el teléfono del paciente
            const { data, error } = await supabase
                .from('turnos')
                .select(`
                    id,
                    fecha_hora,
                    motivo,
                    estado,
                    pacientes (nombre, apellido, telefono),
                    profesionales (nombre, apellido)
                `)
                .gte('fecha_hora', hoy.toISOString())
                .lte('fecha_hora', ultimoDia.toISOString())
                .order('fecha_hora', { ascending: true });

            if (error) throw error;
            setTurnosSemana(data || []);
        } catch (err) {
            console.error('Error al cargar los turnos de la semana:', err.message);
        } finally {
            setCargando(false);
        }
    };

    const formatearFechaHora = (fechaStr) => {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr);
        return new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(fecha);
    };

    const getBadgeEstado = (estado) => {
        const est = estado ? estado.toLowerCase() : 'pendiente';
        switch (est) {
            case 'confirmado':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'cancelado':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Bienvenida */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel de Inicio</h2>
                    <p className="text-sm text-gray-500">Próximos turnos y agenda de los próximos 7 días.</p>
                </div>
                <button
                    onClick={cargarTurnosDeLaSemana}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                >
                    Actualizar Agenda
                </button>
            </div>

            {/* Listado de Turnos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">Turnos Próximos (7 Días)</h3>
                    <span className="text-xs font-medium bg-terracota-50 text-terracota-700 px-3 py-1 rounded-full border border-terracota-200">
                        {turnosSemana.length} citas programadas
                    </span>
                </div>

                {cargando ? (
                    <div className="text-center py-12 text-gray-400">Cargando turnos próximos...</div>
                ) : turnosSemana.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {turnosSemana.map((turno) => {
                            const pacienteNombre = turno.pacientes 
                                ? `${turno.pacientes.nombre} ${turno.pacientes.apellido}` 
                                : 'Paciente no asignado';
                            const profNombre = turno.profesionales 
                                ? `Dr./Dra. ${turno.profesionales.apellido}` 
                                : 'Profesional no asignado';

                            return (
                                <div 
                                    key={turno.id} 
                                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 bg-gray-50/50"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <span className="text-xs font-semibold text-terracota-600 uppercase tracking-wider">
                                                {formatearFechaHora(turno.fecha_hora)}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getBadgeEstado(turno.estado)}`}>
                                                {turno.estado || 'pendiente'}
                                            </span>
                                        </div>
                                        <h4 className="font-semibold text-gray-800 text-base">{pacienteNombre}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{profNombre}</p>
                                    </div>

                                    {turno.motivo && (
                                        <div className="text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100">
                                            <span className="font-medium text-gray-700">Motivo:</span> {turno.motivo}
                                        </div>
                                    )}

                                    {/* Botón de Enviar WhatsApp */}
                                    <button
                                        onClick={() => setTurnoSeleccionadoWa(turno)}
                                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium py-1.5 px-3 rounded-lg border border-emerald-200 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <span>💬 Enviar WhatsApp</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        No hay turnos registrados para los próximos 7 días.
                    </div>
                )}
            </div>

            {/* Modal para Recordatorio de WhatsApp */}
            <ModalRecordatorioWa 
                isOpen={!!turnoSeleccionadoWa} 
                onClose={() => setTurnoSeleccionadoWa(null)} 
                turno={turnoSeleccionadoWa} 
            />
        </div>
    );
}

export default Inicio;