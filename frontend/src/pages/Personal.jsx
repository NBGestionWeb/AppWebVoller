import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import ModalNuevoPersonal from '../components/Personal/ModalNuevoPersonal';
import ModalDetallePersonal from '../components/Personal/ModalDetallePersonal';

function Personal() {
    const [personalList, setPersonalList] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);

    // Estados para los modales
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
    const [personalSeleccionado, setPersonalSeleccionado] = useState(null);
    const [personalAEditar, setPersonalAEditar] = useState(null);

    useEffect(() => {
        cargarPersonal();
    }, []);

    const cargarPersonal = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('personal')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPersonalList(data || []);
        } catch (err) {
            console.error('Error al cargar personal:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNuevoClick = () => {
        setPersonalAEditar(null);
        setIsModalNuevoOpen(true);
    };

    const handleEditarClick = (persona, e) => {
        e.stopPropagation();
        setPersonalAEditar(persona);
        setIsModalNuevoOpen(true);
    };

    const handleDetalleClick = (persona) => {
        setPersonalSeleccionado(persona);
        setIsModalDetalleOpen(true);
    };

    // Filtrar personal por nombre, apellido o DNI
    const personalFiltrado = personalList.filter(p => {
        const textoBusqueda = busqueda.toLowerCase();
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase();
        const dni = (p.dni || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        return nombreCompleto.includes(textoBusqueda) || dni.includes(textoBusqueda) || email.includes(textoBusqueda);
    });

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Cabecera del módulo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Gestión de Personal</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Administra los usuarios del centro y sus permisos autorizados.</p>
                </div>
                <button
                    onClick={handleNuevoClick}
                    className="w-full sm:w-auto bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center space-x-2"
                >
                    <span>+ Nuevo Personal</span>
                </button>
            </div>

            {/* Barra de Búsqueda */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, apellido, DNI o correo..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-terracota-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Listado de Personal (Tabla / Tarjetas) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Cargando personal...</div>
                ) : personalFiltrado.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No se encontraron registros de personal.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Nombre y Apellido</th>
                                    <th className="py-3 px-4">Correo (Usuario)</th>
                                    <th className="py-3 px-4">DNI / Teléfono</th>
                                    <th className="py-3 px-4">Estado</th>
                                    <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {personalFiltrado.map((persona) => (
                                    <tr 
                                        key={persona.id} 
                                        onClick={() => handleDetalleClick(persona)}
                                        className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                                            {persona.nombre} {persona.apellido}
                                        </td>
                                        <td className="py-3.5 px-4 text-gray-600">{persona.email}</td>
                                        <td className="py-3.5 px-4 text-gray-600 text-xs">
                                            <div>{persona.dni || 'Sin DNI'}</div>
                                            <div className="text-gray-400">{persona.telefono || 'Sin teléfono'}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                                persona.estado === 'Activo' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {persona.estado || 'Activo'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleEditarClick(persona, e)}
                                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Crear / Editar Personal */}
            <ModalNuevoPersonal
                isOpen={isModalNuevoOpen}
                onClose={() => setIsModalNuevoOpen(false)}
                onPersonalGuardado={cargarPersonal}
                personalAEditar={personalAEditar}
            />

            {/* Modal para Ver Detalles */}
            <ModalDetallePersonal
                isOpen={isModalDetalleOpen}
                onClose={() => setIsModalDetalleOpen(false)}
                personal={personalSeleccionado}
            />
        </div>
    );
}

export default Personal;