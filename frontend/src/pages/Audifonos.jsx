import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../config/supabase'; // Asegúrate de que la ruta a tu cliente supabase sea correcta
import ModalAudifono from '../components/Audifonos/ModalAudifono';

const Audifonos = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [audifonoAEditar, setAudifonoAEditar] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [audifonos, setAudifonos] = useState([]);

    // Cargar audífonos desde Supabase al montar el componente
    const fetchAudifonos = async () => {
        const { data, error } = await supabase
            .from('audifonos')
            .select(`
                *,
                pacientes (
                    id,
                    nombre,
                    apellido,
                    dni
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al cargar audífonos:', error.message);
        } else {
            // Mapeamos los datos para que sean fáciles de leer en la vista
            const datosMapeados = (data || []).map(item => ({
                ...item,
                paciente: item.pacientes ? `${item.pacientes.nombre} ${item.pacientes.apellido}` : 'Sin asignar',
                fechaEntrega: item.fecha_entrega ? item.fecha_entrega.split('T')[0] : ''
            }));
            setAudifonos(datosMapeados);
        }
    };

    useEffect(() => {
        fetchAudifonos();
    }, []);

    // Función auxiliar para transformar de YYYY-MM-DD a DD/MM/YYYY para la vista
    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return '';
        const partes = fechaStr.split('-');
        if (partes.length === 3) {
            const [anio, mes, dia] = partes;
            return `${dia}/${mes}/${anio}`;
        }
        return fechaStr;
    };

    // Función para abrir el modal en modo edición
    const handleEditClick = (audifono) => {
        setAudifonoAEditar(audifono);
        setIsModalOpen(true);
    };

    // Función para eliminar de Supabase
    const handleDeleteClick = (id) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: '¿Estás seguro de eliminar este audífono?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#c86d51',
            cancelButtonColor: '#f3f4f6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            customClass: {
                confirmButton: 'text-white font-medium px-4 py-2 rounded-lg',
                cancelButton: '!text-gray-700 font-medium px-4 py-2 rounded-lg'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { error } = await supabase
                    .from('audifonos')
                    .delete()
                    .eq('id', id);

                if (error) {
                    Swal.fire('Error', 'No se pudo eliminar el audífono', 'error');
                } else {
                    setAudifonos(audifonos.filter(a => a.id !== id));
                    Swal.fire('Eliminado', 'El audífono ha sido eliminado', 'success');
                }
            }
        });
    };

    const handleSaveAudifono = async (nuevoAudifono) => {
        // Normalizamos el tipo de operación para evitar conflictos con el check constraint de la BD
        let tipoOperacionLimpio = '';
        if (nuevoAudifono.tipo_operacion) {
            tipoOperacionLimpio = nuevoAudifono.tipo_operacion
                .toLowerCase()
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, ''); // Quita tildes por si acaso (ej: "reparación" -> "reparacion")
        }

        // Preparamos el objeto adaptado exactamente a las columnas de tu tabla en Supabase
        const objetoParaBD = {
            paciente_id: nuevoAudifono.paciente_id || null,
            modelo: nuevoAudifono.modelo,
            tipo_operacion: tipoOperacionLimpio,
            marca: nuevoAudifono.marca,
            tipo: nuevoAudifono.tipo,
            serie: nuevoAudifono.serie,
            oido: nuevoAudifono.oido,
            estado: nuevoAudifono.estado ? nuevoAudifono.estado.toLowerCase().trim() : 'pendiente',
            fecha_entrega: nuevoAudifono.fechaEntrega ? new Date(nuevoAudifono.fechaEntrega).toISOString() : null
        };

        if (audifonoAEditar) {
            // Actualizar existente en Supabase
            const { error } = await supabase
                .from('audifonos')
                .update(objetoParaBD)
                .eq('id', audifonoAEditar.id);

            if (error) {
                console.error('Error al actualizar:', error.message);
                Swal.fire('Error', 'No se pudo actualizar el registro', 'error');
                return;
            }
        } else {
            // Crear nuevo en Supabase
            const { error } = await supabase
                .from('audifonos')
                .insert([objetoParaBD]);

            if (error) {
                console.error('Error al insertar:', error.message);
                Swal.fire('Error', 'No se pudo guardar el registro en la base de datos', 'error');
                return;
            }
        }

        // Refrescamos los datos desde la base de datos y cerramos modal
        fetchAudifonos();
        setAudifonoAEditar(null);
        setIsModalOpen(false);
        Swal.fire('¡Éxito!', 'El audífono se guardó correctamente', 'success');
    };

    // Filtrar audífonos según la pestaña seleccionada
    const audifonosFiltrados = filtroEstado === 'Todos' 
        ? audifonos 
        : audifonos.filter(a => a.estado && a.estado.toLowerCase() === filtroEstado.toLowerCase());

    // Colores dinámicos para los estados
    const getBadgeEstado = (estado) => {
        const estadoLower = estado ? estado.toLowerCase() : '';
        switch (estadoLower) {
            case 'pendiente':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'terminado':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'entregado':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Encabezado y Botón */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Gestión de Audífonos</h2>
                    <p className="text-sm text-gray-500">Administra el estado, números de serie y entregas de audífonos.</p>
                </div>
                <button 
                    onClick={() => { setAudifonoAEditar(null); setIsModalOpen(true); }}
                    className="w-full sm:w-auto bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                    <span className="text-lg leading-none">+</span> Nuevo Audífono
                </button>
            </div>

            {/* Pestañas de Filtrado por Estado */}
            <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-none">
                {['Todos', 'Pendiente', 'Terminado', 'Entregado'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFiltroEstado(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                            filtroEstado === tab
                                ? 'bg-terracota-500 text-white shadow-xs'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        {tab === 'Todos' ? 'Todos' : `${tab}s`}
                    </button>
                ))}
            </div>

            {/* Contenedor Principal (Vista de Tarjetas para Móviles / Tabla para Escritorio) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {audifonosFiltrados.length > 0 ? (
                    <>
                        {/* Versión Tarjetas para Móviles (< 768px) */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                            {audifonosFiltrados.map((item, index) => (
                                <div key={item.id} className="bg-gray-50/60 border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <span className="text-xs text-gray-400 font-medium">#{index + 1}</span>
                                            <h3 className="font-semibold text-gray-800 text-base">{item.paciente}</h3>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getBadgeEstado(item.estado)}`}>
                                            {item.estado}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-200/60 pt-3">
                                        <div>
                                            <span className="text-xs text-gray-500 block">Modelo / Marca</span>
                                            <span className="font-medium text-gray-800">{item.modelo}</span>
                                            <span className="text-xs text-gray-500 block">{item.marca}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 block">Tipo / Serie</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="bg-gray-200/80 text-gray-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                                    {item.tipo}
                                                </span>
                                                <span className="text-xs text-gray-600 font-mono">{item.serie}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-200/60 pt-3">
                                        <div>
                                            <span className="text-xs text-gray-500 block">Oído</span>
                                            <span className="text-gray-700 font-medium">{item.oido}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 block">F. Entrega</span>
                                            <span className="text-gray-700 font-medium">{formatearFecha(item.fechaEntrega) || 'No especificada'}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-200/60">
                                        <button 
                                            onClick={() => handleEditClick(item)} 
                                            className="text-gray-700 hover:text-gray-900 font-medium text-sm px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs"
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(item.id)} 
                                            className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 bg-white border border-red-100 rounded-lg shadow-2xs"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Versión Tabla Tradicional para Escritorio (md en adelante) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm font-semibold">
                                        <th className="py-3 px-6">#</th>
                                        <th className="py-3 px-6">Paciente</th>
                                        <th className="py-3 px-6">Modelo / Marca</th>
                                        <th className="py-3 px-6">Tipo / Serie</th>
                                        <th className="py-3 px-6">Oído</th>
                                        <th className="py-3 px-6">F. Entrega</th>
                                        <th className="py-3 px-6">Estado</th>
                                        <th className="py-3 px-6 text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {audifonosFiltrados.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-6 text-gray-500">{index + 1}</td>
                                            <td className="py-4 px-6 font-medium text-gray-800">{item.paciente}</td>
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-gray-800">{item.modelo}</div>
                                                <div className="text-xs text-gray-500">{item.marca}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium">
                                                        {item.tipo}
                                                    </span>
                                                    <span className="text-xs text-gray-600 font-mono">{item.serie}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600">{item.oido}</td>
                                            <td className="py-4 px-6 text-gray-600">{formatearFecha(item.fechaEntrega)}</td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getBadgeEstado(item.estado)}`}>
                                                    {item.estado}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-end space-x-2">
                                                <button 
                                                    onClick={() => handleEditClick(item)} 
                                                    className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer p-1" 
                                                    title="Editar"
                                                >
                                                    Editar
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(item.id)} 
                                                    className="text-red-600 hover:text-red-800 font-medium cursor-pointer p-1" 
                                                    title="Eliminar"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-400 px-4">
                        No hay audífonos registrados en esta sección.
                    </div>
                )}
            </div>

            {/* Modal de Creación / Edición */}
            <ModalAudifono 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveAudifono}
                audifonoAEditar={audifonoAEditar}
            /> 
        </div>
    );
};

export default Audifonos;