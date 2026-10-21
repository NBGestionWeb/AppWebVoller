import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase.js';
import { usePermisos } from '../../hooks/usePermisos';

function ModalHistoriaClinica({ isOpen, onClose, paciente }) {
    const { tienePermiso, loadingPermisos } = usePermisos();

    const [historias, setHistorias] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [audifonosInfo, setAudifonosInfo] = useState(null);
    const [laboratorioCount, setLaboratorioCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    // Estado para la vista: 'lista' o 'nuevo'
    const [vista, setVista] = useState('lista');

    // Estado para saber si estamos editando una consulta existente
    const [consultaAEditar, setConsultaAEditar] = useState(null);

    // Estado para confirmar eliminación
    const [idAEliminar, setIdAEliminar] = useState(null);

    // Filtros de búsqueda por rango de fechas (Desde / Hasta)
    const [filtroDesde, setFiltroDesde] = useState('');
    const [filtroHasta, setFiltroHasta] = useState('');

    // Formulario de nueva consulta o edición
    const [formData, setFormData] = useState({
        profesional_id: '',
        motivo_consulta: '',
        antecedentes: '',
        examen_fisico: '',
        observaciones: '',
        es_audiologia: false,
        archivo_pdf: null
    });

    useEffect(() => {
        if (isOpen && paciente?.id) {
            cargarHistorias();
            cargarProfesionales();
            cargarDatosPacienteAdicionales();
            setVista('lista');
            limpiarFormulario();
        }
    }, [isOpen, paciente]);

    const limpiarFormulario = () => {
        setConsultaAEditar(null);
        setFormData({
            profesional_id: '',
            motivo_consulta: '',
            antecedentes: '',
            examen_fisico: '',
            observaciones: '',
            es_audiologia: false,
            archivo_pdf: null
        });
        setError('');
        setExito('');
    };

    const cargarHistorias = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('historias_clinicas')
                .select(`
                    *,
                    profesionales (nombre, apellido, especialidad)
                `)
                .eq('paciente_id', paciente.id)
                .order('fecha_consulta', { ascending: false });

            if (error) throw error;
            // Inicializamos cada historia con su acordeón de detalle cerrado por defecto
            const historiasConExpand = (data || []).map(h => ({ ...h, expandido: false }));
            setHistorias(historiasConExpand);
        } catch (err) {
            console.error('Error al cargar historias clínicas:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const cargarProfesionales = async () => {
        try {
            const { data, error } = await supabase
                .from('profesionales')
                .select('id, nombre, apellido, especialidad')
                .eq('estado', 'Activo');

            if (error) throw error;
            setProfesionales(data || []);
        } catch (err) {
            console.error('Error al cargar profesionales:', err.message);
        }
    };

    const cargarDatosPacienteAdicionales = async () => {
        try {
            const { data: audifonosData } = await supabase
                .from('audifonos')
                .select('*')
                .eq('paciente_id', paciente.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (audifonosData && audifonosData.length > 0) {
                setAudifonosInfo(audifonosData[0]);
            } else {
                setAudifonosInfo(null);
            }

            const { count: labCount } = await supabase
                .from('laboratorio')
                .select('*', { count: 'exact', head: true })
                .eq('paciente_id', paciente.id);

            setLaboratorioCount(labCount || 0);
        } catch (err) {
            console.error('Error al cargar datos adicionales del paciente:', err.message);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({
                ...prev,
                [name]: files[0] || null
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleEditarClick = (historia) => {
        if (!tienePermiso('edicion_eliminacion_historias_clinicas')) {
            alert('No cuentas con permisos para editar historias clínicas.');
            return;
        }

        setConsultaAEditar(historia);
        setFormData({
            profesional_id: historia.profesional_id || '',
            motivo_consulta: historia.motivo_consulta || '',
            antecedentes: historia.antecedentes || '',
            examen_fisico: historia.examen_fisico || '',
            observaciones: historia.observaciones || '',
            es_audiologia: historia.es_audiologia || false,
            archivo_pdf: null
        });
        setVista('nuevo');
    };

    const abrirPdfFirmado = async (rutaArchivo) => {
        if (!rutaArchivo) return;
        try {
            const { data, error } = await supabase.storage
                .from('estudios-clinicos')
                .createSignedUrl(rutaArchivo, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            console.error('Error al generar enlace firmado:', err.message);
            alert('No se pudo abrir el archivo PDF.');
        }
    };

    const toggleExpandir = (id) => {
        setHistorias(prev => prev.map(h => h.id === id ? { ...h, expandido: !h.expandido } : h));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setExito('');

        const permisoRequerido = consultaAEditar ? 'edicion_eliminacion_historias_clinicas' : 'carga_historias_clinicas';
        if (!tienePermiso(permisoRequerido)) {
            setError('No tienes los permisos necesarios para realizar esta acción.');
            return;
        }

        setGuardando(true);

        try {
            let pdfPath = consultaAEditar?.datos_audiologia?.pdf_path || null;

            if (formData.archivo_pdf) {
                const archivo = formData.archivo_pdf;
                const nombreArchivo = `${paciente.id}_${Date.now()}_${archivo.name}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('estudios-clinicos')
                    .upload(nombreArchivo, archivo);

                if (uploadError) throw uploadError;
                pdfPath = nombreArchivo;
            }

            let datosAudiologiaJson = null;
            if (formData.es_audiologia) {
                datosAudiologiaJson = { pdf_path: pdfPath };
            }

            const payload = {
                profesional_id: formData.profesional_id || null,
                motivo_consulta: formData.motivo_consulta,
                antecedentes: formData.antecedentes,
                examen_fisico: formData.examen_fisico,
                observaciones: formData.observaciones,
                es_audiologia: formData.es_audiologia,
                datos_audiologia: datosAudiologiaJson
            };

            if (consultaAEditar) {
                const { error: updateError } = await supabase
                    .from('historias_clinicas')
                    .update(payload)
                    .eq('id', consultaAEditar.id);

                if (updateError) throw updateError;
                setExito('Consulta actualizada correctamente.');
            } else {
                payload.paciente_id = paciente.id;
                const { error: insertError } = await supabase
                    .from('historias_clinicas')
                    .insert([payload]);

                if (insertError) throw insertError;
                setExito('Consulta registrada con éxito.');
            }

            await cargarHistorias();
            setTimeout(() => {
                setVista('lista');
                limpiarFormulario();
            }, 1000);
        } catch (err) {
            setError('Error al guardar: ' + err.message);
        } finally {
            setGuardando(false);
        }
    };

    const confirmarEliminar = async () => {
        if (!idAEliminar) return;
        if (!tienePermiso('edicion_eliminacion_historias_clinicas')) {
            alert('No cuentas con permisos para eliminar registros de la historia clínica.');
            setIdAEliminar(null);
            return;
        }

        try {
            const { error } = await supabase
                .from('historias_clinicas')
                .delete()
                .eq('id', idAEliminar);

            if (error) throw error;
            setIdAEliminar(null);
            await cargarHistorias();
        } catch (err) {
            console.error('Error al eliminar:', err.message);
            alert('No se pudo eliminar el registro.');
            setIdAEliminar(null);
        }
    };

    const historiasFiltradas = historias.filter(h => {
        if (!h.fecha_consulta) return false;
        const fechaConsultaStr = h.fecha_consulta.split('T')[0];

        if (filtroDesde && fechaConsultaStr < filtroDesde) return false;
        if (filtroHasta && fechaConsultaStr > filtroHasta) return false;

        return true;
    });

    if (!isOpen || !paciente) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
                
                {/* Modal de confirmación de eliminación */}
                {idAEliminar && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                                !
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm mb-1">¿Estás seguro?</h4>
                                <p className="text-xs text-gray-500">Esta acción eliminará permanentemente este registro de la historia clínica.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIdAEliminar(null)}
                                    className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button"
                                    onClick={confirmarEliminar}
                                    style={{ backgroundColor: '#C05621', color: '#FFFFFF' }}
                                    className="w-full sm:flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cabecera */}
                <div className="bg-terracota-500 px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold">Historia Clínica - Paciente</h3>
                        <p className="text-xs text-white/80">{paciente.nombre} {paciente.apellido} (DNI: {paciente.dni})</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-2xl font-bold cursor-pointer p-1 leading-none shrink-0"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto text-sm flex-1 space-y-5">
                    
                    {/* Tarjeta de Resumen General del Paciente */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="font-bold text-gray-400 uppercase text-[10px] block">Estado de Audífonos</span>
                            {audifonosInfo ? (
                                <div>
                                    <p className="font-semibold text-emerald-700">Sí posee (Adquirido)</p>
                                    <p className="text-gray-600 text-[11px]">Modalidad: <span className="font-medium uppercase">{audifonosInfo.modalidad || 'Particular'}</span></p>
                                    <p className="text-gray-500 text-[10px]">Fecha: {audifonosInfo.created_at ? audifonosInfo.created_at.split('T')[0] : 'N/D'}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No registra audífonos adquiridos.</p>
                            )}
                        </div>

                        <div className="space-y-1 sm:border-x sm:border-gray-200 sm:px-4">
                            <span className="font-bold text-gray-400 uppercase text-[10px] block">Envíos a Laboratorio</span>
                            <p className="font-semibold text-gray-800 text-sm">
                                {laboratorioCount} {laboratorioCount === 1 ? 'envío registrado' : 'envíos registrados'}
                            </p>
                            <p className="text-gray-500 text-[11px]">Reparaciones o revisiones técnicas.</p>
                        </div>

                        <div className="space-y-1">
                            <span className="font-bold text-gray-400 uppercase text-[10px] block">Asistencias / Consultas</span>
                            <p className="font-semibold text-gray-800 text-sm">
                                {historias.length} {historias.length === 1 ? 'visita total' : 'visitas totales'}
                            </p>
                            <p className="text-gray-500 text-[11px]">Historial completo en el centro.</p>
                        </div>
                    </div>

                    {/* Barra de Navegación Interna y Filtros por Rango de Fechas */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-2 gap-3 border-b border-gray-100">
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            <button 
                                onClick={() => setVista('lista')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center ${
                                    vista === 'lista' 
                                        ? 'bg-terracota-500 text-white shadow-xs' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Historial de Consultas ({historias.length})
                            </button>
                            
                            {!loadingPermisos && tienePermiso('carga_historias_clinicas') && (
                                <button 
                                    onClick={() => {
                                        limpiarFormulario();
                                        setVista('nuevo');
                                    }}
                                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center ${
                                        vista === 'nuevo' 
                                            ? 'bg-terracota-500 text-white shadow-xs' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    + Nueva Consulta
                                </button>
                            )}
                        </div>

                        {vista === 'lista' && (
                            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto bg-gray-50 p-2 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-500 font-medium">Desde:</span>
                                <input 
                                    type="date"
                                    value={filtroDesde}
                                    onChange={(e) => setFiltroDesde(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none bg-white"
                                />
                                <span className="text-xs text-gray-500 font-medium">Hasta:</span>
                                <input 
                                    type="date"
                                    value={filtroHasta}
                                    onChange={(e) => setFiltroHasta(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none bg-white"
                                />
                               {(filtroDesde || filtroHasta) && (
                                    <button 
                                        onClick={() => { setFiltroDesde(''); setFiltroHasta(''); }}
                                        className="text-xs text-terracota-600 hover:underline cursor-pointer font-bold ml-1"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* VISTA 1: LISTADO */}
                    {vista === 'lista' && (
                        <div>
                            {loading ? (
                                <p className="text-center text-gray-500 py-12">Cargando registros históricos...</p>
                            ) : historiasFiltradas.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4">
                                    <p className="text-gray-500 text-sm mb-1">No se encontraron registros de historia clínica en este rango de fechas.</p>
                                    <p className="text-xs text-gray-400">
                                        Utiliza el botón de arriba para registrar la primera consulta o ajusta los filtros.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {historiasFiltradas.map((h) => {
                                        const fechaFormateada = new Date(h.fecha_consulta).toLocaleString('es-AR', { 
                                            dateStyle: 'medium', 
                                            timeStyle: 'short' 
                                        });

                                        return (
                                            <div key={h.id} className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-3 relative">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200/60 pb-3 gap-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-terracota-600 uppercase tracking-wider block">
                                                            {fechaFormateada}
                                                        </span>
                                                        <h4 className="font-bold text-gray-800 text-base mt-0.5">
                                                            {h.motivo_consulta || 'Sin motivo especificado'}
                                                        </h4>
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/40">
                                                        {/* Botón para Ver Detalle / PDF */}
                                                        <button 
                                                            onClick={() => toggleExpandir(h.id)}
                                                            className="px-3 py-1.5 sm:py-1 bg-terracota-50 border border-terracota-200 hover:bg-terracota-100 text-terracota-700 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                                                        >
                                                            {h.expandido ? 'Ocultar Detalle' : 'Ver Detalle'}
                                                        </button>

                                                        {!loadingPermisos && tienePermiso('edicion_eliminacion_historias_clinicas') && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleEditarClick(h)}
                                                                    className="px-3 py-1.5 sm:py-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium shadow-2xs cursor-pointer transition-colors"
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button 
                                                                    onClick={() => setIdAEliminar(h.id)}
                                                                    className="px-3 py-1.5 sm:py-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium shadow-2xs cursor-pointer transition-colors"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    {h.es_audiologia && (
                                                        <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                            Estudio de Audiología
                                                        </span>
                                                    )}
                                                    <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700">
                                                        Dr./Lic. {h.profesionales ? `${h.profesionales.nombre} ${h.profesionales.apellido}` : 'No asignado'}
                                                        {h.profesionales?.especialidad ? ` (${h.profesionales.especialidad})` : ''}
                                                    </span>
                                                </div>

                                                {/* CONTENIDO DESPLEGABLE (INFORMACIÓN DETALLADA Y PDF) */}
                                                {h.expandido && (
                                                    <div className="space-y-3 pt-2 border-t border-gray-200/60 animate-fadeIn">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                                                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                <span className="font-semibold text-gray-500 block mb-1 uppercase text-[10px]">Antecedentes</span>
                                                                <p className="text-gray-700">{h.antecedentes || 'Sin antecedentes registrados.'}</p>
                                                            </div>

                                                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                <span className="font-semibold text-gray-500 block mb-1 uppercase text-[10px]">Examen Físico / Complementario</span>
                                                                <p className="text-gray-700">{h.examen_fisico || 'Sin examen físico registrado.'}</p>
                                                            </div>
                                                        </div>

                                                        {h.es_audiologia && h.datos_audiologia?.pdf_path && (
                                                            <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-100 text-xs flex items-center justify-between">
                                                                <div>
                                                                    <span className="font-bold text-teal-900 uppercase text-[10px] tracking-wider block">Estudio Adjunto</span>
                                                                    <p className="text-teal-700 font-medium">Archivo PDF escaneado disponible</p>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => abrirPdfFirmado(h.datos_audiologia.pdf_path)}
                                                                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                                                >
                                                                    Ver PDF 📄
                                                                </button>
                                                            </div>
                                                        )}

                                                        {h.observaciones && (
                                                            <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs">
                                                                <span className="font-semibold text-gray-500 block mb-1 uppercase text-[10px]">Observaciones del Profesional</span>
                                                                <p className="text-gray-700">{h.observaciones}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA 2: NUEVO / EDITAR CONSULTA */}
                    {vista === 'nuevo' && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {exito && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg text-sm text-green-700">
                                    {exito}
                                </div>
                            )}

                            <div className="bg-terracota-50 p-3 rounded-xl border border-terracota-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <span className="text-xs font-bold text-terracota-900 uppercase">
                                    {consultaAEditar ? 'Editando Registro de Historia Clínica' : 'Registrando Nueva Consulta'}
                                </span>
                                {consultaAEditar && (
                                    <button 
                                        type="button" 
                                        onClick={limpiarFormulario}
                                        className="text-xs text-terracota-700 hover:underline cursor-pointer"
                                    >
                                        Cancelar edición
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Profesional Interviniente *</label>
                                    <select 
                                        name="profesional_id"
                                        value={formData.profesional_id}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-terracota-500"
                                    >
                                        <option value="">Seleccionar profesional...</option>
                                        {profesionales.map(prof => (
                                            <option key={prof.id} value={prof.id}>
                                                Dr./Lic. {prof.nombre} {prof.apellido} ({prof.especialidad})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center pt-2 md:pt-5">
                                    <label className="flex items-center space-x-3 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-gray-200 w-full shadow-2xs">
                                        <input 
                                            type="checkbox"
                                            name="es_audiologia"
                                            checked={formData.es_audiologia}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
                                        />
                                        <span className="font-semibold text-xs text-gray-800">
                                            ¿Adjuntar estudio de Audiología (PDF)?
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Motivo de Consulta *</label>
                                <input 
                                    type="text" 
                                    name="motivo_consulta"
                                    value={formData.motivo_consulta}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: Control periódico, hipoacusia percibida, zumbidos..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-terracota-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Antecedentes</label>
                                    <textarea 
                                        name="antecedentes"
                                        value={formData.antecedentes}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Antecedentes patológicos, otológicos, familiares..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-terracota-500"
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Examen Físico / Complementario</label>
                                    <textarea 
                                        name="examen_fisico"
                                        value={formData.examen_fisico}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Otoscopia, hallazgos clínicos..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-terracota-500"
                                    ></textarea>
                                </div>
                            </div>

                            {/* ADJUNTAR ARCHIVO PDF DE AUDIOLOGÍA */}
                            {formData.es_audiologia && (
                                <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 space-y-2 animate-fadeIn">
                                    <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Adjuntar Estudio Escaneado (PDF)</h4>
                                    <input 
                                        type="file"
                                        name="archivo_pdf"
                                        accept="application/pdf"
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
                                    />
                                    <p className="text-[11px] text-teal-700 italic">Sube el archivo PDF con la audiometría / logoaudiometría escaneada del paciente.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Observaciones / Conclusión / Tratamiento</label>
                                <textarea 
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows="2"
                                    placeholder="Indicaciones médicas, recetas, derivaciones..."
                                    className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-terracota-500"
                                ></textarea>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-gray-100">
                                <button 
                                    type="button"
                                    onClick={() => setVista('lista')}
                                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer text-center"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={guardando}
                                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-terracota-500 text-white rounded-xl text-xs font-semibold hover:bg-terracota-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50 text-center"
                                >
                                    {guardando ? 'Guardando...' : (consultaAEditar ? 'Guardar Cambios' : 'Guardar Consulta')}
                                </button>
                            </div>
                        </form>
                    )}

                </div>

                {/* Pie del Modal */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 flex justify-end border-t border-gray-100 shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gray-800 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors cursor-pointer text-center"
                    >
                        Cerrar Ventana
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ModalHistoriaClinica;