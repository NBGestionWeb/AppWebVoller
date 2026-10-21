import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { supabase } from '../config/supabase';
import { usePermisos } from '../hooks/usePermisos';
import ModalAudifono from '../components/Audifonos/ModalAudifono';

const Audifonos = () => {
    const { tienePermiso, loadingPermisos } = usePermisos();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [audifonoAEditar, setAudifonoAEditar] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [audifonos, setAudifonos] = useState([]);

    // Estado para el modal de visualización de detalles completos
    const [audifonoSeleccionado, setAudifonoSeleccionado] = useState(null);
    const [isModalVerOpen, setIsModalVerOpen] = useState(false);

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

    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return '';
        const partes = fechaStr.split('-');
        if (partes.length === 3) {
            const [anio, mes, dia] = partes;
            return `${dia}/${mes}/${anio}`;
        }
        return fechaStr;
    };

    const handleEditClick = (audifono) => {
        if (loadingPermisos) {
            toast.loading('Cargando permisos, por favor espera...');
            return;
        }

        if (!tienePermiso('edicion_eliminacion_audifonos')) {
            Swal.fire({
                title: 'Acceso Denegado',
                text: 'No se puede editar porque no tiene los permisos necesarios.',
                icon: 'warning',
                confirmButtonColor: '#c86d51',
                confirmButtonText: 'Entendido'
            });
            toast.error('No cuentas con permisos para editar audífonos.');
            return;
        }

        setAudifonoAEditar(audifono);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id) => {
        if (loadingPermisos) {
            toast.loading('Cargando permisos, por favor espera...');
            return;
        }

        if (!tienePermiso('edicion_eliminacion_audifonos')) {
            Swal.fire({
                title: 'Acceso Denegado',
                text: 'No se puede eliminar porque no tiene los permisos necesarios.',
                icon: 'warning',
                confirmButtonColor: '#c86d51',
                confirmButtonText: 'Entendido'
            });
            toast.error('No cuentas con permisos para eliminar audífonos.');
            return;
        }

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
        const objetoParaBD = {
            paciente_id: nuevoAudifono.paciente_id || null,
            modelo: nuevoAudifono.modelo,
            tipo_operacion: nuevoAudifono.tipo_operacion,
            modalidad_entrega: nuevoAudifono.modalidad_entrega || null,
            tipo: nuevoAudifono.tipo,
            serie: nuevoAudifono.serie,
            oido: nuevoAudifono.oido,
            estado: nuevoAudifono.estado ? nuevoAudifono.estado.toLowerCase().trim() : 'pendiente',
            fecha_entrega: nuevoAudifono.fechaEntrega ? new Date(nuevoAudifono.fechaEntrega).toISOString() : null,
            reparaciones: nuevoAudifono.reparaciones || []
        };

        if (audifonoAEditar) {
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
            const { error } = await supabase
                .from('audifonos')
                .insert([objetoParaBD]);

            if (error) {
                console.error('Error al insertar:', error.message);
                Swal.fire('Error', 'No se pudo guardar el registro en la base de datos', 'error');
                return;
            }
        }

        fetchAudifonos();
        setAudifonoAEditar(null);
        setIsModalOpen(false);
        Swal.fire('¡Éxito!', 'El audífono se guardó correctamente', 'success');
    };

    const audifonosFiltrados = filtroEstado === 'Todos' 
        ? audifonos 
        : audifonos.filter(a => a.estado && a.estado.toLowerCase() === filtroEstado.toLowerCase());

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
                    <p className="text-sm text-gray-500">Administra el estado, números de serie, entregas y reparaciones de audífonos.</p>
                </div>
                <button 
                    onClick={() => { 
                        if (loadingPermisos) {
                            toast.loading('Cargando permisos, por favor espera...');
                            return;
                        }
                        if (!tienePermiso('carga_audifonos')) {
                            toast.error('No cuentas con permisos para cargar audífonos.');
                            return;
                        }
                        setAudifonoAEditar(null); 
                        setIsModalOpen(true); 
                    }}
                    disabled={loadingPermisos}
                    className="w-full sm:w-auto bg-terracota-500 hover:bg-terracota-600 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Contenedor Principal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {audifonosFiltrados.length > 0 ? (
                    <>
                        {/* Versión Tarjetas para Móviles */}
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
                                            <span className="text-xs text-gray-500 block">Modelo</span>
                                            <span className="font-medium text-gray-800">{item.modelo}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 block">Operación</span>
                                            <span className="font-medium text-terracota-600">
                                                {item.tipo_operacion} {item.modalidad_entrega ? `(${item.modalidad_entrega})` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/60">
                                        <button 
                                            onClick={() => { setAudifonoSeleccionado(item); setIsModalVerOpen(true); }}
                                            className="text-terracota-600 hover:text-terracota-700 font-medium text-sm px-3 py-1 bg-terracota-50 border border-terracota-200 rounded-lg shadow-xs cursor-pointer"
                                        >
                                            Ver
                                        </button>
                                        <button 
                                            onClick={() => handleEditClick(item)} 
                                            className="text-gray-700 hover:text-gray-900 font-medium text-sm px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-xs cursor-pointer"
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(item.id)} 
                                            className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 bg-white border border-red-100 rounded-lg shadow-xs cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Versión Tabla Tradicional para Escritorio */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm font-semibold">
                                        <th className="py-3 px-6">#</th>
                                        <th className="py-3 px-6">Paciente</th>
                                        <th className="py-3 px-6">Modelo</th>
                                        <th className="py-3 px-6">Operación</th>
                                        <th className="py-3 px-6">Tipo / Serie</th>
                                        <th className="py-3 px-6">Oído</th>
                                        <th className="py-3 px-6">Fecha</th>
                                        <th className="py-3 px-6">Estado</th>
                                        <th className="py-3 px-6 text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {audifonosFiltrados.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-6 text-gray-500">{index + 1}</td>
                                            <td className="py-4 px-6 font-medium text-gray-800">{item.paciente}</td>
                                            <td className="py-4 px-6 font-medium text-gray-800">{item.modelo}</td>
                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-terracota-600">{item.tipo_operacion}</span>
                                                {item.modalidad_entrega && (
                                                    <span className="block text-xs text-gray-500">{item.modalidad_entrega}</span>
                                                )}
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
                                                    onClick={() => { setAudifonoSeleccionado(item); setIsModalVerOpen(true); }}
                                                    className="text-terracota-600 hover:text-terracota-800 font-medium cursor-pointer p-1 bg-terracota-50 px-2.5 py-1 rounded-lg border border-terracota-200"
                                                    title="Ver información completa"
                                                >
                                                    Ver
                                                </button>
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

            {/* MODAL DE VISUALIZACIÓN DE DETALLES Y LABORATORIO */}
            {isModalVerOpen && audifonoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 my-auto animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-terracota-500 text-white">
                            <h3 className="text-base font-bold">Detalle del Dispositivo / Audífono</h3>
                            <button 
                                onClick={() => setIsModalVerOpen(false)}
                                className="text-white/80 hover:text-white font-bold text-xl cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Paciente Asignado</span>
                                <p className="font-semibold text-gray-800 text-base">{audifonoSeleccionado.paciente}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Modelo / Marca</span>
                                    <p className="font-medium text-gray-800">{audifonoSeleccionado.modelo}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Tipo de Operación</span>
                                    <p className="font-medium text-terracota-600">
                                        {audifonoSeleccionado.tipo_operacion} 
                                        {audifonoSeleccionado.modalidad_entrega ? ` (${audifonoSeleccionado.modalidad_entrega})` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Tipo</span>
                                    <p className="font-medium text-gray-800">{audifonoSeleccionado.tipo}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Nº de Serie</span>
                                    <p className="font-mono text-gray-800">{audifonoSeleccionado.serie}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Oído</span>
                                    <p className="font-medium text-gray-800">{audifonoSeleccionado.oido}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Fecha de Registro</span>
                                    <p className="font-medium text-gray-800">{formatearFecha(audifonoSeleccionado.fechaEntrega) || 'No especificada'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Estado Actual</span>
                                    <p className="font-medium capitalize text-gray-800">{audifonoSeleccionado.estado}</p>
                                </div>
                            </div>

                            {/* HISTORIAL DE REPARACIONES / LABORATORIO */}
                            <div className="border-t border-gray-200 pt-3 space-y-2">
                                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                                    🛠️ Historial de Envíos a Laboratorio ({audifonoSeleccionado.reparaciones?.length || 0})
                                </h4>

                                {(!audifonoSeleccionado.reparaciones || audifonoSeleccionado.reparaciones.length === 0) ? (
                                    <p className="text-gray-400 text-xs italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200 text-center">
                                        Este audífono no registra envíos a laboratorio.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {audifonoSeleccionado.reparaciones.map((rep, rIdx) => (
                                            <div key={rIdx} className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                                                <div className="flex justify-between font-bold text-amber-900 border-b border-amber-200 pb-1">
                                                    <span>Envío #{rIdx + 1}</span>
                                                    <span>{rep.costo ? `Costo: $${rep.costo}` : 'Sin costo'}</span>
                                                </div>
                                                <p className="text-gray-700"><b>Fecha de Envío:</b> {formatearFecha(rep.fecha_envio) || 'N/D'}</p>
                                                <p className="text-gray-700"><b>Fecha de Devolución:</b> {formatearFecha(rep.fecha_devolucion) || 'Pendiente'}</p>
                                                <p className="text-gray-700"><b>Informe del Laboratorio:</b> {rep.informe || 'Sin informe registrado'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => setIsModalVerOpen(false)}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Audifonos;