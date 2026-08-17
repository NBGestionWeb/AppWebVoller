import React from 'react';

function ModalDetallePaciente({ isOpen, onClose, paciente, onEditar }) {
    if (!isOpen || !paciente) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden my-8">
                
                {/* Cabecera */}
                <div className="bg-terracota-500 px-6 py-4 flex justify-between items-center text-white">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold">Ficha del Paciente</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                paciente.estado === 'Inactivo' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                                {paciente.estado || 'Activo'}
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

                {/* Contenido de la Ficha */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-sm">

                    {/* Datos Personales */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">1. Datos Personales</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500">Nombre y Apellido</span>
                                <span className="font-semibold text-gray-800">{paciente.nombre} {paciente.apellido}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">DNI / Cédula</span>
                                <span className="font-semibold text-gray-800">{paciente.dni}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Fecha de Nacimiento</span>
                                <span className="text-gray-800">{paciente.fecha_nacimiento || 'No registrada'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Género</span>
                                <span className="text-gray-800">{paciente.genero || 'No especificado'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Datos de Contacto */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">2. Datos de Contacto</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500">Teléfono / Celular</span>
                                <span className="font-semibold text-gray-800">{paciente.telefono}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Correo Electrónico</span>
                                <span className="text-gray-800">{paciente.email || 'No registrado'}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-xs text-gray-500">Dirección</span>
                                <span className="text-gray-800">{paciente.direccion || 'No registrada'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Información Médica */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">3. Información Médica y Cobertura</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500">Obra Social / Prepaga</span>
                                <span className="font-semibold text-blue-600">{paciente.obra_social || 'Particular'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Número de Afiliado</span>
                                <span className="text-gray-800">{paciente.nro_afiliado || '-'}</span>
                            </div>
                            {/* NUEVO CAMPO: Derivado por */}
                            <div className="md:col-span-2">
                                <span className="block text-xs text-gray-500">Derivado por</span>
                                <span className="font-medium text-gray-800">{paciente.derivado_por || 'No especificado'}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-xs text-gray-500">Contacto de Emergencia</span>
                                <span className="text-gray-800">{paciente.contacto_emergencia || 'No registrado'}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-xs text-gray-500">Observaciones / Alergias</span>
                                <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200 mt-1">
                                    {paciente.observaciones || 'Sin observaciones registradas.'}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Pie del Modal */}
                <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
                    <button 
                        onClick={() => {
                            onClose();
                            onEditar(paciente);
                        }}
                        className="px-4 py-2 bg-terracota-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        Editar Paciente
                    </button>
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

export default ModalDetallePaciente;