import React, { useState, useEffect } from 'react';
import { supabase } from "../../config/supabase";
import { usePermisos } from '../../hooks/usePermisos';
import toast from 'react-hot-toast';

const ModalAudifono = ({ isOpen, onClose, onSave, audifonoAEditar }) => {
    const { tienePermiso, loadingPermisos } = usePermisos();

    // Pestaña activa dentro del modal ('general' or 'reparaciones')
    const [pestanaActiva, setPestanaActiva] = useState('general');

    const [formData, setFormData] = useState({
        modelo: '',
        tipo_operacion: '', 
        modalidad_entrega: '', 
        tipo: '',
        serie: '',
        oido: '',
        paciente_id: '',
        fechaEntrega: '',
        estado: 'pendiente',
        observaciones: ''
    });

    // Catálogo oficial de Bernafon y ReSound
    const catalogoModelos = [
        { marca: 'Bernafon', modelos: ['Entra A 1 105', 'Viron 1 105', 'Viron MNR', 'Viron MNT TR', 'Leox 3SP', 'Alpha MNB', 'Alpha MNR TR', 'Alpha CIC', 'Alpha ITC', 'Cross MNR', 'Cargador'] },
        { marca: 'ReSound', modelos: ['Key 177', 'Key 188', 'Key 267', 'Key 261', 'Key 361', 'Key 377', 'Key 298', 'Key 398', 'Key 461', 'LT 777', 'EQ 588', 'RT 761', 'Cargador'] }
    ];

    // Estado para manejar múltiples registros de envíos a laboratorio
    const [reparaciones, setReparaciones] = useState([]);

    const [listaPacientes, setListaPacientes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [errorPermiso, setErrorPermiso] = useState('');

    useEffect(() => {
        if (isOpen) {
            const fetchPacientes = async () => {
                const { data } = await supabase
                    .from('pacientes')
                    .select('id, nombre, apellido, dni')
                    .order('apellido');
                setListaPacientes(data || []);
            };
            fetchPacientes();
            setErrorPermiso('');
            setPestanaActiva('general');
        }
    }, [isOpen]);

    useEffect(() => {
        if (audifonoAEditar) {
            setFormData({
                modelo: audifonoAEditar.modelo || '',
                tipo_operacion: audifonoAEditar.tipo_operacion || '',
                modalidad_entrega: audifonoAEditar.modalidad_entrega || '',
                tipo: audifonoAEditar.tipo || '',
                serie: audifonoAEditar.serie || '',
                oido: audifonoAEditar.oido || '',
                paciente_id: audifonoAEditar.paciente_id || audifonoAEditar.paciente?.id || '',
                fechaEntrega: audifonoAEditar.fechaEntrega || audifonoAEditar.fecha_entrega || '',
                estado: audifonoAEditar.estado ? audifonoAEditar.estado.toLowerCase() : 'pendiente',
                observaciones: audifonoAEditar.observaciones || ''
            });

            // CORRECCIÓN: Aseguramos que se carguen las reparaciones existentes al editar
            setReparaciones(audifonoAEditar.reparaciones || []);

            if (audifonoAEditar.paciente) {
                if (typeof audifonoAEditar.paciente === 'object' && audifonoAEditar.paciente !== null) {
                    const nombreCompleto = `${audifonoAEditar.paciente.nombre || ''} ${audifonoAEditar.paciente.apellido || ''}`.trim();
                    setBusqueda(nombreCompleto);
                    setPacienteSeleccionado(audifonoAEditar.paciente);
                } else if (typeof audifonoAEditar.paciente === 'string') {
                    setBusqueda(audifonoAEditar.paciente);
                }
            }
        } else {
            setFormData({ 
                modelo: '', 
                tipo_operacion: '',
                modalidad_entrega: '',
                tipo: '', 
                serie: '', 
                oido: '', 
                paciente_id: '', 
                fechaEntrega: '', 
                estado: 'pendiente',
                observaciones: '' 
            });
            setReparaciones([]);
            setBusqueda('');
            setPacienteSeleccionado(null);
        }
    }, [audifonoAEditar, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const agregarReparacion = () => {
        setReparaciones([
            ...reparaciones,
            { fecha_envio: '', informe: '', costo: '', fecha_devolucion: '' }
        ]);
    };

    const actualizarReparacion = (index, campo, valor) => {
        const nuevasReparaciones = [...reparaciones];
        nuevasReparaciones[index][campo] = valor;
        setReparaciones(nuevasReparaciones);
    };

    const eliminarReparacion = (index) => {
        const nuevasReparaciones = reparaciones.filter((_, i) => i !== index);
        setReparaciones(nuevasReparaciones);
    };

    const pacientesFiltrados = listaPacientes.filter(p => 
        `${p.nombre || ''} ${p.apellido || ''} ${p.dni || ''}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorPermiso('');

        if (!loadingPermisos && !tienePermiso('carga_audifonos')) {
            const mensaje = audifonoAEditar 
                ? 'No se puede editar porque no tiene los permisos necesarios.' 
                : 'No cuentas con permisos para registrar o modificar audífonos.';
            setErrorPermiso(mensaje);
            toast.error(mensaje);
            return;
        }

        if (onSave) {
            onSave({
                ...formData,
                oido: formData.oido ? formData.oido.toLowerCase() : '',
                estado: formData.estado ? formData.estado.toLowerCase() : 'pendiente',
                paciente: pacienteSeleccionado || busqueda,
                reparaciones: reparaciones // Enviamos todas las reparaciones cargadas sin importar si el tipo cambió
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-auto">
                
                {/* Cabecera del Modal */}
                <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 pr-2">
                        {audifonoAEditar ? 'Editar Audífono' : 'Nuevo Registro de Audífono'}
                    </h3>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer p-1 -mr-1"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    
                    {/* Sistema de Solapas / Pestañas internas (visible para Reparación o si ya tiene historial cargado) */}
                    {(formData.tipo_operacion === 'Reparación' || reparaciones.length > 0) && (
                        <div className="flex border-b border-gray-200 bg-gray-50 px-4 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setPestanaActiva('general')}
                                className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 cursor-pointer transition-colors ${
                                    pestanaActiva === 'general' 
                                        ? 'border-terracota-500 text-terracota-600 bg-white' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                📋 Datos Generales
                            </button>
                            <button
                                type="button"
                                onClick={() => setPestanaActiva('reparaciones')}
                                className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                                    pestanaActiva === 'reparaciones' 
                                        ? 'border-terracota-500 text-terracota-600 bg-white' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                🛠️ Historial de Laboratorio ({reparaciones.length})
                            </button>
                        </div>
                    )}

                    {/* Cuerpo del Formulario con scroll optimizado */}
                    <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto">
                        
                        {errorPermiso && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs sm:text-sm text-red-700">
                                {errorPermiso}
                            </div>
                        )}

                        {/* PESTAÑA 1: DATOS GENERALES */}
                        <div style={{ display: pestanaActiva === 'general' ? 'block' : 'none' }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo / Catálogo *</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm bg-white"
                                        name="modelo" 
                                        value={formData.modelo} 
                                        onChange={handleChange} 
                                        required={pestanaActiva === 'general'}
                                    >
                                        <option value="">Seleccionar del catálogo...</option>
                                        {catalogoModelos.map((cat, idx) => (
                                            <optgroup key={idx} label={`--- ${cat.marca} ---`}>
                                                {cat.modelos.map((mod, i) => {
                                                    const nombreModeloCompleto = `${cat.marca} ${mod}`;
                                                    return (
                                                        <option key={i} value={nombreModeloCompleto}>
                                                            {nombreModeloCompleto}
                                                        </option>
                                                    );
                                                })}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Operación *</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm bg-white"
                                        name="tipo_operacion" 
                                        value={formData.tipo_operacion} 
                                        onChange={handleChange} 
                                        required={pestanaActiva === 'general'}
                                    >
                                        <option value="">Seleccionar operación...</option>
                                        <option value="Entrega">Entrega</option>
                                        <option value="Reparación">Reparación</option>
                                        <option value="Ajuste / Calibración">Ajuste / Calibración</option>
                                        <option value="Garantía">Cambios en Garantía</option>
                                    </select>
                                </div>
                            </div>

                            {/* Si es Entrega, mostramos la modalidad */}
                            {formData.tipo_operacion === 'Entrega' && (
                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                    <label className="block text-sm font-medium text-emerald-900 mb-1">Modalidad de Entrega *</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm bg-white"
                                        name="modalidad_entrega" 
                                        value={formData.modalidad_entrega} 
                                        onChange={handleChange} 
                                        required={formData.tipo_operacion === 'Entrega' && pestanaActiva === 'general'}
                                    >
                                        <option value="">Seleccionar modalidad...</option>
                                        <option value="Particular">Particular</option>
                                        <option value="Obra Social">Obra Social</option>
                                        <option value="Otras">Otras</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm bg-white"
                                        name="tipo" 
                                        value={formData.tipo} 
                                        onChange={handleChange} 
                                        required={pestanaActiva === 'general'}
                                    >
                                        <option value="">Seleccionar tipo...</option>
                                        <option value="RIC">RIC</option>
                                        <option value="BTE">BTE</option>
                                        <option value="ITE">ITE</option>
                                        <option value="CIC">CIC</option>
                                        <option value="Cargador">Cargador</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie *</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm"
                                        name="serie" 
                                        value={formData.serie} 
                                        onChange={handleChange} 
                                        placeholder="Ej. SN-987654"
                                        required={pestanaActiva === 'general'} 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm"
                                        value={busqueda}
                                        onChange={(e) => {
                                            setBusqueda(e.target.value);
                                            setPacienteSeleccionado(null);
                                            setFormData({...formData, paciente_id: ''});
                                        }}
                                        placeholder="Buscar paciente..."
                                        required={pestanaActiva === 'general'} 
                                    />
                                    {busqueda && !pacienteSeleccionado && pacientesFiltrados.length > 0 && (
                                        <ul className="absolute z-20 w-full bg-white border border-gray-200 mt-1 max-h-40 overflow-y-auto rounded-lg shadow-lg">
                                            {pacientesFiltrados.map(p => (
                                                <li 
                                                    key={p.id}
                                                    className="px-3 py-2.5 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-50 last:border-none"
                                                    onClick={() => {
                                                        setPacienteSeleccionado(p);
                                                        setBusqueda(`${p.nombre} ${p.apellido}`);
                                                        setFormData({...formData, paciente_id: p.id});
                                                    }}
                                                >
                                                    {p.nombre} {p.apellido} - {p.dni}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Oído *</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm bg-white"
                                        name="oido" 
                                        value={formData.oido} 
                                        onChange={handleChange} 
                                        required={pestanaActiva === 'general'}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Derecho">Derecho</option>
                                        <option value="Izquierdo">Izquierdo</option>
                                        <option value="Ambos">Ambos (Binural)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Registro / Entrega *</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm"
                                        name="fechaEntrega" 
                                        value={formData.fechaEntrega} 
                                        onChange={handleChange} 
                                        required={pestanaActiva === 'general'} 
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 text-sm bg-white"
                                        name="estado" 
                                        value={formData.estado} 
                                        onChange={handleChange} 
                                        required={pestanaActiva === 'general'}
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="terminado">Terminado</option>
                                        <option value="entregado">Entregado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* PESTAÑA 2: HISTORIAL DE REPARACIONES / LABORATORIO */}
                        <div style={{ display: pestanaActiva === 'reparaciones' ? 'block' : 'none' }} className="space-y-4">
                            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-200">
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900 uppercase">Envíos Múltiples a Laboratorio</h4>
                                    <p className="text-[11px] text-amber-700">Registra cada vez que el audífono deba ser enviado a revisión técnica.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={agregarReparacion}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                                >
                                    + Agregar Envío
                                </button>
                            </div>

                            {reparaciones.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 italic text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    No hay registros de laboratorio cargados. Haz clic en &quot;+ Agregar Envío&quot; para registrar uno.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {reparaciones.map((rep, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 relative">
                                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                                <span className="text-xs font-bold text-gray-700 uppercase">Envío de Laboratorio #{index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarReparacion(index)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                                                >
                                                    🗑️ Eliminar este envío
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Fecha de Envío</label>
                                                    <input 
                                                        type="date"
                                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                                        value={rep.fecha_envio || ''}
                                                        onChange={(e) => actualizarReparacion(index, 'fecha_envio', e.target.value)}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Fecha de Devolución</label>
                                                    <input 
                                                        type="date"
                                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                                        value={rep.fecha_devolucion || ''}
                                                        onChange={(e) => actualizarReparacion(index, 'fecha_devolucion', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Costo de la Reparación ($)</label>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Ej. 15000"
                                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                                        value={rep.costo || ''}
                                                        onChange={(e) => actualizarReparacion(index, 'costo', e.target.value)}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Informe del Laboratorio</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="Ej. Cambio de receptor, limpieza profunda..."
                                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                                        value={rep.informe || ''}
                                                        onChange={(e) => actualizarReparacion(index, 'informe', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3.5 sm:py-4 bg-gray-50 border-t border-gray-100">
                        <button 
                            type="button" 
                            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-center" 
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={!loadingPermisos && !tienePermiso('carga_audifonos')}
                            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-terracota-500 hover:bg-terracota-600 rounded-lg transition-colors cursor-pointer text-center shadow-xs disabled:opacity-50"
                        >
                            {audifonoAEditar ? 'Guardar Cambios' : 'Guardar Audífono'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default ModalAudifono;