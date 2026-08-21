import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../config/supabase.js';
import { usePermisos } from '../hooks/usePermisos';
import ModalNuevoTurno from '../components/Turnos/ModalNuevoTurno';
import ModalDetalleTurno from '../components/Turnos/ModalDetalleTurno';

function Turnos() {
    const { tienePermiso, loadingPermisos } = usePermisos();

    const [mounted, setMounted] = useState(false);
    const [eventos, setEventos] = useState([]);
    
    // Estados para los modales
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [turnoIdSeleccionado, setTurnoIdSeleccionado] = useState(null);

    useEffect(() => {
        setMounted(true);
        cargarTurnos();
    }, []);

    const cargarTurnos = async () => {
        try {
            const { data, error } = await supabase
                .from('turnos')
                .select(`
                    id,
                    fecha_hora,
                    motivo,
                    estado,
                    derivado_por,
                    pacientes (nombre, apellido),
                    profesionales (nombre, apellido)
                `);

            if (error) throw error;

            const eventosFormatados = data.map(item => {
                const pacienteNombre = item.pacientes ? `${item.pacientes.nombre} ${item.pacientes.apellido}` : 'Paciente';
                const profNombre = item.profesionales ? `Dr./Dra. ${item.profesionales.apellido}` : '';
                
                // Color según el estado
                let color = '#3B82F6'; // azul por defecto (pendiente)
                if (item.estado === 'confirmado') color = '#10B981'; // verde
                if (item.estado === 'cancelado') color = '#EF4444'; // rojo

                // Extracción exacta de los componentes de fecha y hora sin alteración de zona horaria
                let fechaLimpia = item.fecha_hora;
                if (fechaLimpia) {
                    const partes = fechaLimpia.split('T');
                    if (partes.length === 2) {
                        const fechaPart = partes[0]; // YYYY-MM-DD
                        const horaPart = partes[1].substring(0, 5); // HH:mm
                        fechaLimpia = `${fechaPart}T${horaPart}:00`;
                    }
                }

                return {
                    id: item.id,
                    title: `${pacienteNombre} (${profNombre})`,
                    start: fechaLimpia,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: {
                        estado: item.estado,
                        motivo: item.motivo,
                        derivado_por: item.derivado_por
                    }
                };
            });

            setEventos(eventosFormatados);
        } catch (err) {
            console.error('Error al cargar turnos:', err.message);
        }
    };

    const handleDateSelect = (selectInfo) => {
        if (!loadingPermisos && !tienePermiso('carga_turnos')) {
            alert('No cuentas con permisos para agendar nuevos turnos.');
            return;
        }
        const fechaIso = selectInfo.startStr.slice(0, 16);
        setFechaSeleccionada(fechaIso);
        setIsModalNuevoOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        setTurnoIdSeleccionado(clickInfo.event.id);
        setIsModalDetalleOpen(true);
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 max-w-7xl mx-auto">
            {/* Cabecera / Título y Botón adaptable */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Módulo de Turnos Médicos</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Agenda general de citas y disponibilidad de atención.</p>
                </div>
                <button
                    onClick={() => {
                        if (!loadingPermisos && !tienePermiso('carga_turnos')) {
                            alert('No cuentas con permisos para agendar nuevos turnos.');
                            return;
                        }
                        setFechaSeleccionada('');
                        setIsModalNuevoOpen(true);
                    }}
                    disabled={!loadingPermisos && !tienePermiso('carga_turnos')}
                    className="w-full sm:w-auto bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>+ Nuevo Turno</span>
                </button>
            </div>

            {/* Contenedor del Calendario */}
            <div className="w-full overflow-hidden">
                {mounted && (
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={esLocale}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        buttonText={{
                            today: 'Hoy',
                            month: 'Mes',
                            week: 'Semana',
                            day: 'Día'
                        }}
                        slotMinTime="09:00:00"
                        slotMaxTime="19:00:00"
                        scrollTime="09:00:00"
                        slotLabelFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            omitZeroMinute: false
                        }}
                        selectable={true}
                        select={handleDateSelect}
                        events={eventos}
                        eventClick={handleEventClick}
                        editable={false}
                        height="auto"
                        contentHeight={550}
                        dayMaxEvents={true}
                    />
                )}
            </div>

            {/* Modal para Crear Turno */}
            <ModalNuevoTurno
                isOpen={isModalNuevoOpen}
                onClose={() => setIsModalNuevoOpen(false)}
                onTurnoCreado={cargarTurnos}
                fechaSeleccionada={fechaSeleccionada}
            />

            {/* Modal para Ver Detalles / Modificar Turno */}
            <ModalDetalleTurno
                isOpen={isModalDetalleOpen}
                onClose={() => setIsModalDetalleOpen(false)}
                turnoId={turnoIdSeleccionado}
                onTurnoActualizado={cargarTurnos}
            />
        </div>
    );
}

export default Turnos;