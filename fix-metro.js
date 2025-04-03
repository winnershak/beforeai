// Enhanced Metro configuration for reliable bundling
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  
  return {
    ...config,
    maxWorkers: 2, // Reduces memory usage
    cacheStores: [], // Disable caching for development
    transformer: {
      ...config.transformer,
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: false, // Disable for faster refreshes
        },
      }),
    },
    server: {
      port: 8081,
      enhanceMiddleware: (middleware) => {
        return (req, res, next) => {
          // Clear cache headers
          res.setHeader('Cache-Control', 'no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          // Fix iOS 18 URL handling
          if (req.url.includes('&platform=ios')) {
            req.url = req.url.replace('&platform=ios', '');
          }
          
          return middleware(req, res, next);
        };
      },
    },
  };
})(); 