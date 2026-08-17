import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import ModalNuevoPaciente from '../components/Paciente/ModalNuevoPaciente.jsx';
import ModalDetallePaciente from '../components/Paciente/ModalDetallePaciente.jsx';
import ModalHistoriaClinica from '../components/Paciente/ModalHistoriaClinica.jsx'; // Nuevo componente para la HC

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

    // Permisos según el rol:
    // - administrador: gestión total (puede crear/editar pacientes)
    // - recepcionista: pacientes (crear o editar)
    // - profesional: pacientes (vista, sin crear ni editar datos personales)
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
        <div className="container mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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
                        className="bg-terracota-500 hover:bg-terracota-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm flex items-center space-x-2"
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

            {/* Listado / Tabla de Pacientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm">Cargando listado de pacientes...</div>
                ) : pacientesFiltrados.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm">No se encontraron pacientes registrados.</div>
                ) : (
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
                                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                                    {paciente.obra_social}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Particular</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                paciente.estado === 'Inactivo' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                            }`}>
                                                {paciente.estado || 'Activo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center space-x-2">
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Registrar / Editar Paciente */}
            <ModalNuevoPaciente 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onPacienteGuardado={handlePacienteGuardado}
                pacienteAEditar={pacienteAEditar}
            />

            {/* Modal para Ver Ficha / Detalle del Paciente */}
            <ModalDetallePaciente 
                isOpen={isDetalleOpen}
                onClose={() => setIsDetalleOpen(false)}
                paciente={pacienteSeleccionado}
                onEditar={puedeCrearEditarPacientes ? (paciente) => {
                    setPacienteAEditar(paciente);
                    setIsModalOpen(true);
                } : null}
            />

            {/* Modal de Historia Clínica */}
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