import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';

function ModalDetalleProfesional({ isOpen, onClose, profesional, onEditar, onAbrirDisponibilidad, rolUsuario }) {
    const [licencias, setLicencias] = useState([]);
    const [tipoLicencia, setTipoLicencia] = useState('vacaciones');
    const [motivoLicencia, setMotivoLicencia] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [guardando, setGuardando] = useState(false);
    
    // Estado para alertas visuales integradas (éxito/error)
    const [mensajeAlerta, setMensajeAlerta] = useState(null); // { texto: '', tipo: 'error' | 'success' }

    // Estado para manejar el modal de confirmación de eliminación personalizado
    const [idLicenciaAEliminar, setIdLicenciaAEliminar] = useState(null);

    // Permisos según el rol:
    // - administrador: puede crear/editar profesionales y gestionar licencias
    // - recepcionista: solo lectura (ver ficha, horarios y licencias sin modificar)
    const puedeGestionar = rolUsuario === 'administrador';

    useEffect(() => {
        if (isOpen && profesional?.id) {
            cargarLicenciasProfesional();
            // Limpiar formulario y alertas al abrir
            setMotivoLicencia('');
            setFechaInicio('');
            setFechaFin('');
            setMensajeAlerta(null);
            setIdLicenciaAEliminar(null);
        }
    }, [isOpen, profesional]);

    const cargarLicenciasProfesional = async () => {
        try {
            const { data, error } = await supabase
                .from('eventos_calendario')
                .select('*')
                .eq('profesional_id', profesional.id)
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;
            setLicencias(data || []);
        } catch (err) {
            console.error('Error al cargar licencias del profesional:', err.message);
        }
    };

    const handleCrearLicencia = async (e) => {
        e.preventDefault();
        if (!puedeGestionar) return;
        setMensajeAlerta(null);
        
        // Validación de fechas
        if (!fechaInicio || !fechaFin) {
            setMensajeAlerta({ texto: 'Por favor selecciona las fechas de inicio y fin.', tipo: 'error' });
            return;
        }

        if (new Date(fechaInicio) > new Date(fechaFin)) {
            setMensajeAlerta({ texto: 'La fecha de inicio no puede ser posterior a la fecha de fin.', tipo: 'error' });
            return;
        }

        setGuardando(true);
        try {
            const colores = {
                vacaciones: '#8B5CF6', // Violeta
                viaje: '#3B82F6',      // Azul
                feriado: '#F59E0B'     // Amarillo
            };

            const nuevaLicencia = {
                profesional_id: profesional.id,
                titulo: motivoLicencia || (tipoLicencia === 'vacaciones' ? 'Vacaciones' : 'Licencia / Viaje'),
                estado: tipoLicencia,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                color: colores[tipoLicencia] || '#8B5CF6'
            };

            const { error } = await supabase
                .from('eventos_calendario')
                .insert([nuevaLicencia]);

            if (error) throw error;

            // Limpiar y recargar lista
            setMotivoLicencia('');
            setFechaInicio('');
            setFechaFin('');
            await cargarLicenciasProfesional();
            setMensajeAlerta({ texto: 'Licencia o vacación registrada con éxito.', tipo: 'success' });
        } catch (err) {
            console.error('Error al registrar licencia:', err.message);
            setMensajeAlerta({ texto: 'Hubo un error al registrar la licencia: ' + err.message, tipo: 'error' });
        } finally {
            setGuardando(false);
        }
    };

    const confirmarEliminarLicencia = async () => {
        if (!puedeGestionar || !idLicenciaAEliminar) return;
        try {
            const { error } = await supabase
                .from('eventos_calendario')
                .delete()
                .eq('id', idLicenciaAEliminar);

            if (error) throw error;
            setIdLicenciaAEliminar(null);
            cargarLicenciasProfesional();
            setMensajeAlerta({ texto: 'Registro eliminado correctamente.', tipo: 'success' });
        } catch (err) {
            console.error('Error al eliminar licencia:', err.message);
            setIdLicenciaAEliminar(null);
            setMensajeAlerta({ texto: 'Error al eliminar el registro.', tipo: 'error' });
        }
    };

    if (!isOpen || !profesional) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden my-8 relative">
                
                {/* Modal de Confirmación Personalizado */}
                {puedeGestionar && idLicenciaAEliminar && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full text-center space-y-4 animate-scaleUp">
                            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                                !
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm mb-1">¿Estás seguro?</h4>
                                <p className="text-xs text-gray-500">¿Estás seguro de eliminar este registro de licencia/vacación?</p>
                            </div>
                            <div className="flex space-x-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIdLicenciaAEliminar(null)}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button"
                                    onClick={confirmarEliminarLicencia}
                                    className="flex-1 bg-terracota-500 hover:bg-terracota-600 text-white py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-terracota-500 px-6 py-4 flex justify-between items-center text-white">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold">Ficha del Profesional</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                profesional.estado === 'Inactivo' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                                {profesional.estado || 'Activo'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
                    {/* Alerta Visual Integrada */}
                    {mensajeAlerta && (
                        <div className={`p-3 rounded-xl text-xs font-medium border flex justify-between items-center animate-fadeIn ${
                            mensajeAlerta.tipo === 'error' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            <span>{mensajeAlerta.texto}</span>
                            <button 
                                onClick={() => setMensajeAlerta(null)} 
                                className="text-current font-bold ml-2 hover:opacity-70 cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>
                    )}

                    {/* Información General */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">1. Información General</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500">Nombre y Apellido</span>
                                <span className="font-semibold text-gray-800">{profesional.nombre} {profesional.apellido}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">DNI / Cédula</span>
                                <span className="font-semibold text-gray-800">{profesional.dni}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Especialidad</span>
                                <span className="font-semibold text-blue-600">{profesional.especialidad}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Matrícula</span>
                                <span className="font-semibold text-gray-800">{profesional.matricula}</span>
                            </div>
                        </div>
                    </div>

                    {/* Datos de Contacto */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">2. Datos de Contacto</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500">Teléfono / Celular</span>
                                <span className="font-semibold text-gray-800">{profesional.telefono}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Correo Electrónico</span>
                                <span className="text-gray-800">{profesional.email || 'No registrado'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Botón rápido para ir a la disponibilidad */}
                    <div className="bg-terracota-50 p-4 rounded-xl border border-terracota-100 flex justify-between items-center">
                        <div>
                            <h5 className="text-xs font-semibold text-terracota-900 uppercase">Disponibilidad Semanal</h5>
                            <p className="text-xs text-terracota-700">Consulta los días y horarios que atiende el profesional.</p>
                        </div>
                        <button 
                            onClick={() => {
                                onClose();
                                onAbrirDisponibilidad(profesional);
                            }}
                            className="bg-terracota-500 hover:bg-terracota-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                        >
                            Ver Horarios
                        </button>
                    </div>

                    {/* Gestión de Vacaciones y Licencias */}
                    <div className="border-t border-gray-100 pt-5">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">3. Licencias, Vacaciones y Ausencias</h4>
                        
                        {/* Formulario para agregar licencia (Solo Administrador) */}
                        {puedeGestionar && (
                            <form onSubmit={handleCrearLicencia} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                                        <select 
                                            value={tipoLicencia}
                                            onChange={(e) => setTipoLicencia(e.target.value)}
                                            className="w-full border border-gray-200 p-2 rounded-lg text-xs bg-white"
                                        >
                                            <option value="vacaciones"> Vacaciones</option>
                                            <option value="viaje"> Licencia / Viaje</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Motivo / Descripción</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Vacaciones de invierno..."
                                            value={motivoLicencia}
                                            onChange={(e) => setMotivoLicencia(e.target.value)}
                                            className="w-full border border-gray-200 p-2 rounded-lg text-xs bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Desde *</label>
                                        <input 
                                            type="date" 
                                            value={fechaInicio}
                                            onChange={(e) => setFechaInicio(e.target.value)}
                                            className="w-full border border-gray-200 p-2 rounded-lg text-xs bg-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Hasta *</label>
                                        <input 
                                            type="date" 
                                            value={fechaFin}
                                            onChange={(e) => setFechaFin(e.target.value)}
                                            className="w-full border border-gray-200 p-2 rounded-lg text-xs bg-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button 
                                        type="submit"
                                        disabled={guardando}
                                        className="bg-terracota-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {guardando ? 'Registrando...' : '+ Registrar Licencia / Vacación'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Listado de Licencias */}
                        <div className="space-y-2">
                            <span className="block text-xs font-medium text-gray-500">Historial de licencias programadas:</span>
                            {licencias.length === 0 ? (
                                <p className="text-xs text-gray-400 italic bg-gray-50/50 p-3 rounded-lg text-center">No hay licencias ni vacaciones registradas para este profesional.</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {licencias.map(lic => {
                                        // Extraer solo la parte YYYY-MM-DD para evitar desfases de zona horaria / horas
                                        const fechaIniStr = lic.fecha_inicio ? lic.fecha_inicio.split('T')[0] : '';
                                        const fechaFinStr = lic.fecha_fin ? lic.fecha_fin.split('T')[0] : '';

                                        const fIniFormatted = fechaIniStr ? new Date(fechaIniStr + 'T00:00:00').toLocaleDateString() : '';
                                        const fFinFormatted = fechaFinStr ? new Date(fechaFinStr + 'T00:00:00').toLocaleDateString() : '';

                                        return (
                                            <div key={lic.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-2xs text-xs">
                                                <div>
                                                    <span className="font-semibold text-gray-800 block">{lic.titulo}</span>
                                                    <span className="text-gray-500">
                                                        {fIniFormatted} al {fFinFormatted}
                                                    </span>
                                                </div>
                                                {puedeGestionar && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIdLicenciaAEliminar(lic.id)}
                                                        className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded cursor-pointer"
                                                    >
                                                        Eliminar
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
                    {puedeGestionar ? (
                        <button 
                            onClick={() => {
                                onClose();
                                onEditar(profesional);
                            }}
                            className="px-4 py-2 bg-terracota-500 text-white rounded-lg text-sm font-medium hover:bg-terracota-600 transition-colors cursor-pointer"
                        >
                            Editar Profesional
                        </button>
                    ) : (
                        <div></div>
                    )}
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalDetalleProfesional;