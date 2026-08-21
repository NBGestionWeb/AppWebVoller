import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function usePermisos() {
    const [permisos, setPermisos] = useState([]);
    const [loadingPermisos, setLoadingPermisos] = useState(true);
    const [esAdmin, setEsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function obtenerPermisosUsuario() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    if (isMounted) {
                        setPermisos([]);
                        setEsAdmin(false);
                    }
                    return;
                }

                const userEmail = session.user.email;
                const userId = session.user.id;


                // Verificamos si es el admin principal
                if (userEmail === 'admin@voller.com') {
                    if (isMounted) {
                        setEsAdmin(true);
                    }
                } else {
                    // Si no es el admin, buscamos sus permisos en la tabla personal usando auth_user_id
                    const { data, error } = await supabase
                        .from('personal')
                        .select('permisos')
                        .eq('auth_user_id', userId)
                        .maybeSingle();

                    if (error) {
                        console.error("usePermisos - Error en consulta a Supabase:", error.message);
                        throw error;
                    }


                    if (isMounted) {
                        setPermisos(data?.permisos || []);
                    }
                }
            } catch (err) {
                console.error('Error al cargar permisos:', err.message);
            } finally {
                if (isMounted) {
                    setLoadingPermisos(false);
                }
            }
        }

        obtenerPermisosUsuario();

        return () => {
            isMounted = false;
        };
    }, []);

    // Función para verificar si tiene un permiso específico
    const tienePermiso = (permisoRequerido) => {
        if (esAdmin) {
            return true;
        }
        const autorizado = permisos.includes(permisoRequerido);
        return autorizado;
    };

    return { permisos, tienePermiso, loadingPermisos, esAdmin };
}