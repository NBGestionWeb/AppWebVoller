import React, { useState } from 'react';

function Navbar({ onSelectModule }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (modulo) => {
        onSelectModule(modulo);
        setIsOpen(false); // Cierra el menú en mobile al hacer clic en una opción
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
                <ul className="hidden md:flex space-x-6 font-medium items-center">
                    <li>
                        <button onClick={() => handleSelect('inicio')} className="hover:text-gray-100/80 transition-colors cursor-pointer">
                            Inicio
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('pacientes')} className="hover:text-gray-100/80 transition-colors cursor-pointer">
                            Pacientes
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('turnos')} className="hover:text-gray-100/80 transition-colors cursor-pointer">
                            Turnos
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('medicos')} className="hover:text-gray-100/80 transition-colors cursor-pointer">
                            Profesionales
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleSelect('audifonos')} className="hover:text-gray-100/80 transition-colors cursor-pointer">
                            Audífonos
                        </button>
                    </li>
                </ul>
            </div>

            {/* Menú Desplegable para Móviles (Se muestra solo si isOpen es true) */}
            {isOpen && (
                <ul className="md:hidden bg-terracota-600 px-4 pt-2 pb-4 space-y-2 font-medium border-t border-terracota-400 shadow-inner">
                    <li>
                        <button 
                            onClick={() => handleSelect('inicio')} 
                            className="w-full text-left py-2 px-3 rounded-lg hover:bg-terracota-700 transition-colors cursor-pointer"
                        >
                            Inicio
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('pacientes')} 
                            className="w-full text-left py-2 px-3 rounded-lg hover:bg-terracota-700 transition-colors cursor-pointer"
                        >
                            Pacientes
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('turnos')} 
                            className="w-full text-left py-2 px-3 rounded-lg hover:bg-terracota-700 transition-colors cursor-pointer"
                        >
                            Turnos
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('medicos')} 
                            className="w-full text-left py-2 px-3 rounded-lg hover:bg-terracota-700 transition-colors cursor-pointer"
                        >
                            Profesionales
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => handleSelect('audifonos')} 
                            className="w-full text-left py-2 px-3 rounded-lg hover:bg-terracota-700 transition-colors cursor-pointer"
                        >
                            Audífonos
                        </button>
                    </li>
                </ul>
            )}
        </nav>
    );
}

export default Navbar;