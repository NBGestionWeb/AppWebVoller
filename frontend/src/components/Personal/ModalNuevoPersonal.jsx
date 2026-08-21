import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';
import toast from 'react-hot-toast';

function ModalNuevoPersonal({ isOpen, onClose, onPersonalGuardado, personalAEditar }) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');
    const [estado, setEstado] = useState('Activo');
    
    // Estado para los permisos requeridos
    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Permisos agrupados por módulo (actualizados según los nombres que exigen las vistas)
    const modulosPermisos = [
        {
            modulo: 'Pacientes',
            permisos: [
                { id: 'carga_paciente', label: 'Gestión / Carga de pacientes' },
                { id: 'edicion_paciente', label: 'Edición de paciente' }
            ]
        },
        {
            modulo: 'Historias Clínicas',
            permisos: [
                { id: 'carga_historias_clinicas', label: 'Carga de historias clínicas' },
                { id: 'edicion_eliminacion_historias_clinicas', label: 'Edición o eliminación de historias clínicas' }
            ]
        },
        {
            modulo: 'Turnos',
            permisos: [
                { id: 'carga_turnos', label: 'Carga de turnos' }
            ]
        },
        {
            modulo: 'Profesionales',
            permisos: [
                { id: 'carga_profesionales', label: 'Gestión / Carga de profesionales' },
                { id: 'edicion_profesionales', label: 'Edición de los profesionales' },
                { id: 'edicion_disponibilidad', label: 'Edición de disponibilidad' }
            ]
        },
        {
            modulo: 'Audífonos',
            permisos: [
                { id: 'carga_audifonos', label: 'Carga de audífonos' },
                { id: 'edicion_eliminacion_audifonos', label: 'Edición o eliminación de audífonos' }
            ]
        }
    ];

    useEffect(() => {
        if (personalAEditar) {
            setNombre(personalAEditar.nombre || '');
            setApellido(personalAEditar.apellido || '');
            setEmail(personalAEditar.email || '');
            setPassword(''); // Vacío por defecto al editar para no sobrescribir a menos que se escriba algo nuevo
            setDni(personalAEditar.dni || '');
            setTelefono(personalAEditar.telefono || '');
            setEstado(personalAEditar.estado || 'Activo');
            setPermisos(personalAEditar.permisos || []);
        } else {
            setNombre('');
            setApellido('');
            setEmail('');
            setPassword('');
            setDni('');
            setTelefono('');
            setEstado('Activo');
            setPermisos([]);
        }
        setError(null);
    }, [personalAEditar, isOpen]);

    if (!isOpen) return null;

    const handleCheckboxChange = (idPermiso) => {
        if (permisos.includes(idPermiso)) {
            setPermisos(permisos.filter(p => p !== idPermiso));
        } else {
            setPermisos([...permisos, idPermiso]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (personalAEditar) {
                // Lógica de actualización en la tabla personal
                const { data, error: updateError } = await supabase
                    .from('personal')
                    .update({
                        nombre,
                        apellido,
                        dni,
                        telefono,
                        estado,
                        permisos
                    })
                    .eq('id', personalAEditar.id)
                    .select()
                    .single();

                if (updateError) throw updateError;

                // Actualizar también en la tabla perfiles si existe
                await supabase
                    .from('perfiles')
                    .update({ nombre, apellido })
                    .eq('email', email);

                // Si el administrador introdujo una nueva contraseña, la gestionamos
                if (password && password.trim().length > 0) {
                    if (password.length < 6) {
                        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
                    }

                    const userIdTarget = personalAEditar.auth_user_id || personalAEditar.id;

                    // Llamamos a la función RPC para actualizar la contraseña en auth.users de forma segura
                    const { error: rpcError } = await supabase.rpc('admin_update_user_password', {
                        target_user_id: userIdTarget,
                        new_password: password
                    });

                    if (rpcError) throw rpcError;
                }

                toast.success('Personal actualizado correctamente');
                onPersonalGuardado(data);
            } else {
                // Guardamos la sesión actual del administrador antes de registrar al nuevo usuario
                const { data: currentSessionData } = await supabase.auth.getSession();
                const adminSession = currentSessionData?.session;

                // 1. Crear usuario en Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) throw authError;

                const userId = authData.user?.id;

                if (userId) {
                    // 2. Crear registro en la tabla 'perfiles' (para que funcione el rol y login)
                    const { error: perfilError } = await supabase
                        .from('perfiles')
                        .insert([{
                            id: userId,
                            nombre,
                            apellido,
                            email,
                            rol: 'empleado'
                        }]);

                    if (perfilError) {
                        console.error('Error al crear perfil:', perfilError.message);
                    }
                }

                // 3. Registrar en la tabla 'personal'
                const { data, error: insertError } = await supabase
                    .from('personal')
                    .insert([{
                        auth_user_id: userId,
                        nombre,
                        apellido,
                        email,
                        dni,
                        telefono,
                        estado,
                        permisos
                    }])
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Restauramos la sesión del administrador para que no pierda su acceso actual
                if (adminSession) {
                    await supabase.auth.setSession({
                        access_token: adminSession.access_token,
                        refresh_token: adminSession.refresh_token,
                    });
                }

                toast.success('Personal creado exitosamente');
                onPersonalGuardado(data);
            }

            onClose();
        } catch (err) {
            console.error('Error al guardar personal:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
                {/* Cabecera del Modal */}
                <div className="bg-terracota-500 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="text-lg font-bold">
                        {personalAEditar ? 'Editar Personal' : 'Nuevo Registro de Personal'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-white hover:bg-terracota-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                            <input 
                                type="text"
                                required
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none"
                                placeholder="Ej. Juan"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label>
                            <input 
                                type="text"
                                required
                                value={apellido}
                                onChange={(e) => setApellido(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none"
                                placeholder="Ej. Pérez"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Electrónico (Usuario) *</label>
                            <input 
                                type="email"
                                required
                                disabled={!!personalAEditar}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="correo@voller.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                {personalAEditar ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}
                            </label>
                            <input 
                                type="password"
                                required={!personalAEditar}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none"
                                placeholder={personalAEditar ? 'Dejar en blanco para mantener la actual' : '••••••••'}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">DNI</label>
                            <input 
                                type="text"
                                value={dni}
                                onChange={(e) => setDni(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none"
                                placeholder="Ej. 35123456"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                            <input 
                                type="text"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none"
                                placeholder="Ej. 1123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                            <select 
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-terracota-500 outline-none bg-white"
                            >
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    {/* Sección de Permisos Autorizados Agrupados por Módulo */}
                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                            Permisos Autorizados en el Sistema
                        </label>
                        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            {modulosPermisos.map((grupo, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <h4 className="text-[11px] font-bold text-terracota-600 uppercase tracking-wider border-b border-gray-200 pb-1">
                                        {grupo.modulo}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {grupo.permisos.map((permiso) => (
                                            <label 
                                                key={permiso.id} 
                                                className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-100/80 p-1.5 rounded-lg transition-colors"
                                            >
                                                <input 
                                                    type="checkbox"
                                                    checked={permisos.includes(permiso.id)}
                                                    onChange={() => handleCheckboxChange(permiso.id)}
                                                    className="rounded text-terracota-500 focus:ring-terracota-500 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="font-medium">{permiso.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-sm font-medium text-white bg-terracota-500 hover:bg-terracota-600 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : (personalAEditar ? 'Actualizar Personal' : 'Crear Personal')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ModalNuevoPersonal;