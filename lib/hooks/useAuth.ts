// lib/hooks/useAuth.ts - VERSIÓN CORREGIDA PARA RECONSTRUIR USUARIO
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Helper para generar CUID válido para desarrollo
function generateValidCUID(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `cl${timestamp}${randomPart}`.substring(0, 25);
}

interface User {
    id: string;
    email: string;
    role: 'EMISOR' | 'INVERSIONISTA';
    emisorProfile?: {
        id: string;
        companyName: string;
        ruc: string;
        sector?: string;
        country?: string;
        description?: string;
        website?: string;
    };
    inversionistaProfile?: {
        id: string;
        firstName: string;
        lastName: string;
        documentType?: string;
        documentNumber?: string;
        phone?: string;
        country?: string;
    };
}

interface UseAuthOptions {
    requireRole?: 'EMISOR' | 'INVERSIONISTA';
    redirectTo?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 1. Intentar obtener usuario completo guardado
                const userData = localStorage.getItem('user');
                let parsedUser: User | null = null;

                if (userData) {
                    try {
                        parsedUser = JSON.parse(userData);
                    } catch (error) {
                        console.warn('Error parsing stored user data:', error);
                    }
                } else {
                    // 2. Si no hay usuario completo, intentar reconstruir desde fragmentos
                    const storedRole = localStorage.getItem('userRole');

                    if (storedRole) {
                        const role = storedRole === 'emisor' ? 'EMISOR' : 'INVERSIONISTA';

                        // Crear usuario base
                        parsedUser = {
                            id: 'local-user',
                            email: 'user@bonoapp.com', // Email por defecto
                            role,
                        };

                        // Agregar perfil específico según el rol
                        if (role === 'EMISOR') {
                            const profileStr = localStorage.getItem('emisorProfile');
                            if (profileStr) {
                                try {
                                    const profileData = JSON.parse(profileStr);

                                    // Generar un CUID válido para desarrollo si no tenemos uno
                                    const validEmisorId = generateValidCUID();

                                    parsedUser.emisorProfile = {
                                        id: validEmisorId,
                                        companyName: profileData.companyName || '',
                                        ruc: profileData.ruc || '',
                                        sector: profileData.sector,
                                        country: profileData.country,
                                        description: profileData.description,
                                        website: profileData.website,
                                    };
                                } catch (error) {
                                    console.warn('Error parsing emisor profile:', error);
                                }
                            }
                        } else if (role === 'INVERSIONISTA') {
                            const profileStr = localStorage.getItem('inversionistaProfile');
                            if (profileStr) {
                                try {
                                    const profileData = JSON.parse(profileStr);
                                    parsedUser.inversionistaProfile = {
                                        id: 'local-inversionista',
                                        firstName: profileData.firstName || '',
                                        lastName: profileData.lastName || '',
                                        documentType: profileData.documentType,
                                        documentNumber: profileData.documentNumber,
                                        phone: profileData.phone,
                                        country: profileData.country,
                                    };
                                } catch (error) {
                                    console.warn('Error parsing inversionista profile:', error);
                                }
                            }
                        }
                    }
                }

                // 3. Verificar si tenemos un usuario válido
                if (parsedUser) {
                    setUser(parsedUser);

                    // 4. Verificar rol requerido
                    if (options.requireRole && parsedUser.role !== options.requireRole) {
                        console.warn(`User role ${parsedUser.role} does not match required role ${options.requireRole}`);
                        if (options.redirectTo) {
                            router.push(options.redirectTo);
                            return;
                        }
                    }
                } else {
                    // 5. No se pudo reconstruir el usuario, redireccionar si es necesario
                    console.warn('No user data found in localStorage');
                    if (options.redirectTo) {
                        router.push(options.redirectTo);
                        return;
                    }
                }

            } catch (error) {
                console.error('Error during auth check:', error);
                if (options.redirectTo) {
                    router.push(options.redirectTo);
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [options.requireRole, options.redirectTo, router]);

    const logout = () => {
        // Limpiar todos los datos de autenticación
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('emisorProfile');
        localStorage.removeItem('inversionistaProfile');

        setUser(null);
        router.push('/auth/login');
    };

    // Helper para verificar si el usuario tiene perfil completo
    const hasCompleteProfile = (): boolean => {
        if (!user) return false;

        if (user.role === 'EMISOR') {
            return !!(user.emisorProfile?.companyName && user.emisorProfile?.ruc);
        } else if (user.role === 'INVERSIONISTA') {
            return !!(user.inversionistaProfile?.firstName && user.inversionistaProfile?.lastName);
        }

        return false;
    };

    // Helper para guardar usuario completo (opcional, para futuras mejoras)
    const saveCompleteUser = (userData: User) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    return {
        user,
        isLoading,
        logout,
        isAuthenticated: !!user,
        hasCompleteProfile: hasCompleteProfile(),
        saveCompleteUser,
    };
}