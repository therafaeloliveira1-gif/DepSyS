require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/apiRoutes');
const { initDatabase } = require('./src/repositories/depositRepository');

const app = express();
const PORT = process.env.PORT || 3015;

app.use(cors());
app.use(express.json());

// Montar rutas de la API
app.use('/api', apiRoutes);

// Endpoint de diagnóstico rápido
app.get('/', (req, res) => {
  res.json({
    app: 'DepSyS Backend API - Motos Mendes S.A.',
    version: '1.0.0',
    status: 'ONLINE',
    port: PORT,
    endpoints: {
      status: '/api/status',
      pedidos: '/api/pedidos/:num_pedido',
      operarios: '/api/operarios',
      mesas: '/api/mesas',
      notas: '/api/notas'
    }
  });
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error('[DepSyS API Error]:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Error interno en el servidor de depósito DepSyS',
    detalles: err.message
  });
});

// Inicializar base de datos y arrancar servidor
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log('===============================================================');
      console.log(`📦 DepSyS Backend API corriendo en http://localhost:${PORT}`);
      console.log('🔌 Conectado a ERP SGLoja: c:\\WorkSpace\\System\\SGLoja\\Dados\\FB_DADOS.FDB');
      console.log('🔌 Conectado a Depósito MySQL: mendes_db (localhost:3306)');
      console.log('===============================================================');
    });
  } catch (err) {
    console.error('❌ Error fatal al iniciar DepSyS Backend:', err);
    process.exit(1);
  }
}

startServer();
