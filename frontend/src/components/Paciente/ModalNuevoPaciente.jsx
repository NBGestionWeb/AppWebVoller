import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';

function ModalNuevoPaciente({ isOpen, onClose, onPacienteGuardado, pacienteAEditar }) {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        fecha_nacimiento: '',
        genero: '',
        telefono: '',
        email: '',
        direccion: '',
        obra_social: '',
        nro_afiliado: '',
        derivado_por: '', 
        contacto_emergencia: '',
        observaciones: '',
        estado: 'Activo'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (pacienteAEditar) {
            setFormData({
                nombre: pacienteAEditar.nombre || '',
                apellido: pacienteAEditar.apellido || '',
                dni: pacienteAEditar.dni || '',
                fecha_nacimiento: pacienteAEditar.fecha_nacimiento || '',
                genero: pacienteAEditar.genero || '',
                telefono: pacienteAEditar.telefono || '',
                email: pacienteAEditar.email || '',
                direccion: pacienteAEditar.direccion || '',
                obra_social: pacienteAEditar.obra_social || '',
                nro_afiliado: pacienteAEditar.nro_afiliado || '',
                derivado_por: pacienteAEditar.derivado_por || '',
                contacto_emergencia: pacienteAEditar.contacto_emergencia || '',
                observaciones: pacienteAEditar.observaciones || '',
                estado: pacienteAEditar.estado || 'Activo'
            });
        } else {
            setFormData({
                nombre: '',
                apellido: '',
                dni: '',
                fecha_nacimiento: '',
                genero: '',
                telefono: '',
                email: '',
                direccion: '',
                obra_social: '',
                nro_afiliado: '',
                derivado_por: '',
                contacto_emergencia: '',
                observaciones: '',
                estado: 'Activo'
            });
        }
        setError('');
    }, [pacienteAEditar, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let data, errorSupabase;

            if (pacienteAEditar) {
                const response = await supabase
                    .from('pacientes')
                    .update(formData)
                    .eq('id', pacienteAEditar.id)
                    .select();
                
                data = response.data;
                errorSupabase = response.error;
            } else {
                const response = await supabase
                    .from('pacientes')
                    .insert([formData])
                    .select();
                
                data = response.data;
                errorSupabase = response.error;
            }

            if (errorSupabase) throw errorSupabase;

            if (onPacienteGuardado) {
                onPacienteGuardado(data[0]);
            }

            onClose();
        } catch (err) {
            if (err.code === '23505') {
                setError('Ya existe otro paciente registrado con este DNI.');
            } else {
                setError(err.message || 'Ocurrió un error al guardar el paciente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden my-4 sm:my-8 flex flex-col max-h-[90vh]">
                
                {/* Header fijo */}
                <div className="bg-terracota-500 px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="text-base sm:text-lg font-bold truncate pr-2">
                        {pacienteAEditar ? 'Editar Información del Paciente' : 'Registrar Nuevo Paciente'}
                    </h3>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-2xl font-bold cursor-pinter p-1 leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Contenido scrolleable */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs sm:text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Estado del Paciente */}
                    <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl border border-gray-100">
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Estado del Paciente *</label>
                        <select 
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm bg-white font-medium text-gray-800"
                        >
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* 1. Datos Personales */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">1. Datos Personales</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre(s) *</label>
                                <input 
                                    type="text" 
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: Juan Carlos"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Apellido(s) *</label>
                                <input 
                                    type="text" 
                                    name="apellido"
                                    value={formData.apellido}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">DNI / Cédula *</label>
                                <input 
                                    type="text" 
                                    name="dni"
                                    value={formData.dni}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: 35123456"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                                <input 
                                    type="date" 
                                    name="fecha_nacimiento"
                                    value={formData.fecha_nacimiento}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm text-gray-700 bg-white"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Género / Sexo</label>
                                <select 
                                    name="genero"
                                    value={formData.genero}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm bg-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* 2. Datos de Contacto */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">2. Datos de Contacto</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono / Celular *</label>
                                <input 
                                    type="tel" 
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: 1122334455"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Domicilio / Dirección</label>
                                <input 
                                    type="text" 
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Calle, número, localidad"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* 3. Información Médica y Cobertura */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">3. Información Médica y Cobertura</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Obra Social / Prepaga</label>
                                <input 
                                    type="text" 
                                    name="obra_social"
                                    value={formData.obra_social}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: OSDE, Swiss Medical..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Número de Afiliado</label>
                                <input 
                                    type="text" 
                                    name="nro_afiliado"
                                    value={formData.nro_afiliado}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Nro de credencial"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Derivado por</label>
                                <input 
                                    type="text" 
                                    name="derivado_por"
                                    value={formData.derivado_por}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: Dr. Gómez / Hospital X"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contacto de Emergencia</label>
                                <input 
                                    type="text" 
                                    name="contacto_emergencia"
                                    value={formData.contacto_emergencia}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Nombre y teléfono de un familiar"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones / Alergias / Antecedentes</label>
                                <textarea 
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-sm"
                                    placeholder="Ej: Alérgico a la penicilina..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción fijos o al final del scroll */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-5 py-2.5 bg-terracota-500 text-white rounded-lg text-sm font-medium hover:bg-terracota-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : (pacienteAEditar ? 'Guardar Cambios' : 'Guardar Paciente')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default ModalNuevoPaciente;