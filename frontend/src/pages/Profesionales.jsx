import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import ModalNuevoProfesional from '../components/Profesional/ModalNuevoProfesional.jsx';
import ModalDetalleProfesional from '../components/Profesional/ModalDetalleProfesional.jsx';
import ModalDisponibilidad from '../components/Profesional/ModalDisponibilidad.jsx';

function Profesionales({ rolUsuario }) {
    const [profesionales, setProfesionales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
    const [isDetalleOpen, setIsDetalleOpen] = useState(false);
    const [profesionalAEditar, setProfesionalAEditar] = useState(null);
    
    // Estado para el modal de disponibilidad
    const [isDisponibilidadOpen, setIsDisponibilidadOpen] = useState(false);

    // Permisos según el rol:
    // - administrador: gestión total (crear, editar, etc.)
    // - recepcionista: solo lectura (ver listado y ficha)
    const puedeCrearEditarProfesionales = rolUsuario === 'administrador';

    const obtenerProfesionales = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profesionales')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfesionales(data || []);
        } catch (error) {
            console.error('Error al cargar profesionales:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        obtenerProfesionales();
    }, []);

    const handleProfesionalGuardado = (profesionalGuardado) => {
        setProfesionales(prev => {
            const existe = prev.some(p => p.id === profesionalGuardado.id);
            if (existe) {
                return prev.map(p => p.id === profesionalGuardado.id ? profesionalGuardado : p);
            } else {
                return [profesionalGuardado, ...prev];
            }
        });
    };

    const profesionalesFiltrados = profesionales.filter(p => 
        `${p.nombre} ${p.apellido} ${p.dni} ${p.especialidad} ${p.matricula}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            {/* Cabecera adaptativa */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Gestión de Profesionales</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Administra los médicos, otorrinos, externos y técnicos del centro.</p>
                </div>
                {puedeCrearEditarProfesionales && (
                    <button 
                        onClick={() => {
                            setProfesionalAEditar(null);
                            setIsModalOpen(true);
                        }}
                        className="w-full sm:w-auto bg-terracota-500 hover:bg-terracota-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm flex items-center justify-center space-x-2 shrink-0"
                    >
                        <span>+ Nuevo Profesional</span>
                    </button>
                )}
            </div>

            {/* Buscador adaptable */}
            <div className="mb-6">
                <input 
                    type="text"
                    placeholder="Buscar por nombre, especialidad o matrícula..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full md:w-1/2 lg:w-1/3 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:border-terracota-500 outline-none text-sm bg-white shadow-sm"
                />
            </div>

            {/* Contenedor principal de datos */}
            <div>
                {loading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 text-sm">
                        Cargando listado de profesionales...
                    </div>
                ) : profesionalesFiltrados.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 text-sm">
                        No se encontraron profesionales registrados.
                    </div>
                ) : (
                    <>
                        {/* VISTA MÓVIL: Tarjetas (Cards) para pantallas pequeñas (< 768px) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                            {profesionalesFiltrados.map((profesional) => (
                                <div key={profesional.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-800 text-base">
                                                {profesional.nombre} {profesional.apellido}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                                profesional.estado === 'Inactivo' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                            }`}>
                                                {profesional.estado || 'Activo'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-3">DNI: {profesional.dni}</p>

                                        <div className="space-y-1.5 text-xs text-gray-600">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-medium">Especialidad:</span>
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                                                    {profesional.especialidad}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-medium">Matrícula:</span>
                                                <span className="font-medium text-gray-800">{profesional.matricula}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-medium">Teléfono:</span>
                                                <span className="font-medium text-gray-800">{profesional.telefono || 'No especificado'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-50 flex justify-end">
                                        <button 
                                            onClick={() => {
                                                setProfesionalSeleccionado(profesional);
                                                setIsDetalleOpen(true);
                                            }}
                                            className="w-full bg-terracota-50 hover:bg-terracota-100 text-terracota-600 hover:text-terracota-800 font-medium text-xs py-2 rounded-lg transition-colors text-center cursor-pointer"
                                        >
                                            Ver Ficha
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VISTA ESCRITORIO: Tabla tradicional (>= 768px) */}
                        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="p-4">Profesional</th>
                                            <th className="p-4">Especialidad</th>
                                            <th className="p-4">Matrícula</th>
                                            <th className="p-4">Teléfono</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {profesionalesFiltrados.map((profesional) => (
                                            <tr key={profesional.id} className="hover:bg-gray-50/65 transition-colors">
                                                <td className="p-4 font-medium text-gray-800">
                                                    {profesional.nombre} {profesional.apellido}
                                                    <div className="text-xs text-gray-400 font-normal">DNI: {profesional.dni}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                                        {profesional.especialidad}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-600">{profesional.matricula}</td>
                                                <td className="p-4 text-gray-600">{profesional.telefono}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        profesional.estado === 'Inactivo' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                                    }`}>
                                                        {profesional.estado || 'Activo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => {
                                                            setProfesionalSeleccionado(profesional);
                                                            setIsDetalleOpen(true);
                                                        }}
                                                        className="text-terracota-600 hover:text-terracota-800 font-medium text-xs cursor-pointer bg-terracota-50 hover:bg-terracota-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Ver Ficha
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modales */}
            {puedeCrearEditarProfesionales && (
                <ModalNuevoProfesional 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onProfesionalGuardado={handleProfesionalGuardado}
                    profesionalAEditar={profesionalAEditar}
                />
            )}

            <ModalDetalleProfesional 
                isOpen={isDetalleOpen}
                onClose={() => setIsDetalleOpen(false)}
                profesional={profesionalSeleccionado}
                rolUsuario={rolUsuario}
                onEditar={(prof) => {
                    if (!puedeCrearEditarProfesionales) return;
                    setProfesionalAEditar(prof);
                    setIsModalOpen(true);
                }}
                onAbrirDisponibilidad={(prof) => {
                    setProfesionalSeleccionado(prof);
                    setIsDisponibilidadOpen(true);
                }}
            />

            <ModalDisponibilidad 
                isOpen={isDisponibilidadOpen}
                onClose={() => setIsDisponibilidadOpen(false)}
                profesional={profesionalSeleccionado}
                rolUsuario={rolUsuario}
            />
        </div>
    );
}

export default Profesionales; // O export default Profesionales según tu sintaxis habitual