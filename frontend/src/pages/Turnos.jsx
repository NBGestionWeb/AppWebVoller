import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../config/supabase.js';
import ModalNuevoTurno from '../components/Turnos/ModalNuevoTurno';
import ModalDetalleTurno from '../components/Turnos/ModalDetalleTurno';

function Turnos({ rolUsuario }) {
    const [mounted, setMounted] = useState(false);
    const [eventos, setEventos] = useState([]);
    
    // Estados para los modales
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [turnoIdSeleccionado, setTurnoIdSeleccionado] = useState(null);

    // Permisos según el rol:
    // - administrador: gestión total (crear o editar turnos)
    // - recepcionista: turnos (crear o editar)
    // - profesional: agenda (solo vista, sin crear ni editar)
    const puedeCrearEditarTurnos = rolUsuario === 'administrador' || rolUsuario === 'recepcionista';

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
        if (!puedeCrearEditarTurnos) return; // Si es profesional, no permite crear turnos desde la grilla
        const fechaIso = selectInfo.startStr.slice(0, 16);
        setFechaSeleccionada(fechaIso);
        setIsModalNuevoOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        // Todos los roles (incluyendo profesionales) pueden ver el detalle del turno,
        // pero los botones de modificar/eliminar se filtran dentro del modal según el rol.
        setTurnoIdSeleccionado(clickInfo.event.id);
        setIsModalDetalleOpen(true);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Módulo de Turnos Médicos</h2>
                    <p className="text-sm text-gray-500">Agenda general de citas y disponibilidad de atención.</p>
                </div>
                {puedeCrearEditarTurnos && (
                    <button
                        onClick={() => {
                            setFechaSeleccionada('');
                            setIsModalNuevoOpen(true);
                        }}
                        className="bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                    >
                        + Nuevo Turno
                    </button>
                )}
            </div>

            <div className="w-full">
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
                        slotMinTime="09:00:00"
                        slotMaxTime="19:00:00"
                        scrollTime="09:00:00"
                        slotLabelFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            omitZeroMinute: false
                        }}
                        selectable={puedeCrearEditarTurnos}
                        select={handleDateSelect}
                        events={eventos}
                        eventClick={handleEventClick}
                        editable={false}
                        height={650}
                        dayMaxEvents={true}
                    />
                )}
            </div>

            {/* Modal para Crear Turno */}
            {puedeCrearEditarTurnos && (
                <ModalNuevoTurno
                    isOpen={isModalNuevoOpen}
                    onClose={() => setIsModalNuevoOpen(false)}
                    onTurnoCreado={cargarTurnos}
                    fechaSeleccionada={fechaSeleccionada}
                />
            )}

            {/* Modal para Ver Detalles / Modificar Turno (Disponible para todos de consulta, limitado por rol adentro) */}
            <ModalDetalleTurno
                isOpen={isModalDetalleOpen}
                onClose={() => setIsModalDetalleOpen(false)}
                turnoId={turnoIdSeleccionado}
                onTurnoActualizado={cargarTurnos}
                rolUsuario={rolUsuario}
            />
        </div>
    );
}

export default Turnos;