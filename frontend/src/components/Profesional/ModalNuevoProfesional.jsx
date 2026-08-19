import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';

function ModalNuevoProfesional({ isOpen, onClose, onProfesionalGuardado, profesionalAEditar }) {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        especialidad: '',
        matricula: '',
        telefono: '',
        email: '',
        estado: 'Activo'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (profesionalAEditar) {
            setFormData({
                nombre: profesionalAEditar.nombre || '',
                apellido: profesionalAEditar.apellido || '',
                dni: profesionalAEditar.dni || '',
                especialidad: profesionalAEditar.especialidad || '',
                matricula: profesionalAEditar.matricula || '',
                telefono: profesionalAEditar.telefono || '',
                email: profesionalAEditar.email || '',
                estado: profesionalAEditar.estado || 'Activo'
            });
        } else {
            setFormData({
                nombre: '',
                apellido: '',
                dni: '',
                especialidad: '',
                matricula: '',
                telefono: '',
                email: '',
                estado: 'Activo'
            });
        }
        setError('');
    }, [profesionalAEditar, isOpen]);

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

            if (profesionalAEditar) {
                const response = await supabase
                    .from('profesionales')
                    .update(formData)
                    .eq('id', profesionalAEditar.id)
                    .select();
                
                data = response.data;
                errorSupabase = response.error;
            } else {
                const response = await supabase
                    .from('profesionales')
                    .insert([formData])
                    .select();
                
                data = response.data;
                errorSupabase = response.error;
            }

            if (errorSupabase) throw errorSupabase;

            if (onProfesionalGuardado) {
                onProfesionalGuardado(data[0]);
            }

            onClose();
        } catch (err) {
            if (err.code === '23505') {
                setError('Ya existe un profesional registrado con este DNI o Matrícula.');
            } else {
                setError(err.message || 'Ocurrió un error al guardar el profesional.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-gray-100 overflow-hidden my-4 sm:my-8 relative">
                
                {/* Cabecera */}
                <div className="bg-terracota-500 px-5 sm:px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="text-base sm:text-lg font-bold pr-2">
                        {profesionalAEditar ? 'Editar Profesional' : 'Registrar Nuevo Profesional'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-2xl font-bold cursor-pointer p-1 shrink-0"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto text-sm">

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs sm:text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Estado */}
                    <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl border border-gray-100">
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Estado *</label>
                        <select 
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm bg-white font-medium text-gray-800"
                        >
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* Datos Personales */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">1. Datos Personales</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre(s) *</label>
                                <input 
                                    type="text" 
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm"
                                    placeholder="Ej: Roberto"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm"
                                    placeholder="Ej: Gómez"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">DNI / Cédula *</label>
                                <input 
                                    type="text" 
                                    name="dni"
                                    value={formData.dni}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm"
                                    placeholder="Ej: 28123456"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Datos Profesionales y Contacto */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">2. Datos Profesionales y Contacto</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Especialidad / Perfil *</label>
                                <select 
                                    name="especialidad"
                                    value={formData.especialidad}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm bg-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Otorrinos">Otorrinos</option>
                                    <option value="Externos">Externos</option>
                                    <option value="Técnicos Völler">Técnicos Völler</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Matrícula *</label>
                                <input 
                                    type="text" 
                                    name="matricula"
                                    value={formData.matricula}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm"
                                    placeholder="Ej: MN 12345"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono / Celular *</label>
                                <input 
                                    type="tel" 
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 সংশোধন-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm rounded-lg"
                                    placeholder="Ej: 1155443322"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 outline-none text-xs sm:text-sm"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pie del Modal */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer text-center"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-5 py-2.5 bg-terracota-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-terracota-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50 text-center"
                        >
                            {loading ? 'Guardando...' : (profesionalAEditar ? 'Guardar Cambios' : 'Guardar Profesional')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default ModalNuevoProfesional;