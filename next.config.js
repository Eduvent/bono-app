/** @type {import('next').NextConfig} */
const nextConfig = {
    // Mover serverComponentsExternalPackages a serverExternalPackages
    serverExternalPackages: ['@prisma/client', 'prisma'],

    experimental: {
        // Remover serverComponentsExternalPackages de aquí
        // serverComponentsExternalPackages: ['@prisma/client', 'prisma'], // ← ELIMINAR ESTA LÍNEA
    },

    // Otras configuraciones que puedas tener
    transpilePackages: ['lucide-react'],

    webpack: (config, { dev, isServer }) => {
        // Configuración adicional de webpack si es necesaria
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;