import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../../config/supabase.js';

const COLORES_ESTADOS = {
    disponible: '#10B981', 
    ocupado: '#EF4444',    
    feriado: '#F59E0B',    
    vacaciones: '#8B5CF6', 
    viaje: '#3B82F6'       
};

function CalendarioEstados() {
    const [eventos, setEventos] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [titulo, setTitulo] = useState('');
    const [estado, setEstado] = useState('vacaciones');
    const [profesionalId, setProfesionalId] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    useEffect(() => {
        cargarEventos();
        cargarProfesionales();
    }, []);

    const cargarProfesionales = async () => {
        try {
            const { data, error } = await supabase.from('profesionales').select('id, nombre, apellido, especialidad');
            if (error) throw error;
            setProfesionales(data || []);
        } catch (err) {
            console.error('Error al cargar profesionales:', err.message);
        }
    };

    const cargarEventos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('eventos_calendario')
                .select('*');

            if (error) throw error;

            const eventosFormatados = data.map(item => ({
                id: item.id,
                title: item.titulo,
                start: item.fecha_inicio,
                end: item.fecha_fin,
                backgroundColor: item.color,
                borderColor: item.color,
                extendedProps: { estado: item.estado, profesional_id: item.profesional_id }
            }));

            setEventos(eventosFormatados);
        } catch (err) {
            console.error('Error al cargar eventos del calendario:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSlot = (selectInfo) => {
        setFechaInicio(selectInfo.startStr.includes('T') ? selectInfo.startStr.slice(0, 16) : `${selectInfo.startStr}T09:00`);
        setFechaFin(selectInfo.endStr.includes('T') ? selectInfo.endStr.slice(0, 16) : `${selectInfo.endStr}T19:00`);
        setTitulo('');
        setEstado('vacaciones');
        setProfesionalId('');
        setIsModalOpen(true);
    };

    const handleGuardarEvento = async (e) => {
        e.preventDefault();
        try {
            const nuevoEvento = {
                titulo: titulo || estado.toUpperCase(),
                estado,
                profesional_id: profesionalId || null,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin || fechaInicio,
                color: COLORES_ESTADOS[estado]
            };

            const { data, error } = await supabase
                .from('eventos_calendario')
                .insert([nuevoEvento])
                .select();

            if (error) throw error;

            const item = data[0];
            setEventos(prev => [...prev, {
                id: item.id,
                title: item.titulo,
                start: item.fecha_inicio,
                end: item.fecha_fin,
                backgroundColor: item.color,
                borderColor: item.color,
                extendedProps: { estado: item.estado, profesional_id: item.profesional_id }
            }]);

            setIsModalOpen(false);
            cargarEventos();
        } catch (err) {
            console.error('Error al guardar evento:', err.message);
            alert('Error al registrar el evento en el calendario.');
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
            {/* Cabecera y Leyenda */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Calendario y Disponibilidad</h2>
                    <p className="text-sm text-gray-500">Visualiza turnos, feriados, vacaciones y estados operativos.</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Disponible</span>
                    </span>
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        <span>Ocupado</span>
                    </span>
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span>Feriado</span>
                    </span>
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                        <span>Vacaciones</span>
                    </span>
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span>Viaje</span>
                    </span>
                </div>
            </div>

            {/* Contenedor del Calendario */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
                    editable={true}
                    selectable={true}
                    select={handleSelectSlot}
                    events={eventos}
                    height="700px"
                    dayMaxEvents={true}
                />
            </div>

            {/* Modal de Registro */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
                        <div className="bg-terracota-500 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="text-base font-bold">Registrar Estado en Calendario</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
                        </div>

                        <form onSubmit={handleGuardarEvento} className="p-6 space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                                <select 
                                    value={estado} 
                                    onChange={(e) => setEstado(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-terracota-500 focus:bg-white"
                                >
                                    <option value="disponible">🟢 Disponible</option>
                                    <option value="ocupado">🔴 Ocupado</option>
                                    <option value="feriado">🟡 Feriado</option>
                                    <option value="vacaciones">🟣 Vacaciones</option>
                                    <option value="viaje">🔵 Viaje</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Profesional (Opcional)</label>
                                <select 
                                    value={profesionalId} 
                                    onChange={(e) => setProfesionalId(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-terracota-500 focus:bg-white"
                                >
                                    <option value="">-- General / Todos --</option>
                                    {profesionales.map(pr => (
                                        <option key={pr.id} value={pr.id}>Dr./Dra. {pr.nombre} {pr.apellido} ({pr.especialidad})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Título / Motivo</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. Vacaciones, Congreso médico..." 
                                    value={titulo} 
                                    onChange={(e) => setTitulo(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-terracota-500 focus:bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Inicio</label>
                                    <input 
                                        type="datetime-local" 
                                        value={fechaInicio} 
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-xs outline-none focus:ring-2 focus:ring-terracota-500 focus:bg-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Fin</label>
                                    <input 
                                        type="datetime-local" 
                                        value={fechaFin} 
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-xs outline-none focus:ring-2 focus:ring-terracota-500 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2 bg-terracota-500 text-white rounded-xl text-sm font-medium hover:bg-terracota-600 shadow-sm cursor-pointer"
                                >
                                    Guardar Estado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarioEstados;