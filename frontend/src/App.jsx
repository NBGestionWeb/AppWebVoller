import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Inicio from './pages/Inicio';
import Pacientes from './pages/Pacientes'; 
import Profesionales from './pages/Profesionales';
import Turnos from './pages/Turnos';
import Audifonos from './pages/Audifonos';
import Personal from './pages/Personal';
import { supabase } from './config/supabase.js'; 

function App() {
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [moduloActivo, setModuloActivo] = useState('inicio');

  React.useEffect(() => {
    async function cargarSesionYPerfil() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUsuario({
          ...session.user,
          perfil: profileData || null
        });
      }
      setLoading(false);
    }

    cargarSesionYPerfil();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUsuario({
          ...session.user,
          perfil: profileData || null
        });
      } else {
        setUsuario(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gris-medio text-sm sm:text-base">
        Cargando sistema...
      </div>
    );
  }

  if (!session) {
    return (
      <Login 
        onLoginSuccess={(usuarioCompleto) => {
          setUsuario(usuarioCompleto);
          setModuloActivo('inicio');
        }} 
      />
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  };

  const esAdmin = usuario?.perfil?.rol === 'admin';
  const nombreUsuario = usuario?.email || 'Usuario';

  return (
    <div className="min-h-screen bg-gray-50 text-gris-oscuro flex flex-col justify-between">
      <div>
        <Navbar onSelectModule={setModuloActivo} moduloActivo={moduloActivo} usuario={usuario} />

        <main className="container mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          {moduloActivo === 'inicio' && (
            <div className="space-y-6">
              <Inicio />
            </div>
          )}

          {moduloActivo === 'pacientes' && (
            <Pacientes />
          )}

          {moduloActivo === 'medicos' && (
            <Profesionales />
          )}

          {moduloActivo === 'turnos' && (
            <Turnos />
          )}

          {moduloActivo === 'audifonos' && (
            <Audifonos />
          )}

          {moduloActivo === 'personal' && (
            esAdmin ? <Personal /> : <AccesoRestringido />
          )}
        </main>
      </div>

      <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-12 py-5 sm:py-6 px-4 sm:px-8 shadow-inner">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">Voller - Centro Médico</h3>
            <p className="text-xs text-gris-medio mt-0.5">
              Panel general del centro médico.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Usuario: <span className="font-medium text-gray-700">{nombreUsuario}</span>
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full sm:w-auto text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 px-4 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer bg-red-50/50 shadow-xs"
          >
            Cerrar Sesión
          </button>
        </div>
      </footer>
    </div>
  );
}

function AccesoRestringido() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-12 rounded-2xl text-center shadow-sm space-y-2">
        <h3 className="text-lg font-bold">Acceso Restringido</h3>
        <p className="text-sm">Solo el perfil del administrador puede ver el módulo personal.</p>
      </div>
    </div>
  );
}

export default App;