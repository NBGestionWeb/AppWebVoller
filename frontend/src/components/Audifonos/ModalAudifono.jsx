import React, { useState, useEffect } from 'react';
import { supabase } from "../../config/supabase";

const ModalAudifono = ({ isOpen, onClose, onSave, audifonoAEditar }) => {
    const [formData, setFormData] = useState({
        modelo: '',
        tipo_operacion: '',
        tipo: '',
        serie: '',
        oido: '',
        paciente_id: '',
        fechaEntrega: '',
        estado: 'pendiente'
    });

    const [listaPacientes, setListaPacientes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);

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
        }
    }, [isOpen]);

    useEffect(() => {
        if (audifonoAEditar) {
            setFormData({
                modelo: audifonoAEditar.modelo || '',
                tipo_operacion: audifonoAEditar.tipo_operacion || '',
                tipo: audifonoAEditar.tipo || '',
                serie: audifonoAEditar.serie || '',
                oido: audifonoAEditar.oido || '',
                paciente_id: audifonoAEditar.paciente_id || audifonoAEditar.paciente?.id || '',
                fechaEntrega: audifonoAEditar.fechaEntrega || '',
                estado: audifonoAEditar.estado ? audifonoAEditar.estado.toLowerCase() : 'pendiente'
            });

            // Manejo seguro para poblar el buscador si viene un objeto paciente o el nombre directo
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
                tipo: '', 
                serie: '', 
                oido: '', 
                paciente_id: '', 
                fechaEntrega: '', 
                estado: 'pendiente' 
            });
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

    const pacientesFiltrados = listaPacientes.filter(p => 
        `${p.nombre || ''} ${p.apellido || ''} ${p.dni || ''}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSave) {
            onSave({
                ...formData,
                oido: formData.oido ? formData.oido.toLowerCase() : '',
                estado: formData.estado ? formData.estado.toLowerCase() : 'pendiente',
                paciente: pacienteSeleccionado || busqueda
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-auto">
                
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
                    {/* Cuerpo del Formulario con scroll optimizado */}
                    <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm"
                                    name="modelo" 
                                    value={formData.modelo} 
                                    onChange={handleChange} 
                                    placeholder="Ej. Phonak Audéo Lumity"
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Operación</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm bg-white"
                                    name="tipo_operacion" 
                                    value={formData.tipo_operacion} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="Reparación">Reparación</option>
                                    <option value="Venta">Venta</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm bg-white"
                                    name="tipo" 
                                    value={formData.tipo} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="RIC">RIC</option>
                                    <option value="BTE">BTE</option>
                                    <option value="ITE">ITE</option>
                                    <option value="CIC">CIC</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm"
                                    name="serie" 
                                    value={formData.serie} 
                                    onChange={handleChange} 
                                    placeholder="Ej. SN-987654"
                                    required 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm"
                                    value={busqueda}
                                    onChange={(e) => {
                                        setBusqueda(e.target.value);
                                        setPacienteSeleccionado(null);
                                        setFormData({...formData, paciente_id: ''});
                                    }}
                                    placeholder="Buscar paciente..."
                                    required 
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Oído</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm bg-white"
                                    name="oido" 
                                    value={formData.oido} 
                                    onChange={handleChange} 
                                    required
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Entrega</label>
                                <input 
                                    type="date" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm"
                                    name="fechaEntrega" 
                                    value={formData.fechaEntrega} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracota-500 focus:border-transparent text-sm bg-white"
                                    name="estado" 
                                    value={formData.estado} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="terminado">Terminado</option>
                                    <option value="entregado">Entregado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción (Se apilan en celulares para mayor comodidad táctil) */}
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
                            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-terracota-500 hover:bg-terracota-600 rounded-lg transition-colors cursor-pointer text-center shadow-xs"
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