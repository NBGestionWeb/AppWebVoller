import React, { useState } from 'react';

function ModalRecordatorioWa({ isOpen, onClose, turno }) {
    if (!isOpen || !turno) return null;

    const pacienteNombre = turno.pacientes 
        ? `${turno.pacientes.nombre} ${turno.pacientes.apellido}` 
        : 'Paciente';
        
    const profesionalNombre = turno.profesionales 
        ? `Dr./Dra. ${turno.profesionales.apellido}` 
        : 'el profesional asignado';

    // Formatear fecha legible
    const formatearFechaHora = (fechaStr) => {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr);
        return new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(fecha);
    };

    const fechaFormateada = formatearFechaHora(turno.fecha_hora);

    // Mensaje predeterminado personalizable
    const [mensaje, setMensaje] = useState(
        `Hola *${pacienteNombre}*, te escribimos desde el centro médico para recordarte tu turno programado para el *${fechaFormateada}* con ${profesionalNombre}. Por favor, responde *CONFIRMAR* para validar tu asistencia. ¡Te esperamos!`
    );

    const telefonoPaciente = turno.pacientes?.telefono || '';
    const [telefono, setTelefono] = useState(telefonoPaciente);

    const handleEnviarWhatsApp = () => {
        if (!telefono) {
            alert("Por favor, ingresa un número de teléfono válido.");
            return;
        }

        // Limpiar el teléfono de espacios o guiones
        const telefonoLimpio = telefono.replace(/\D/g, '');
        const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
        
        window.open(url, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-4 sm:p-6 space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Cabecera */}
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 shrink-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2 pr-2">
                        💬 Enviar Recordatorio por WhatsApp
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold px-2 py-1 rounded-lg cursor-pointer leading-none shrink-0"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido desplazable */}
                <div className="space-y-3 sm:space-y-4 text-sm overflow-y-auto flex-1 pr-1">
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teléfono del Paciente</label>
                        <input 
                            type="text" 
                            value={telefono} 
                            onChange={(e) => setTelefono(e.target.value)}
                            placeholder="Ej: +5491123456789"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:outline-none text-xs sm:text-sm bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Vista previa del mensaje</label>
                        <textarea 
                            rows="5"
                            value={mensaje} 
                            onChange={(e) => setMensaje(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:outline-none text-xs text-gray-700 leading-relaxed bg-white"
                        />
                    </div>
                </div>

                {/* Pie del modal con botones adaptables */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-gray-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer text-xs sm:text-sm text-center"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleEnviarWhatsApp}
                        className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm text-center"
                    >
                        Abrir WhatsApp 🚀
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalRecordatorioWa;