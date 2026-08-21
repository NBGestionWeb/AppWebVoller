import React, { useState } from 'react';

function Navbar({ onSelectModule, moduloActivo, usuario }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (modulo) => {
        onSelectModule(modulo);
        setIsOpen(false); // Cierra el menú en mobile al hacer clic en una opción
    };

    // Verificamos si el usuario actual es administrador
    // (Asumiendo que el rol viene en usuario.perfil.rol o una propiedad similar)
    const esAdmin = usuario?.perfil?.rol === 'admin' || usuario?.perfil?.es_admin === true;

    // Función auxiliar para definir los estilos de los botones según si están activos
    const getButtonClass = (modulo) => {
        const isActive = moduloActivo === modulo;
        return `transition-colors cursor-pointer rounded-lg px-3 py-1.5 font-medium ${
            isActive 
                ? 'bg-terracota-700 text-white shadow-inner' 
                : 'hover:bg-terracota-600 text-white/90 hover:text-white'
        }`;
    };

    const getMobileButtonClass = (modulo) => {
        const isActive = moduloActivo === modulo;
        return `w-full text-left py-2 px-3 rounded-lg transition-colors cursor-pointer ${
            isActive 
                ? 'bg-terracota-700 text-white font-semibold' 
                : 'hover:bg-terracota-700 text-white/90'
        }`;
    };

    return (
        <nav className="bg-terracota-500 text-white shadow-lg sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                {/* Logo / Título */}
                <h1 
                    className="text-2xl font-bold tracking-wide cursor-pointer" 
                    onClick={() => handleSelect('inicio')}
                >
                    Voller
                </h1>

                {/* Botón Hamburguesa (Visible solo en dispositivos móviles) */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden text-white p-2 rounded-lg hover:bg-terracota-600 focus:outline-none cursor-pointer transition-colors"
                    aria-label="Abrir menú"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>

                {/* Menú de Escritorio (Oculto en celulares) */}
                <ul className="hidden md:flex space-x-2 font-medium items-center">
                    <li>
                        <button onClick={() => handleSelect('inicio')} className={getButtonClass('inicio')}>
                            Inicio
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('pacientes')} className={getButtonClass('pacientes')}>
                            Pacientes
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('turnos')} className={getButtonClass('turnos')}>
                            Turnos
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('medicos')} className={getButtonClass('medicos')}>
                            Profesionales
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('audifonos')} className={getButtonClass('audifonos')}>
                            Audífonos
                        </button>
                    </li>
                    {/* Renderizado condicional: Solo visible si es administrador */}
                    {esAdmin && (
                        <li>
                            <button onClick={() => handleSelect('personal')} className={getButtonClass('personal')}>
                                Personal
                            </button>
                        </li>
                    )}
                </ul>
            </div>

            {/* Menú Desplegable para Móviles (Se muestra solo si isOpen es true) */}
            {isOpen && (
                <ul className="md:hidden bg-terracota-600 px-4 pt-2 pb-4 space-y-2 font-medium border-t border-terracota-400 shadow-inner">
                    <li>
                        <button 
                            onClick={() => handleSelect('inicio')} 
                            className={getMobileButtonClass('inicio')}
                        >
                            Inicio
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('pacientes')} 
                            className={getMobileButtonClass('pacientes')}
                        >
                            Pacientes
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('turnos')} 
                            className={getMobileButtonClass('turnos')}
                        >
                            Turnos
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('medicos')} 
                            className={getMobileButtonClass('medicos')}
                        >
                            Profesionales
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('audifonos')} 
                            className={getMobileButtonClass('audifonos')}
                        >
                            Audífonos
                        </button>
                    </li>
                    {/* Renderizado condicional móvil: Solo visible si es administrador */}
                    {esAdmin && (
                        <li>
                            <button 
                                onClick={() => handleSelect('personal')} 
                                className={getMobileButtonClass('personal')}
                            >
                                Personal
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </nav>
    );
}

export default Navbar;