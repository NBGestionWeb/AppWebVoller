import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Inicio from './pages/Inicio';
import Pacientes from './pages/Pacientes'; 
import Profesionales from './pages/Profesionales';
import Turnos from './pages/Turnos';
import Audifonos from './pages/Audifonos';
import { supabase } from './config/supabase.js'; 

function App() {
  const [session, setSession] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moduloActivo, setModuloActivo] = useState('inicio');

  useEffect(() => {
    const fetchSessionAndProfile = async (currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        try {
          const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (!error && data) {
            setPerfilUsuario(data);
          } else {
            setPerfilUsuario(null);
          }
        } catch (err) {
          console.error('Error al obtener perfil:', err.message);
          setPerfilUsuario(null);
        }
      } else {
        setPerfilUsuario(null);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionAndProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionAndProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gris-medio">
        Cargando sistema...
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const rol = perfilUsuario?.rol || 'recepcionista';

  // Verificación de permisos según el rol:
  // - administrador: acceso total
  // - profesional: agenda (vista), pacientes (vista)
  // - recepcionista: turnos (crear/editar), pacientes (crear/editar), profesionales (vista)
  const puedeVerAgenda = rol === 'administrador' || rol === 'profesional' || rol === 'recepcionista';
  const puedeVerPacientes = rol === 'administrador' || rol === 'profesional' || rol === 'recepcionista';
  const puedeVerMedicos = rol === 'administrador' || rol === 'recepcionista';
  const puedeVerAudifonos = rol === 'administrador' || rol === 'recepcionista';

  return (
    <div className="min-h-screen bg-gray-50 text-gris-oscuro flex flex-col justify-between">
      <div>
        <Navbar onSelectModule={setModuloActivo} rolUsuario={rol} />

        <main className="container mx-auto p-8">
          {moduloActivo === 'inicio' && (
            <div className="space-y-6">
              {/* Componente de Inicio que muestra los turnos de la semana */}
              <Inicio />
            </div>
          )}

          {moduloActivo === 'pacientes' && puedeVerPacientes && (
            <Pacientes rolUsuario={rol} />
          )}

          {moduloActivo === 'medicos' && puedeVerMedicos && (
            <Profesionales rolUsuario={rol} />
          )}

          {moduloActivo === 'turnos' && puedeVerAgenda && (
            <Turnos rolUsuario={rol} />
          )}

          {moduloActivo === 'audifonos' && puedeVerAudifonos && (
            <Audifonos rolUsuario={rol} />
          )}
        </main>
      </div>

      {/* Footer / Pie de página con el panel de bienvenida y cierre de sesión */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6 px-8 shadow-inner">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Voller - Centro Médico</h3>
            <p className="text-xs text-gris-medio mt-0.5">
              Panel general del centro médico. Perfil actual: <span className="font-semibold capitalize text-terracota-600">{rol}</span>
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer bg-red-50/50"
          >
            Cerrar Sesión
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;