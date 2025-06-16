import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    role: 'EMISOR' | 'INVERSIONISTA';
    emisorProfile?: {
        id: string;
        companyName: string;
        ruc: string;
    };
    inversionistaProfile?: {
        id: string;
        firstName: string;
        lastName: string;
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
        // Simular obtención de usuario autenticado
        // En implementación real, esto vendría de un API o context
        const checkAuth = async () => {
            try {
                // Por ahora, usar datos del localStorage como fallback
                const userData = localStorage.getItem('user');
                if (userData) {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);

                    // Verificar rol si es requerido
                    if (options.requireRole && parsedUser.role !== options.requireRole) {
                        if (options.redirectTo) {
                            router.push(options.redirectTo);
                            return;
                        }
                    }
                } else if (options.redirectTo) {
                    router.push(options.redirectTo);
                    return;
                }
            } catch (error) {
                console.error('Error checking auth:', error);
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
        localStorage.removeItem('user');
        setUser(null);
        router.push('/auth/login');
    };

    return {
        user,
        isLoading,
        logout,
        isAuthenticated: !!user,
    };
}