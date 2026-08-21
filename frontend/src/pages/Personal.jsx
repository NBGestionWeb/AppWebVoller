import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import ModalNuevoPersonal from '../components/Personal/ModalNuevoPersonal';
import ModalDetallePersonal from '../components/Personal/ModalDetallePersonal';
import toast from 'react-hot-toast';

function Personal() {
    const [personalList, setPersonalList] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);

    // Estados para los modales
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
    const [personalSeleccionado, setPersonalSeleccionado] = useState(null);
    const [personalAEditar, setPersonalAEditar] = useState(null);

    // Estado para el modal de confirmación de eliminación
    const [personaAEliminar, setPersonaAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

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

    const handleEliminarClick = (persona, e) => {
        e.stopPropagation();
        setPersonaAEliminar(persona);
    };

    const confirmarEliminacion = async () => {
        if (!personaAEliminar) return;

        setEliminando(true);
        try {
            // 1. Eliminar de la tabla perfiles si existe
            await supabase
                .from('perfiles')
                .delete()
                .eq('email', personaAEliminar.email);

            // 2. Eliminar de la tabla personal
            const { error } = await supabase
                .from('personal')
                .delete()
                .eq('id', personaAEliminar.id);

            if (error) throw error;

            toast.success('Personal eliminado correctamente');
            setPersonaAEliminar(null);
            cargarPersonal();
        } catch (err) {
            console.error('Error al eliminar personal:', err.message);
            toast.error('No se pudo eliminar el registro');
        } finally {
            setEliminando(false);
        }
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
                                            <button
                                                onClick={(e) => handleEliminarClick(persona, e)}
                                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Confirmación de Eliminación Personalizado */}
            {personaAEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-5 text-center">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-gray-800">¿Eliminar miembro del personal?</h3>
                            <p className="text-sm text-gray-500">
                                Estás a punto de eliminar a <span className="font-semibold text-gray-700">{personaAEliminar.nombre} {personaAEliminar.apellido}</span>. Esta acción no se puede deshacer y perderá su acceso al sistema.
                            </p>
                        </div>
                        <div className="flex justify-center space-x-3 pt-2">
                            <button
                                type="button"
                                disabled={eliminando}
                                onClick={() => setPersonaAEliminar(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={eliminando}
                                onClick={confirmarEliminacion}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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