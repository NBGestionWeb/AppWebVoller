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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        💬 Enviar Recordatorio por WhatsApp
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 py-1 rounded-lg cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-3 text-sm">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Teléfono del Paciente</label>
                        <input 
                            type="text" 
                            value={telefono} 
                            onChange={(e) => setTelefono(e.target.value)}
                            placeholder="Ej: +5491123456789"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Vista previa del mensaje</label>
                        <textarea 
                            rows="5"
                            value={mensaje} 
                            onChange={(e) => setMensaje(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:outline-none text-xs text-gray-700 leading-relaxed"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleEnviarWhatsApp}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors cursor-pointer text-sm flex items-center gap-2 shadow-sm"
                    >
                        Abrir WhatsApp 🚀
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalRecordatorioWa;