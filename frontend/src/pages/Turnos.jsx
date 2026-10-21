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
    const [turnosCrudos, setTurnosCrudos] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    
    // Estado para alternar la vista ('calendario' o 'listado')
    const [vistaActiva, setVistaActiva] = useState('calendario');
    const [subVistaListado, setSubVistaListado] = useState('hoy');
    const [busquedaDni, setBusquedaDni] = useState('');
    const [filtroProfesionalId, setFiltroProfesionalId] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('');

    // Estados para los modales
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [turnoIdSeleccionado, setTurnoIdSeleccionado] = useState(null);

    useEffect(() => {
        setMounted(true);
        cargarDatosAuxiliares();
        cargarTurnos();
    }, []);

    const cargarDatosAuxiliares = async () => {
        try {
            const { data, error } = await supabase.from('profesionales').select('id, nombre, apellido, especialidad');
            if (error) throw error;
            setProfesionales(data || []);
        } catch (err) {
            console.error('Error al cargar profesionales para filtros:', err.message);
        }
    };

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
                    pacientes (nombre, apellido, dni, telefono),
                    profesionales (id, nombre, apellido, especialidad)
                `);

            if (error) throw error;

            // Ordenamos los turnos crudos por fecha y hora ascendente (del más próximo al más lejano)
            const turnosOrdenados = (data || []).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

            setTurnosCrudos(turnosOrdenados);

            const eventosFormatados = turnosOrdenados.map(item => {
                const pacienteNombre = item.pacientes ? `${item.pacientes.nombre} ${item.pacientes.apellido}` : 'Paciente';
                const profNombre = item.profesionales ? `Dr./Dra. ${item.profesionales.apellido}` : '';
                const motivoConsulta = item.motivo ? item.motivo : 'Sin motivo';
                
                let color = '#3B82F6'; 
                if (item.estado === 'confirmado') color = '#10B981'; 
                if (item.estado === 'cancelado') color = '#EF4444'; 

                let fechaLimpia = item.fecha_hora;
                if (fechaLimpia) {
                    const partes = fechaLimpia.split('T');
                    if (partes.length === 2) {
                        const fechaPart = partes[0]; 
                        const horaPart = partes[1].substring(0, 5); 
                        fechaLimpia = `${fechaPart}T${horaPart}:00`;
                    }
                }

                return {
                    id: item.id,
                    title: `${pacienteNombre} - ${motivoConsulta} (${profNombre})`,
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

    const formatearFecha = (fechaISO) => {
        if (!fechaISO) return "";
        const fechaPart = fechaISO.split('T')[0];
        const [año, mes, día] = fechaPart.split('-');
        return `${día}/${mes}/${año}`;
    };

    const enviarWhatsApp = (t) => {
        const telefono = t.pacientes?.telefono || ""; 
        const fechaFormateada = formatearFecha(t.fecha_hora);
        const horaFormateada = t.fecha_hora ? t.fecha_hora.split('T')[1]?.substring(0, 5) || '' : '';
        const pacienteNombre = t.pacientes ? `${t.pacientes.nombre} ${t.pacientes.apellido}` : 'Paciente';
        const mensaje = `Hola ${pacienteNombre}, te recordamos tu turno para el día ${fechaFormateada} a las ${horaFormateada}. ¿Confirmas tu asistencia?`;
        window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    // Filtrado avanzado de turnos para la vista de listado
    const turnosFiltradosListado = turnosCrudos.filter(t => {
        if (!t.pacientes) return false;
        
        const dniMatch = t.pacientes.dni?.toLowerCase().includes(busquedaDni.toLowerCase());
        const nombreMatch = `${t.pacientes.nombre} ${t.pacientes.apellido}`.toLowerCase().includes(busquedaDni.toLowerCase());
        const busquedaMatch = dniMatch || nombreMatch;

        // Filtro por profesional específico
        const profesionalMatch = filtroProfesionalId ? t.profesionales?.id === filtroProfesionalId : true;

        // Filtro por fecha específica seleccionada en el input de fecha
        const turnoFechaStr = t.fecha_hora ? t.fecha_hora.split('T')[0] : '';
        const fechaMatch = filtroFecha ? turnoFechaStr === filtroFecha : true;

        if (filtroFecha) {
            return fechaMatch && profesionalMatch && busquedaMatch;
        }

        if (subVistaListado === 'hoy') {
            const hoyStr = new Date().toISOString().split('T')[0];
            return turnoFechaStr === hoyStr && profesionalMatch && busquedaMatch;
        }

        return profesionalMatch && busquedaMatch;
    });

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
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 max-w-7xl mx-auto space-y-6">
            {/* Cabecera / Título y Botón adaptable */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Módulo de Turnos Médicos</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Agenda general de citas y disponibilidad de atención.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Botones para alternar Vista Calendario / Listado */}
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        <button 
                            onClick={() => setVistaActiva('calendario')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                vistaActiva === 'calendario' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            📅 Calendario
                        </button>
                        <button 
                            onClick={() => setVistaActiva('listado')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                vistaActiva === 'listado' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            📋 Listado
                        </button>
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
                        className="bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <span>+ Nuevo Turno</span>
                    </button>
                </div>
            </div>

            {/* Contenido Condicional según la Vista Activa */}
            {vistaActiva === 'calendario' ? (
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
            ) : (
                <div className="space-y-4">
                    {/* Barra de controles y filtros del Listado */}
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={() => { setSubVistaListado('hoy'); setFiltroFecha(''); }} 
                                className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                                    subVistaListado === 'hoy' && !filtroFecha ? 'bg-terracota-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                            >
                                TURNOS DE HOY
                            </button>
                            <button 
                                onClick={() => { setSubVistaListado('todos'); setFiltroFecha(''); }} 
                                className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                                    subVistaListado === 'todos' && !filtroFecha ? 'bg-terracota-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                            >
                                TODOS LOS TURNOS
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                            {/* Selector de Profesional */}
                            <select 
                                value={filtroProfesionalId}
                                onChange={(e) => setFiltroProfesionalId(e.target.value)}
                                className="p-2 border border-gray-300 rounded-xl text-xs w-full sm:w-48 focus:ring-2 focus:ring-terracota-500 outline-none bg-white font-medium text-gray-700"
                            >
                                <option value="">👨‍⚕️ Todos los profesionales</option>
                                {profesionales.map(p => (
                                    <option key={p.id} value={p.id}>
                                        Dr./a. {p.nombre} {p.apellido} ({p.especialidad})
                                    </option>
                                ))}
                            </select>

                            {/* Filtro por Fecha Específica */}
                            <div className="flex items-center gap-1 w-full sm:w-auto">
                                <input 
                                    type="date"
                                    value={filtroFecha}
                                    onChange={(e) => setFiltroFecha(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-xl text-xs w-full sm:w-auto focus:ring-2 focus:ring-terracota-500 outline-none bg-white font-medium text-gray-700"
                                />
                                {filtroFecha && (
                                    <button 
                                        onClick={() => setFiltroFecha('')}
                                        title="Limpiar fecha"
                                        className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>

                            {/* Buscador por DNI o Paciente */}
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar por DNI o paciente..." 
                                value={busquedaDni}
                                onChange={(e) => setBusquedaDni(e.target.value)}
                                className="p-2 border border-gray-300 rounded-xl text-xs w-full sm:w-56 focus:ring-2 focus:ring-terracota-500 outline-none bg-white"
                            />
                        </div>
                    </div>

                    {/* Tabla de Listado */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs">
                        {turnosFiltradosListado.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 font-medium italic text-sm">
                                No se encontraron turnos activos con los filtros seleccionados.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                                            <th className="p-4">Fecha / Hora</th>
                                            <th className="p-4">Paciente</th>
                                            <th className="p-4">Profesional</th>
                                            <th className="p-4">Motivo</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {turnosFiltradosListado.map((t) => {
                                            const fechaFmt = formatearFecha(t.fecha_hora);
                                            const horaFmt = t.fecha_hora ? t.fecha_hora.split('T')[1]?.substring(0, 5) || '' : '';
                                            const profNombre = t.profesionales ? `Dr./a. ${t.profesionales.nombre} ${t.profesionales.apellido}` : 'No asignado';
                                            return (
                                                <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="p-4 font-bold text-xs text-gray-800">
                                                        <span className="block text-[10px] text-gray-400">{fechaFmt}</span>
                                                        {horaFmt} hs
                                                    </td>
                                                    <td className="p-4 text-xs font-semibold uppercase text-gray-700">
                                                        {t.pacientes ? `${t.pacientes.apellido}, ${t.pacientes.nombre}` : 'Sin datos'}
                                                        <div className="text-[10px] text-gray-400 font-normal">DNI: {t.pacientes?.dni || '-'}</div>
                                                    </td>
                                                    <td className="p-4 text-xs font-medium text-blue-600">
                                                        {profNombre}
                                                    </td>
                                                    <td className="p-4 text-xs text-gray-600 max-w-xs truncate">{t.motivo || 'Consulta general'}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                            t.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                                            t.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {t.estado}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center space-x-2">
                                                        <button 
                                                            onClick={() => {
                                                                setTurnoIdSeleccionado(t.id);
                                                                setIsModalDetalleOpen(true);
                                                            }}
                                                            className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-terracota-500 hover:text-white transition-all uppercase cursor-pointer"
                                                        >
                                                            Gestionar
                                                        </button>
                                                        <button 
                                                            onClick={() => enviarWhatsApp(t)}
                                                            className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-all uppercase cursor-pointer"
                                                        >
                                                            WP
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

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