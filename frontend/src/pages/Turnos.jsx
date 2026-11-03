import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import { usePermisos } from '../hooks/usePermisos';
import ModalNuevoTurno from '../components/Turnos/ModalNuevoTurno';
import ModalDetalleTurno from '../components/Turnos/ModalDetalleTurno';

function Turnos() {
    const { tienePermiso, loadingPermisos } = usePermisos();

    const [turnosCrudos, setTurnosCrudos] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [disponibilidadesProfesionales, setDisponibilidadesProfesionales] = useState([]);
    const [licenciasProfesionales, setLicenciasProfesionales] = useState([]);
    
    // Estado para alternar la vista principal ('grilla' o 'listado')
    const [vistaActiva, setVistaActiva] = useState('grilla');
    
    // Subvista de la grilla ('dia', 'semana', 'mes')
    const [modoGrilla, setModoGrilla] = useState('dia');
    
    const [subVistaListado, setSubVistaListado] = useState('hoy');
    const [busquedaDni, setBusquedaDni] = useState('');
    const [filtroProfesionalId, setFiltroProfesionalId] = useState('');
    
    // Fecha seleccionada para la grilla
    const [fechaGrilla, setFechaGrilla] = useState(new Date().toISOString().split('T')[0]);

    // Estados para el Modal de Día Completo en vista mes
    const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState(null);
    const [isModalDiaOpen, setIsModalDiaOpen] = useState(false);

    // Estados para los modales de creación y detalle
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [turnoIdSeleccionado, setTurnoIdSeleccionado] = useState(null);

    useEffect(() => {
        cargarDatosAuxiliares();
        cargarTurnos();
    }, []);

    const cargarDatosAuxiliares = async () => {
        try {
            const [resProf, resDisp, resLic] = await Promise.all([
                supabase.from('profesionales').select('id, nombre, apellido, especialidad'),
                supabase.from('disponibilidad_profesionales').select('*'),
                supabase.from('eventos_calendario').select('*').not('profesional_id', 'is', null)
            ]);

            if (resProf.error) throw resProf.error;
            if (resDisp.error) throw resDisp.error;
            if (resLic.error) throw resLic.error;

            setProfesionales(resProf.data || []);
            setDisponibilidadesProfesionales(resDisp.data || []);
            setLicenciasProfesionales(resLic.data || []);
        } catch (err) {
            console.error('Error al cargar datos auxiliares:', err.message);
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
            setTurnosCrudos(data || []);
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

    const obtenerLunesDeLaSemana = (d) => {
        const [anio, mes, dia] = d.split('-');
        const fecha = new Date(anio, Number(mes) - 1, Number(dia));
        const diaSemana = fecha.getDay();
        const diff = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
        return new Date(fecha.setDate(diff)).toISOString().split('T')[0];
    };

    const sumarDias = (fechaStr, dias) => {
        const [anio, mes, dia] = fechaStr.split('-');
        const result = new Date(anio, Number(mes) - 1, Number(dia) + dias);
        return result.toISOString().split('T')[0];
    };

    const manejarNavegacion = (direccion) => {
        const [anio, mes, dia] = fechaGrilla.split('-').map(Number);
        const fechaObj = new Date(anio, mes - 1, dia);

        if (modoGrilla === 'dia') {
            fechaObj.setDate(fechaObj.getDate() + direccion);
        } else if (modoGrilla === 'semana') {
            fechaObj.setDate(fechaObj.getDate() + (direccion * 7));
        } else if (modoGrilla === 'mes') {
            fechaObj.setMonth(fechaObj.getMonth() + direccion);
        }

        setFechaGrilla(fechaObj.toISOString().split('T')[0]);
    };

    const horasGrilla = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00'
    ];

    const esHoraPasada = (fechaStr, horaStr) => {
        const ahora = new Date();
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        const [hora, min] = horaStr.split(':').map(Number);
        const fechaHoraCelda = new Date(anio, mes - 1, dia, hora, min);
        return fechaHoraCelda < ahora;
    };

    const obtenerProfesionalesDisponiblesParaHora = (fechaStr, horaStr) => {
        const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [anio, mes, dia] = fechaStr.split('-');
        const fechaObj = new Date(anio, Number(mes) - 1, Number(dia));
        const nombreDiaSemana = diasNombres[fechaObj.getDay()];

        return profesionales.filter(prof => {
            const disp = disponibilidadesProfesionales.find(
                d => d.profesional_id === prof.id && d.dia_semana === nombreDiaSemana
            );
            if (!disp) return false;

            const horaInicio = disp.hora_inicio.slice(0, 5);
            const horaFin = disp.hora_fin.slice(0, 5);
            if (horaStr < horaInicio || horaStr >= horaFin) return false;

            const deLicencia = licenciasProfesionales.some(lic => {
                if (lic.profesional_id !== prof.id) return false;
                const fIni = lic.fecha_inicio ? lic.fecha_inicio.split('T')[0] : '';
                const fFin = lic.fecha_fin ? lic.fecha_fin.split('T')[0] : fIni;
                return fechaStr >= fIni && fechaStr <= fFin;
            });

            return !deLicencia;
        });
    };

    const obtenerProfesionalesDisponiblesParaDia = (fechaStr) => {
        const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [anio, mes, dia] = fechaStr.split('-');
        const fechaObj = new Date(anio, Number(mes) - 1, Number(dia));
        const nombreDiaSemana = diasNombres[fechaObj.getDay()];

        return profesionales.filter(prof => {
            const atiendeDia = disponibilidadesProfesionales.some(
                d => d.profesional_id === prof.id && d.dia_semana === nombreDiaSemana
            );
            if (!atiendeDia) return false;

            const deLicencia = licenciasProfesionales.some(lic => {
                if (lic.profesional_id !== prof.id) return false;
                const fIni = lic.fecha_inicio ? lic.fecha_inicio.split('T')[0] : '';
                const fFin = lic.fecha_fin ? lic.fecha_fin.split('T')[0] : fIni;
                return fechaStr >= fIni && fechaStr <= fFin;
            });

            return !deLicencia;
        });
    };

    const profesionalesDelDia = obtenerProfesionalesDisponiblesParaDia(fechaGrilla);

    const turnosFiltradosListado = turnosCrudos.filter(t => {
        if (!t.pacientes) return false;
        const dniMatch = t.pacientes.dni?.toLowerCase().includes(busquedaDni.toLowerCase());
        const nombreMatch = `${t.pacientes.nombre} ${t.pacientes.apellido}`.toLowerCase().includes(busquedaDni.toLowerCase());
        const busquedaMatch = dniMatch || nombreMatch;

        const profesionalMatch = filtroProfesionalId ? t.profesionales?.id === filtroProfesionalId : true;
        const turnoFechaStr = t.fecha_hora ? t.fecha_hora.split('T')[0] : '';
        const hoyStr = new Date().toISOString().split('T')[0];

        if (subVistaListado === 'hoy') {
            return turnoFechaStr === hoyStr && profesionalMatch && busquedaMatch;
        }

        return turnoFechaStr >= hoyStr && profesionalMatch && busquedaMatch;
    });

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Módulo de Turnos Médicos</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Agenda con profesionales filtrados según días, horarios, licencias y navegación rápida.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        <button 
                            onClick={() => setVistaActiva('grilla')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                vistaActiva === 'grilla' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            📊 Grilla Interactiva
                        </button>
                        <button 
                            onClick={() => setVistaActiva('listado')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                vistaActiva === 'listado' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            📋 Listado General
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            if (!loadingPermisos && !tienePermiso('carga_turnos')) {
                                alert('No cuentas con permisos para agendar nuevos turnos.');
                                return;
                            }
                            const hoyStr = new Date().toISOString().split('T')[0];
                            const fechaDefault = fechaGrilla < hoyStr ? hoyStr : fechaGrilla;
                            setFechaSeleccionada(`${fechaDefault}T09:00`);
                            setIsModalNuevoOpen(true);
                        }}
                        disabled={!loadingPermisos && !tienePermiso('carga_turnos')}
                        className="bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <span>+ Nuevo Turno</span>
                    </button>
                </div>
            </div>

            {/* VISTA 1: GRILLA INTERACTIVA */}
            {vistaActiva === 'grilla' ? (
                <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setModoGrilla('dia')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                    modoGrilla === 'dia' ? 'bg-terracota-500 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                📅 Vista Día
                            </button>
                            <button
                                onClick={() => setModoGrilla('semana')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                    modoGrilla === 'semana' ? 'bg-terracota-500 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                📆 Vista Semana
                            </button>
                            <button
                                onClick={() => setModoGrilla('mes')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                    modoGrilla === 'mes' ? 'bg-terracota-500 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                🗓️ Vista Mes
                            </button>
                        </div>

                        {/* CONTROLES DE FECHA CON FLECHAS DE NAVEGACIÓN */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 uppercase">Referencia Fecha:</span>
                            <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-2xs">
                                <button
                                    onClick={() => manejarNavegacion(-1)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer border-r border-gray-300"
                                    title="Anterior"
                                >
                                    &larr; Anterior
                                </button>
                                <input 
                                    type="date"
                                    value={fechaGrilla}
                                    onChange={(e) => setFechaGrilla(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-white font-medium outline-none text-center"
                                />
                                <button
                                    onClick={() => manejarNavegacion(1)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer border-l border-gray-300"
                                    title="Siguiente"
                                >
                                    Siguiente &rarr;
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* A. VISTA DÍA */}
                    {modoGrilla === 'dia' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                            {profesionalesDelDia.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 text-sm italic">
                                    No hay profesionales disponibles programados para atender en esta fecha.
                                </div>
                            ) : (
                                <table className="w-full border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700">
                                            <th className="p-3 border-r border-gray-200 w-24 text-center">Hora</th>
                                            {profesionalesDelDia.map(prof => (
                                                <th key={prof.id} className="p-3 border-r border-gray-200 text-center bg-terracota-50/50">
                                                    <div className="font-bold text-gray-800 text-sm">Dr./a. {prof.nombre} {prof.apellido}</div>
                                                    <div className="text-[11px] text-terracota-600 font-semibold">{prof.especialidad}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-xs">
                                        {horasGrilla.map((hora) => {
                                            const profsDisponiblesEnHora = obtenerProfesionalesDisponiblesParaHora(fechaGrilla, hora);
                                            const esPasado = esHoraPasada(fechaGrilla, hora);

                                            return (
                                                <tr key={hora} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-3 border-r border-gray-200 font-bold text-gray-500 text-center bg-gray-50">
                                                        {hora} hs
                                                    </td>
                                                    {profesionalesDelDia.map(prof => {
                                                        const estaDisponibleAhora = profsDisponiblesEnHora.some(p => p.id === prof.id);

                                                        if (!estaDisponibleAhora) {
                                                            return (
                                                                <td key={prof.id} className="p-2 border-r border-gray-200 align-middle text-center bg-gray-100/60">
                                                                    <span className="text-[10px] text-gray-400 font-medium italic">No disponible</span>
                                                                </td>
                                                            );
                                                        }

                                                        const turnosEnFranja = turnosCrudos.filter(t => {
                                                            if (!t.fecha_hora) return false;
                                                            const [fPart, hPart] = t.fecha_hora.split('T');
                                                            const hCorta = hPart ? hPart.substring(0, 5) : '';
                                                            return fPart === fechaGrilla && t.profesionales?.id === prof.id && hCorta === hora;
                                                        });

                                                        return (
                                                            <td key={prof.id} className="p-2 border-r border-gray-200 align-top min-w-[200px]">
                                                                {esPasado ? (
                                                                    <div className="h-10 w-full rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 italic">
                                                                        Horario pasado
                                                                    </div>
                                                                ) : turnosEnFranja.length === 0 ? (
                                                                    <div 
                                                                        onClick={() => {
                                                                            if (!loadingPermisos && !tienePermiso('carga_turnos')) return;
                                                                            setFechaSeleccionada(`${fechaGrilla}T${hora}`);
                                                                            setIsModalNuevoOpen(true);
                                                                        }}
                                                                        className="h-12 w-full rounded-lg border border-dashed border-gray-200 hover:border-terracota-400 hover:bg-terracota-50/30 transition-all cursor-pointer flex items-center justify-center text-[10px] text-gray-400 font-medium"
                                                                    >
                                                                        + Dar turno
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {turnosEnFranja.map(turno => (
                                                                            <div 
                                                                                key={turno.id}
                                                                                onClick={() => {
                                                                                    setTurnoIdSeleccionado(turno.id);
                                                                                    setIsModalDetalleOpen(true);
                                                                                }}
                                                                                className={`p-2.5 rounded-xl border shadow-xs cursor-pointer transition-transform hover:scale-[1.01] ${
                                                                                    turno.estado === 'confirmado' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                                                                                    turno.estado === 'cancelado' ? 'bg-red-50 border-red-300 text-red-900' :
                                                                                    'bg-blue-50 border-blue-300 text-blue-900'
                                                                                }`}
                                                                            >
                                                                                <div className="font-bold text-xs uppercase flex justify-between items-center">
                                                                                    <span>👤 {turno.pacientes?.apellido}, {turno.pacientes?.nombre}</span>
                                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                                                                        turno.estado === 'confirmado' ? 'bg-emerald-200 text-emerald-800' :
                                                                                        turno.estado === 'cancelado' ? 'bg-red-200 text-red-800' :
                                                                                        'bg-blue-200 text-blue-800'
                                                                                    }`}>
                                                                                        {turno.estado}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-[11px] font-semibold mt-1 text-gray-800 bg-white/80 px-2 py-1 rounded border border-black/5">
                                                                                    🩺 {turno.motivo || 'Consulta general'}
                                                                                </div>
                                                                                <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                                                                                    <span>DNI: {turno.pacientes?.dni || '-'}</span>
                                                                                    <span className="text-terracota-600 font-bold hover:underline">Gestionar &rarr;</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* B. VISTA SEMANA */}
                    {modoGrilla === 'semana' && (() => {
                        const lunesStr = obtenerLunesDeLaSemana(fechaGrilla);
                        const diasSemana = [0, 1, 2, 3, 4, 5].map(i => sumarDias(lunesStr, i));
                        const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

                        return (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                                <table className="w-full border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700">
                                            <th className="p-3 border-r border-gray-200 w-24 text-center">Hora</th>
                                            {diasSemana.map((diaStr, idx) => (
                                                <th key={diaStr} className="p-3 border-r border-gray-200 text-center bg-terracota-50/50">
                                                    <div className="font-bold text-gray-800 text-sm">{nombresDias[idx]}</div>
                                                    <div className="text-[11px] text-terracota-600 font-semibold">{formatearFecha(diaStr)}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-xs">
                                        {horasGrilla.map((hora) => (
                                            <tr key={hora} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-3 border-r border-gray-200 font-bold text-gray-500 text-center bg-gray-50">
                                                    {hora} hs
                                                </td>
                                                {diasSemana.map(diaStr => {
                                                    const esPasado = esHoraPasada(diaStr, hora);
                                                    const turnosEnDiaHora = turnosCrudos.filter(t => {
                                                        if (!t.fecha_hora) return false;
                                                        const [fPart, hPart] = t.fecha_hora.split('T');
                                                        const hCorta = hPart ? hPart.substring(0, 5) : '';
                                                        return fPart === diaStr && hCorta === hora;
                                                    });

                                                    return (
                                                        <td key={diaStr} className="p-2 border-r border-gray-200 align-top min-w-[160px]">
                                                            {!esPasado && (
                                                                <div 
                                                                    onClick={() => {
                                                                        if (!loadingPermisos && !tienePermiso('carga_turnos')) return;
                                                                        setFechaSeleccionada(`${diaStr}T${hora}`);
                                                                        setIsModalNuevoOpen(true);
                                                                    }}
                                                                    className="mb-1.5 py-1 w-full rounded border border-dashed border-gray-300 hover:border-terracota-500 hover:bg-terracota-50/40 transition-all cursor-pointer flex items-center justify-center text-[10px] text-terracota-600 font-bold bg-white"
                                                                >
                                                                    + Turno
                                                                </div>
                                                            )}

                                                            {turnosEnDiaHora.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    {turnosEnDiaHora.map(turno => (
                                                                        <div 
                                                                            key={turno.id}
                                                                            onClick={() => {
                                                                                setTurnoIdSeleccionado(turno.id);
                                                                                setIsModalDetalleOpen(true);
                                                                            }}
                                                                            className={`p-2 rounded-lg border shadow-xs cursor-pointer transition-colors ${
                                                                                turno.estado === 'confirmado' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                                                                                turno.estado === 'cancelado' ? 'bg-red-50 border-red-300 text-red-900' :
                                                                                'bg-blue-50 border-blue-200 text-blue-900'
                                                                            }`}
                                                                        >
                                                                            <div className="font-bold text-[11px] truncate">
                                                                                👤 {turno.pacientes?.apellido}, {turno.pacientes?.nombre}
                                                                            </div>
                                                                            <div className="text-[10px] text-gray-700 truncate">
                                                                                🩺 {turno.motivo || 'Consulta'}
                                                                            </div>
                                                                            <div className="text-[9px] text-terracota-600 font-semibold truncate">
                                                                                👨‍⚕️ Dr./a. {turno.profesionales?.apellido || 'N/D'}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}

                    {/* C. VISTA MES */}
                    {modoGrilla === 'mes' && (() => {
                        const [anio, mes, dia] = fechaGrilla.split('-');
                        const primerDiaMes = new Date(anio, Number(mes) - 1, 1);
                        const ultimoDiaMes = new Date(anio, Number(mes), 0);
                        const diasEnMes = ultimoDiaMes.getDate();
                        const diaInicioSemana = primerDiaMes.getDay() === 0 ? 6 : primerDiaMes.getDay() - 1;

                        const celdasMes = [];
                        for (let i = 0; i < diaInicioSemana; i++) celdasMes.push(null);
                        for (let d = 1; d <= diasEnMes; d++) {
                            const mesFmt = String(mes).padStart(2, '0');
                            const diaFmt = String(d).padStart(2, '0');
                            celdasMes.push(`${anio}-${mesFmt}-${diaFmt}`);
                        }

                        const nombresDiasCortos = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

                        return (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm p-4">
                                <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-xs text-gray-600 bg-gray-100 p-2 rounded-lg">
                                    {nombresDiasCortos.map(n => <div key={n}>{n}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {celdasMes.map((fechaDia, idx) => {
                                        if (!fechaDia) return <div key={`vacio-${idx}`} className="h-32 bg-gray-50/40 rounded-xl"></div>;

                                        const turnosDelDia = turnosCrudos.filter(t => t.fecha_hora && t.fecha_hora.split('T')[0] === fechaDia);

                                        return (
                                            <div 
                                                key={fechaDia} 
                                                className="h-32 border border-gray-200 rounded-xl p-2 flex flex-col justify-between bg-white hover:border-terracota-400 transition-all overflow-y-auto"
                                            >
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-gray-700">{fechaDia.split('-')[2]}</span>
                                                    <button
                                                        onClick={() => {
                                                            setFechaGrilla(fechaDia);
                                                            setModoGrilla('dia');
                                                        }}
                                                        className="text-[10px] text-terracota-600 font-bold hover:underline cursor-pointer"
                                                        title="Ver día en detalle"
                                                    >
                                                        Ver día
                                                    </button>
                                                </div>

                                                <div className="space-y-1 my-1 flex-1 overflow-y-auto pr-0.5">
                                                    {turnosDelDia.slice(0, 2).map(t => (
                                                        <div 
                                                            key={t.id}
                                                            onClick={() => {
                                                                setTurnoIdSeleccionado(t.id);
                                                                setIsModalDetalleOpen(true);
                                                            }}
                                                            className="text-[10px] bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 truncate cursor-pointer font-medium"
                                                        >
                                                            {t.fecha_hora.split('T')[1].substring(0, 5)} - {t.pacientes?.apellido} ({t.motivo || 'Consulta'})
                                                        </div>
                                                    ))}
                                                    {turnosDelDia.length > 2 && (
                                                        <button
                                                            onClick={() => {
                                                                setDiaSeleccionadoModal(fechaDia);
                                                                setIsModalDiaOpen(true);
                                                            }}
                                                            className="w-full text-center text-[10px] bg-terracota-50 text-terracota-700 font-bold py-1 rounded hover:bg-terracota-100 transition-colors cursor-pointer border border-terracota-200"
                                                        >
                                                            +{turnosDelDia.length - 2} más (Ver todos)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            ) : (
                /* VISTA 2: LISTADO GENERAL */
                <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={() => setSubVistaListado('hoy')} 
                                className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                                    subVistaListado === 'hoy' ? 'bg-terracota-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                            >
                                TURNOS DE HOY
                            </button>
                            <button 
                                onClick={() => setSubVistaListado('todos')} 
                                className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                                    subVistaListado === 'todos' ? 'bg-terracota-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                            >
                                TODOS LOS TURNOS
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
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

                            <input 
                                type="text" 
                                placeholder="🔍 Buscar por DNI o paciente..." 
                                value={busquedaDni}
                                onChange={(e) => setBusquedaDni(e.target.value)}
                                className="p-2 border border-gray-300 rounded-xl text-xs w-full sm:w-56 focus:ring-2 focus:ring-terracota-500 outline-none bg-white"
                            />
                        </div>
                    </div>

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
                                            <th className="p-4">Motivo / Obra Social</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {turnosFiltradosListado.map((t) => {
                                            const fechaFmt = formatearFecha(t.fecha_hora);
                                            const horaFmt = t.fecha_hora ? t.fecha_hora.split('T')[1]?.substring(0, 5) || '' : '';
                                            const profNombre = t.profesionales ? `Dr./a. {t.profesionales.nombre} {t.profesionales.apellido}` : 'No asignado';
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
                                                    <td className="p-4 text-xs text-gray-600 max-w-xs">{t.motivo || 'Consulta general'}</td>
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

            {/* MODAL DESPLEGABLE PARA VER TODOS LOS TURNOS DE UN DÍA EN EL MES */}
            {isModalDiaOpen && diaSeleccionadoModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden my-auto max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-5 py-4 bg-terracota-500 text-white flex justify-between items-center">
                            <h3 className="text-base font-bold">Turnos del día {formatearFecha(diaSeleccionadoModal)}</h3>
                            <button 
                                onClick={() => setIsModalDiaOpen(false)}
                                className="text-white/80 hover:text-white text-2xl font-bold cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 text-sm">
                            {turnosCrudos
                                .filter(t => t.fecha_hora && t.fecha_hora.split('T')[0] === diaSeleccionadoModal)
                                .map(turno => (
                                    <div 
                                        key={turno.id}
                                        onClick={() => {
                                            setIsModalDiaOpen(false);
                                            setTurnoIdSeleccionado(turno.id);
                                            setIsModalDetalleOpen(true);
                                        }}
                                        className="p-3 rounded-xl border bg-gray-50 hover:bg-blue-50/50 border-gray-200 shadow-2xs cursor-pointer transition-colors flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="font-bold text-xs text-terracota-600">
                                                🕒 {turno.fecha_hora.split('T')[1].substring(0, 5)} hs
                                            </div>
                                            <div className="font-semibold text-gray-800 text-sm">
                                                👤 {turno.pacientes?.apellido}, {turno.pacientes?.nombre}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                🩺 {turno.motivo || 'Consulta general'} | 👨‍⚕️ Dr./a. {turno.profesionales?.apellido || 'N/D'}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 hover:underline">Gestionar &rarr;</span>
                                    </div>
                                ))}
                        </div>
                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setIsModalDiaOpen(false)}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ModalNuevoTurno
                isOpen={isModalNuevoOpen}
                onClose={() => setIsModalNuevoOpen(false)}
                onTurnoCreado={cargarTurnos}
                fechaSeleccionada={fechaSeleccionada}
            />

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