import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import ModalNuevoPaciente from '../components/Paciente/ModalNuevoPaciente.jsx';
import ModalDetallePaciente from '../components/Paciente/ModalDetallePaciente.jsx';
import ModalHistoriaClinica from '../components/Paciente/ModalHistoriaClinica.jsx';

function Pacientes({ rolUsuario }) {
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [isDetalleOpen, setIsDetalleOpen] = useState(false);
    const [pacienteAEditar, setPacienteAEditar] = useState(null);

    // Estados para la Historia Clínica
    const [isHistoriaOpen, setIsHistoriaOpen] = useState(false);
    const [pacienteParaHistoria, setPacienteParaHistoria] = useState(null);

    // Permisos según el rol
    const puedeCrearEditarPacientes = rolUsuario === 'administrador' || rolUsuario === 'recepcionista';

    const obtenerPacientes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pacientes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPacientes(data || []);
        } catch (error) {
            console.error('Error al cargar pacientes:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        obtenerPacientes();
    }, []);

    const handlePacienteGuardado = (pacienteGuardado) => {
        setPacientes(prev => {
            const existe = prev.some(p => p.id === pacienteGuardado.id);
            if (existe) {
                return prev.map(p => p.id === pacienteGuardado.id ? pacienteGuardado : p);
            } else {
                return [pacienteGuardado, ...prev];
            }
        });
    };

    const pacientesFiltrados = pacientes.filter(p => 
        `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            {/* Cabecera / Título y Botón */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestión de Pacientes</h2>
                    <p className="text-sm text-gray-500">Administra la información clínica y de contacto de los pacientes.</p>
                </div>
                {puedeCrearEditarPacientes && (
                    <button 
                        onClick={() => {
                            setPacienteAEditar(null);
                            setIsModalOpen(true);
                        }}
                        className="w-full sm:w-auto bg-terracota-500 hover:bg-terracota-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm flex items-center justify-center space-x-2"
                    >
                        <span>+ Nuevo Paciente</span>
                    </button>
                )}
            </div>

            {/* Buscador */}
            <div className="mb-6">
                <input 
                    type="text"
                    placeholder="Buscar por nombre, apellido o DNI..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:border-terracota-500 outline-none text-sm bg-white shadow-sm"
                />
            </div>

            {/* Contenido principal */}
            {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 text-sm">Cargando listado de pacientes...</div>
            ) : pacientesFiltrados.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 text-sm">No se encontraron pacientes registrados.</div>
            ) : (
                <>
                    {/* VISTA DE TARJETAS (Cards) - Solo visible en móviles y tablets chicas (md:hidden) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                        {pacientesFiltrados.map((paciente) => (
                            <div key={paciente.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-800 text-base">
                                            {paciente.nombre} {paciente.apellido}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            paciente.estado === 'Inactivo' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                        }`}>
                                            {paciente.estado || 'Activo'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{paciente.email || 'Sin correo electrónico'}</p>
                                    
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg">
                                        <div>
                                            <span className="font-semibold text-gray-500 block">DNI:</span>
                                            {paciente.dni}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-500 block">Teléfono:</span>
                                            {paciente.telefono || 'Sin teléfono'}
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <span className="font-semibold text-gray-500 block">Obra Social:</span>
                                            {paciente.obra_social ? (
                                                <span className="inline-block mt-0.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                                    {paciente.obra_social}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Particular</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <button 
                                        onClick={() => {
                                            setPacienteSeleccionado(paciente);
                                            setIsDetalleOpen(true);
                                        }}
                                        className="flex-1 text-terracota-600 hover:bg-terracota-50 font-medium text-xs cursor-pointer bg-terracota-50/50 py-2 rounded-lg transition-colors text-center border border-terracota-100"
                                    >
                                        Ver Ficha
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setPacienteParaHistoria(paciente);
                                            setIsHistoriaOpen(true);
                                        }}
                                        className="flex-1 text-teal-700 hover:bg-teal-50 font-medium text-xs cursor-pointer bg-teal-50/50 py-2 rounded-lg transition-colors text-center border border-teal-100"
                                    >
                                        Historia Clínica
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* VISTA DE TABLA - Solo visible en pantallas medianas y grandes (hidden md:block) */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <th className="p-4">Paciente</th>
                                        <th className="p-4">DNI</th>
                                        <th className="p-4">Teléfono</th>
                                        <th className="p-4">Obra Social</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {pacientesFiltrados.map((paciente) => (
                                        <tr key={paciente.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="p-4 font-medium text-gray-800">
                                                {paciente.nombre} {paciente.apellido}
                                                <div className="text-xs text-gray-400 font-normal">{paciente.email || 'Sin correo'}</div>
                                            </td>
                                            <td className="p-4 text-gray-600">{paciente.dni}</td>
                                            <td className="p-4 text-gray-600">{paciente.telefono}</td>
                                            <td className="p-4 text-gray-600">
                                                {paciente.obra_social ? (
                                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium inline-block">
                                                        {paciente.obra_social}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">Particular</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                                                    paciente.estado === 'Inactivo' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                                }`}>
                                                    {paciente.estado || 'Activo'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setPacienteSeleccionado(paciente);
                                                            setIsDetalleOpen(true);
                                                        }}
                                                        className="text-terracota-600 hover:text-terracota-800 font-medium text-xs cursor-pointer bg-terracota-50 hover:bg-terracota-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Ver Ficha
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setPacienteParaHistoria(paciente);
                                                            setIsHistoriaOpen(true);
                                                        }}
                                                        className="text-teal-600 hover:text-teal-800 font-medium text-xs cursor-pointer bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Historia Clínica
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Modales */}
            <ModalNuevoPaciente 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onPacienteGuardado={handlePacienteGuardado}
                pacienteAEditar={pacienteAEditar}
            />

            <ModalDetallePaciente 
                isOpen={isDetalleOpen}
                onClose={() => setIsDetalleOpen(false)}
                paciente={pacienteSeleccionado}
                onEditar={puedeCrearEditarPacientes ? (paciente) => {
                    setPacienteAEditar(paciente);
                    setIsModalOpen(true);
                } : null}
            />

            <ModalHistoriaClinica 
                isOpen={isHistoriaOpen}
                onClose={() => setIsHistoriaOpen(false)}
                paciente={pacienteParaHistoria}
                rolUsuario={rolUsuario}
            />
        </div>
    );
}

export default Pacientes;