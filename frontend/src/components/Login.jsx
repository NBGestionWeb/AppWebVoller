import React, { useState } from 'react';
import { supabase } from '../config/supabase.js';

function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Autenticación real con Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            const user = authData.user;

            // 2. Buscar los datos adicionales en la tabla 'perfiles'
            const { data: profileData, error: profileError } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.warn('No se encontró un perfil asociado en la base de datos:', profileError.message);
            }

            // 3. Unimos los datos de auth con los del perfil personalizado
            const usuarioCompleto = {
                ...user,
                perfil: profileData || null
            };

            // Pasamos el usuario enriquecido hacia el componente principal
            onLoginSuccess(usuarioCompleto);

        } catch (err) {
            // Mensaje más amigable si el error es de credenciales inválidas
            const mensajeError = err.message.includes('Invalid login credentials')
                ? 'Correo o contraseña incorrectos. Por favor, verifique sus datos.'
                : (err.message || 'Ocurrió un error al iniciar sesión. Verifique sus credenciales.');
            
            setError(mensajeError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-gray-100">
                
                {/* Cabecera del Login */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 tracking-wide">Centro Médico Voller</h2>
                    <p className="text-sm text-gris-medio mt-1">Panel de Acceso Administrativo</p>
                </div>

                {/* Alerta de Error Mejorada */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start space-x-3 transition-all animate-fade-in">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-800">Error de acceso</h3>
                            <p className="text-xs text-red-700 mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@dominio.com"
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:border-terracota-500 outline-none transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-terracota-500 focus:border-terracota-500 outline-none transition-all text-sm"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-terracota-500 hover:bg-terracota-600 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer text-sm disabled:opacity-50"
                    >
                        {loading ? 'Verificando...' : 'Ingresar al Sistema'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gris-medio">
                    Uso exclusivo para personal autorizado.
                </div>

            </div>
        </div>
    );
}

export default Login;