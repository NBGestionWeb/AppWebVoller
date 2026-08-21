import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';
import { usePermisos } from '../../hooks/usePermisos';

function ModalNuevoTurno({ isOpen, onClose, onTurnoCreado, fechaSeleccionada }) {
    const { tienePermiso, loadingPermisos } = usePermisos();

    const [profesionales, setProfesionales] = useState([]);
    const [profesionalesNoDisponibles, setProfesionalesNoDisponibles] = useState([]);
    
    // Estados para la validación y gestión del paciente por DNI
    const [dniInput, setDniInput] = useState('');
    const [pacienteEncontrado, setPacienteEncontrado] = useState(null);
    const [buscandoDni, setBuscandoDni] = useState(false);
    
    const [profesionalId, setProfesionalId] = useState('');
    
    // Separamos fecha y hora para un control exacto
    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('09:00');
    
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [mensajeAlerta, setMensajeAlerta] = useState(null);

    useEffect(() => {
        if (isOpen) {
            let fechaActual = '';
            if (fechaSeleccionada) {
                const [f, h] = fechaSeleccionada.split('T');
                if (f) fechaActual = f;
                if (h) setHora(h.slice(0, 5));
            } else {
                fechaActual = new Date().toISOString().split('T')[0];
                setHora('09:00');
            }
            setFecha(fechaActual);
            setDniInput('');
            setPacienteEncontrado(null);
            setProfesionalId('');
            setMotivo('');
            cargarDatosAuxiliares(fechaActual);
            setMensajeAlerta(null);
        }
    }, [isOpen, fechaSeleccionada]);

    useEffect(() => {
        if (fecha && profesionales.length > 0) {
            verificarDisponibilidadProfesionales(fecha);
        }
    }, [fecha, profesionales]);

    const cargarDatosAuxiliares = async (fechaConsulta) => {
        try {
            const { data: dataProfesionales, error: errProfesionales } = await supabase.from('profesionales').select('id, nombre, apellido, especialidad');
            if (errProfesionales) throw errProfesionales;
            setProfesionales(dataProfesionales || []);

            await verificarDisponibilidadProfesionales(fechaConsulta, dataProfesionales || []);
        } catch (err) {
            console.error('Error al cargar datos para el turno:', err.message);
        }
    };

    const handleValidarDni = async (e) => {
        e.preventDefault();
        setMensajeAlerta(null);

        if (!dniInput.trim()) {
            setMensajeAlerta({ texto: 'Por favor ingrese un número de DNI para buscar.', tipo: 'error' });
            return;
        }

        setBuscandoDni(true);
        try {
            const { data, error } = await supabase
                .from('pacientes')
                .select('id, nombre, apellido, dni')
                .eq('dni', dniInput.trim())
                .single();

            if (error || !data) {
                setPacienteEncontrado(null);
                setMensajeAlerta({ 
                    texto: 'No se encontró ningún paciente registrado con ese DNI.', 
                    tipo: 'error' 
                });
            } else {
                setPacienteEncontrado(data);
                setMensajeAlerta({ 
                    texto: `Paciente validado: ${data.nombre} ${data.apellido}`, 
                    tipo: 'success' 
                });
            }
        } catch (err) {
            console.error('Error al buscar paciente por DNI:', err.message);
            setPacienteEncontrado(null);
            setMensajeAlerta({ texto: 'No se encontró un paciente con el DNI ingresado.', tipo: 'error' });
        } finally {
            setBuscandoDni(false);
        }
    };

    const verificarDisponibilidadProfesionales = async (fechaObj, listaProf = profesionales) => {
        try {
            const { data: licencias, error: errLicencias } = await supabase
                .from('eventos_calendario')
                .select('profesional_id, titulo, fecha_inicio, fecha_fin')
                .lte('fecha_inicio', fechaObj)
                .gte('fecha_fin', fechaObj)
                .not('profesional_id', 'is', null);

            if (errLicencias) throw errLicencias;

            const noDisponibles = (licencias || []).map(lic => {
                const prof = listaProf.find(p => p.id === lic.profesional_id);
                const fIni = lic.fecha_inicio ? lic.fecha_inicio.split('T')[0] : '';
                const fFin = lic.fecha_fin ? lic.fecha_fin.split('T')[0] : '';
                const fIniFmt = fIni ? new Date(fIni + 'T00:00:00').toLocaleDateString() : '';
                const fFinFmt = fFin ? new Date(fFin + 'T00:00:00').toLocaleDateString() : '';

                return {
                    id: lic.profesional_id,
                    nombreCompleto: prof ? `Dr./a ${prof.nombre} ${prof.apellido} (${prof.especialidad})` : 'Profesional',
                    motivo: lic.titulo || 'Licencia / Vacaciones',
                    desde: fIniFmt,
                    hasta: fFinFmt
                };
            });

            setProfesionalesNoDisponibles(noDisponibles);
        } catch (err) {
            console.error('Error al verificar disponibilidad de profesionales:', err.message);
        }
    };

    const validarDisponibilidadHoraria = async (profId, fechaSeleccionada, horaSeleccionada) => {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const fechaObj = new Date(fechaSeleccionada + 'T00:00:00');
        const nombreDia = dias[fechaObj.getDay()];

        const { data, error } = await supabase
            .from('disponibilidad_profesionales')
            .select('*')
            .eq('profesional_id', profId)
            .eq('dia_semana', nombreDia)
            .single();

        if (error || !data) {
            return { disponible: false, mensaje: `El profesional no atiende los días ${nombreDia}.` };
        }

        const horaInicio = data.hora_inicio.slice(0, 5);
        const horaFin = data.hora_fin.slice(0, 5);

        if (horaSeleccionada < horaInicio || horaSeleccionada >= horaFin) {
            return { 
                disponible: false, 
                mensaje: `Fuera de horario de atención. El profesional atiende de ${horaInicio} a ${horaFin} hs.` 
            };
        }

        return { disponible: true };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensajeAlerta(null);

        if (!loadingPermisos && !tienePermiso('carga_turnos')) {
            setMensajeAlerta({ texto: 'No cuentas con permisos para agendar nuevos turnos.', tipo: 'error' });
            return;
        }

        if (!pacienteEncontrado) {
            setMensajeAlerta({ texto: 'Debe validar un DNI de paciente existente antes de agendar.', tipo: 'error' });
            return;
        }

        if (!profesionalId || !fecha || !hora) {
            setMensajeAlerta({ texto: 'Por favor completa los campos obligatorios.', tipo: 'error' });
            return;
        }

        setLoading(true);
        try {
            const { data: licencias, error: errLicencias } = await supabase
                .from('eventos_calendario')
                .select('*')
                .eq('profesional_id', profesionalId)
                .lte('fecha_inicio', fecha)
                .gte('fecha_fin', fecha);

            if (errLicencias) throw errLicencias;

            if (licencias && licencias.length > 0) {
                setMensajeAlerta({ 
                    texto: 'El profesional seleccionado no se encuentra disponible en esta fecha por licencia o vacaciones.', 
                    tipo: 'error' 
                });
                setLoading(false);
                return;
            }

            const validacionHoraria = await validarDisponibilidadHoraria(profesionalId, fecha, hora);
            if (!validacionHoraria.disponible) {
                setMensajeAlerta({ texto: validacionHoraria.mensaje, tipo: 'error' });
                setLoading(false);
                return;
            }

            const fechaHoraCompleta = `${fecha}T${hora}:00`;

            const nuevoTurno = {
                paciente_id: pacienteEncontrado.id,
                profesional_id: profesionalId,
                fecha_hora: fechaHoraCompleta,
                motivo: motivo || 'Consulta general',
                estado: 'pendiente'
            };

            const { error } = await supabase.from('turnos').insert([nuevoTurno]);
            if (error) throw error;

            onTurnoCreado();
            onClose();
        } catch (err) {
            console.error('Error al guardar el turno:', err.message);
            setMensajeAlerta({ texto: 'Hubo un error al crear el turno: ' + err.message, tipo: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const horasDisponibles = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', 
        '18:00', '18:30', '19:00'
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
                
                {/* Cabecera del Modal */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">Nuevo Turno Médico</h3>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer p-1 leading-none"
                    >
                        &times;
                    </button>
                </div>
                
                {/* Cuerpo desplazable */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1">
                    {mensajeAlerta && (
                        <div className={`p-3 rounded-xl text-xs font-medium border flex justify-between items-center ${
                            mensajeAlerta.tipo === 'error' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            <span>{mensajeAlerta.texto}</span>
                            <button 
                                type="button"
                                onClick={() => setMensajeAlerta(null)} 
                                className="text-current font-bold ml-2 hover:opacity-70 cursor-pointer text-base"
                            >
                                &times;
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="form-nuevo-turno" className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">DNI del Paciente *</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text"
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-terracota-500"
                                    placeholder="Ingrese número de DNI..."
                                    value={dniInput}
                                    onChange={(e) => {
                                        setDniInput(e.target.value);
                                        if (pacienteEncontrado) {
                                            setPacienteEncontrado(null);
                                            setMensajeAlerta(null);
                                        }
                                    }}
                                />
                                <button 
                                    type="button"
                                    onClick={handleValidarDni}
                                    disabled={buscandoDni}
                                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap w-full sm:w-auto text-center"
                                >
                                    {buscandoDni ? 'Buscando...' : 'Validar DNI'}
                                </button>
                            </div>
                        </div>

                        {pacienteEncontrado ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <span className="font-semibold block">Paciente Validado Correctamente:</span>
                                    <span className="text-sm font-bold">{pacienteEncontrado.nombre} {pacienteEncontrado.apellido}</span>
                                    <span className="block text-gray-600">DNI: {pacienteEncontrado.dni}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setPacienteEncontrado(null);
                                        setDniInput('');
                                        setMensajeAlerta(null);
                                    }} 
                                    className="text-red-600 hover:underline font-medium text-xs cursor-pointer self-end sm:self-auto"
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-500 italic">
                                Ingrese el DNI y presione &quot;Validar DNI&quot; para habilitar la asignación del turno.
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Profesional *</label>
                            <select 
                                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-terracota-500"
                                value={profesionalId}
                                onChange={(e) => setProfesionalId(e.target.value)}
                                required
                            >
                                <option value="">Seleccione un profesional...</option>
                                {profesionales.map(pr => {
                                    const noDisp = profesionalesNoDisponibles.some(nd => nd.id === pr.id);
                                    return (
                                        <option key={pr.id} value={pr.id} disabled={noDisp}>
                                            Dr./a. {pr.nombre} {pr.apellido} ({pr.especialidad}) {noDisp ? '⚠️ [De licencia]' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                                <input 
                                    type="date" 
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-terracota-500 bg-white"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Hora (9 a 19 hs) *</label>
                                <select 
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-terracota-500"
                                    value={hora}
                                    onChange={(e) => setHora(e.target.value)}
                                    required
                                >
                                    {horasDisponibles.map(h => (
                                        <option key={h} value={h}>{h} hs</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1.5">
                            <span className="font-semibold text-amber-900 block flex items-center gap-1">
                                <span>⚠️ Profesionales ausentes en esta fecha:</span>
                            </span>
                            {profesionalesNoDisponibles.length === 0 ? (
                                <p className="text-amber-700/80 italic">Todos los profesionales están disponibles en esta fecha.</p>
                            ) : (
                                <ul className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                    {profesionalesNoDisponibles.map((item, index) => (
                                        <li key={index} className="bg-white/80 p-2 rounded-lg border border-amber-100 flex flex-col">
                                            <span className="font-bold text-gray-800">{item.nombreClient || item.nombreCompleto}</span>
                                            <span className="text-gray-500 text-xs">
                                                {item.motivo} ({item.desde} al {item.hasta})
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo / Observaciones</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-terracota-500"
                                placeholder="Ej. Control anual, dolor general..."
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                {/* Pie del Modal con botones adaptables */}
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer font-medium text-center transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="form-nuevo-turno"
                        disabled={loading || !pacienteEncontrado || (!loadingPermisos && !tienePermiso('carga_turnos'))}
                        className="w-full sm:w-auto px-5 py-2 bg-terracota-500 text-white rounded-lg text-sm hover:bg-terracota-600 disabled:opacity-50 cursor-pointer font-medium text-center transition-colors shadow-sm"
                    >
                        {loading ? 'Guardando...' : 'Agendar Turno'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalNuevoTurno;
