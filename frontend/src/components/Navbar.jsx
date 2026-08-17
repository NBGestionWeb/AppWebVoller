import React from 'react';

function Navbar({ onSelectModule }) {
    return (
        <nav className="bg-terracota-500 text-white p-4 shadow-lg">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-wide cursor-pointer" onClick={() => onSelectModule('inicio')}>
                    Voller
                </h1>
                <ul className="flex space-x-6 font-medium items-center">
                    <li>
                        <button 
                            onClick={() => onSelectModule('inicio')} 
                            className="hover:text-gray-100/80 transition-colors cursor-pointer"
                        >
                            Inicio
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => onSelectModule('pacientes')} 
                            className="hover:text-gray-100/80 transition-colors cursor-pointer"
                        >
                            Pacientes
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => onSelectModule('turnos')} 
                            className="hover:text-gray-100/80 transition-colors cursor-pointer"
                        >
                            Turnos
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => onSelectModule('medicos')} 
                            className="hover:text-gray-100/80 transition-colors cursor-pointer"
                        >
                            Profesionales
                        </button>
                    </li>
                    <li>
                        <button 
                            onClick={() => onSelectModule('audifonos')} 
                            className="hover:text-gray-100/80 transition-colors cursor-pointer"
                        >
                            Audífonos
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;