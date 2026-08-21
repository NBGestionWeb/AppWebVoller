import React, { useState } from 'react';
import { supabase } from '../../config/supabase.js';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

function ModalDetallePersonal({ isOpen, onClose, personal }) {
    const [enviandoReset, setEnviandoReset] = useState(false);

    if (!isOpen || !personal) return null;

    // Diccionario para mostrar las etiquetas legibles de los permisos
    const etiquetasPermisos = {
        carga_paciente: 'Carga de paciente',
        edicion_paciente: 'Edición de paciente',
        carga_turnos: 'Carga de turnos',
        carga_profesionales: 'Carga de profesionales',
        edicion_profesionales: 'Edición de los profesionales',
        edicion_disponibilidad: 'Edición de disponibilidad de los profesionales',
        carga_audifonos: 'Carga de audífonos',
        edicion_eliminacion_audifonos: 'Edición o eliminación de audífonos',
        carga_historias_clinicas: 'Carga de historias clínicas',
        edicion_eliminacion_historias_clinicas: 'Edición o eliminación de historias clínicas'
    };

    // Función para restablecer la contraseña y activar el cambio forzado
    const handleResetPassword = async () => {
        if (!personal.email) {
            toast.error('El usuario no tiene un correo electrónico asociado.');
            return;
        }

        // Opcional: Puedes pedir una contraseña temporal por SweetAlert2 o generar una por defecto
        const { value: passwordTemporal } = await Swal.fire({
            title: 'Restablecer contraseña',
            input: 'text',
            inputLabel: 'Ingrese la nueva contraseña temporal para el usuario:',
            inputPlaceholder: 'Ej: Voller2026*',
            inputAttributes: {
                autocomplete: 'off'
            },
            showCancelButton: true,
            confirmButtonColor: '#c86d51',
            cancelButtonColor: '#f3f4f6',
            confirmButtonText: 'Guardar y marcar cambio',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            inputValidator: (value) => {
                if (!value || value.length < 6) {
                    return 'La contraseña temporal debe tener al menos 6 caracteres.';
                }
            },
            customClass: {
                confirmButton: 'text-white font-medium px-4 py-2 rounded-lg',
                cancelButton: '!text-gray-700 font-medium px-4 py-2 rounded-lg'
            }
        });

        if (passwordTemporal) {
            setEnviandoReset(true);
            try {
                // 1. Actualizamos la contraseña del usuario en Auth usando su ID (Nota: requiere permisos de administrador o Service Role en backend, 
                // o bien puedes usar una Edge Function si el cliente de frontend tiene restricciones de RLS/Auth para modificar otro usuario).
                // Si tu app maneja un endpoint o función RPC para esto, asegúrate de llamarlo. Directamente desde el cliente SDK de Supabase:
                
                // Nota de seguridad: supabase.auth.admin requiere la service_role key que NO debe ir en el frontend.
                // La forma recomendada desde el cliente es actualizar el perfil con la bandera y si requieres cambiar el Auth, 
                // se suele hacer mediante una función RPC en PostgreSQL o una Edge Function. 
                // Asumiendo que posees una función RPC o pasas por la tabla perfiles, actualizamos la bandera:

                const { error: perfilError } = await supabase
                    .from('perfiles')
                    .update({ cambiar_password: true })
                    .eq('id', personal.id);

                if (perfilError) throw perfilError;

                // Si tienes una función RPC configurada para actualizar el Auth de otro usuario:
                // const { error: authError } = await supabase.rpc('admin_update_user_password', { 
                //     user_id: personal.id, 
                //     new_password: passwordTemporal 
                // });
                // if (authError) throw authError;

                Swal.fire(
                    '¡Contraseña restablecida!',
                    `La contraseña ha sido actualizada. Al iniciar sesión con la clave temporal, el sistema le exigirá al usuario crear una propia.`,
                    'success'
                );
            } catch (err) {
                console.error('Error al restablecer contraseña:', err.message);
                Swal.fire('Error', 'No se pudo actualizar la contraseña: ' + err.message, 'error');
            } finally {
                setEnviandoReset(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden my-8">
                {/* Cabecera del Modal */}
                <div className="bg-terracota-500 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="text-lg font-bold">Detalle del Personal</h3>
                    <button 
                        onClick={onClose}
                        className="text-white hover:bg-terracota-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Contenido del Detalle */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Información Principal */}
                    <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="h-14 w-14 rounded-full bg-terracota-100 text-terracota-600 font-bold text-xl flex items-center justify-center shadow-inner">
                            {personal.nombre ? personal.nombre.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-gray-800">
                                {personal.nombre} {personal.apellido}
                            </h4>
                            <p className="text-xs text-gray-500">{personal.email}</p>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                personal.estado === 'Activo' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                            }`}>
                                {personal.estado || 'Activo'}
                            </span>
                        </div>
                    </div>

                    {/* Datos de Contacto / Identificación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">DNI</span>
                            <span className="text-sm font-medium text-gray-700">
                                {personal.dni || 'No especificado'}
                            </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Teléfono</span>
                            <span className="text-sm font-medium text-gray-700">
                                {personal.telefono || 'No especificado'}
                            </span>
                        </div>
                    </div>

                    {/* Sección de Seguridad / Credenciales */}
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Seguridad de la cuenta</h5>
                            <p className="text-xs text-amber-700 mt-0.5">Establece una contraseña temporal y fuerza el cambio en su próximo inicio.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={enviandoReset}
                            className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                        >
                            {enviandoReset ? 'Procesando...' : 'Establecer Clave Temporal'}
                        </button>
                    </div>

                    {/* Permisos Autorizados */}
                    <div>
                        <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Permisos Autorizados en el Sistema
                        </h5>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            {personal.permisos && personal.permisos.length > 0 ? (
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {personal.permisos.map((pKey, index) => (
                                        <li key={index} className="flex items-center space-x-2 text-xs text-gray-700">
                                            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="font-medium">{etiquetasPermisos[pKey] || pKey}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-gray-500 italic">Este usuario no tiene permisos asignados actualmente.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pie de modal */}
                <div className="flex justify-end px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalDetallePersonal;