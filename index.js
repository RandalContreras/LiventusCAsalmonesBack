// Importar dependencias 
const mongoose = require('mongoose');
const http = require('http');

// Configurar la aplicación y el puerto
const port = 7000;

// Conexión a la base de datos MongoDB
const mongoURI = 'mongodb+srv://liventusUser:L1v3ntus_2024@liventuscluster0.2l1ih.mongodb.net/sensores_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch((err) => console.error('Error al conectar a MongoDB', err));

// Definir un esquema para el documento de entrada
const inputSchema = new mongoose.Schema({
  input1: {
    timestamp: Number,
    date: String,
    bdate: { type: String, default: null },
    server_id: Number,
    bserver_id: Number,
    addr: Number,
    baddr: { type: String, default: null },
    full_addr: String,
    size: Number,
    data: String,
    raw_data: { type: String, default: null },
    server_name: String,
    ip: String,
    name: String,
  }
}, { collection: 'input_data' });

// Crear un modelo basado en el esquema
const InputData = mongoose.model('InputData', inputSchema);

// Función para convertir fecha UTC a UTC-3 en el formato "DD/MM/YYYY HH:mm:ss"
const convertToUtcMinus3 = (utcDateStr) => {
  const [datePart, timePart] = utcDateStr.split(" "); // Separar la fecha y hora
  const [day, month, year] = datePart.split("/"); // Separar día, mes y año
  const [hours, minutes, seconds] = timePart.split(":"); // Separar horas, minutos y segundos

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  date.setHours(date.getHours() - 3); // Restar 3 horas para ajustar a UTC-3

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

// Crear el servidor HTTP
const server = http.createServer(async (req, res) => {

  // Agregar cabeceras de CORS a todas las solicitudes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar solicitudes OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Manejar solicitudes POST
  if (req.method === 'POST' && req.url === '/') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const jsonData = JSON.parse(body);
        const newData = new InputData(jsonData);
        await saveMongo(newData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', receivedData: jsonData }));
      } catch (error) {
        console.error('Error al procesar la solicitud:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
      }
    });
    return; // Añadir return aquí para evitar ejecución posterior de otros bloques
  }

  // Manejar solicitudes GET a "/grafico"
  if (req.method === 'GET' && req.url === '/grafico') {
    try {
      const data = await InputData.find({
        'input1.name': { $nin: ['Presion_Atmosferica', 'Sensor_Virtual'] }
      });

      // Convertir las fechas a UTC-3
      const result = data.map(item => {
        item.input1.date = convertToUtcMinus3(item.input1.date);
        return item;
      });

      const totalCount = await InputData.countDocuments();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: result, totalCount }));
    } catch (error) {
      console.error('Error al obtener los datos de la base de datos:', error);
      if (!res.headersSent) { // Verifica si ya se han enviado los encabezados
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Error al obtener los datos' }));
      }
    }
    return; // Añadir return aquí para evitar ejecución posterior de otros bloques
  }

  // Manejar solicitudes GET a "/graficoConFecha"
  if (req.method === 'GET' && req.url.startsWith('/graficoConFecha')) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const page = parseInt(urlParams.get('page')) || 0;
    const limit = parseInt(urlParams.get('limit')) || 5;
    const fechaInicio = urlParams.get('fecha_inicio');
    const fechaTermino = urlParams.get('fecha_termino');

    if (!fechaInicio || !fechaTermino) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Faltan parámetros de fecha' }));
      return;
    }

    try {
      const data = await InputData.find({
        'input1.name': { $nin: ['Presion_Atmosferica', 'Sensor_Virtual'] },
        'input1.date': { $gte: fechaInicio, $lte: fechaTermino }
      })
        .sort({ '_id': -1 })
        .skip(page * limit)
        .limit(limit);

      // Convertir las fechas a UTC-3
      const result = data.map(item => {
        item.input1.date = convertToUtcMinus3(item.input1.date);
        return item;
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: result }));

    } catch (error) {
      console.error('Error al obtener los datos de la base de datos:', error);
      if (!res.headersSent) { // Verifica si ya se han enviado los encabezados
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Error al obtener los datos' }));
      }
    }
    return; // Añadir return aquí para evitar ejecución posterior de otros bloques
  }

  // Manejar solicitudes GET a la raíz para devolver documentos paginados
  if (req.method === 'GET' && req.url.startsWith('/?')) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const page = parseInt(urlParams.get('page')) || 0;
    const limit = parseInt(urlParams.get('limit')) || 5;

    try {
      const data = await InputData.find({
        'input1.name': { $nin: ['Presion_Atmosferica', 'Sensor_Virtual'] }
      })
        .sort({ '_id': -1 })
        .skip(page * limit)
        .limit(limit);

      // Convertir las fechas a UTC-3
      const result = data.map(item => {
        item.input1.date = convertToUtcMinus3(item.input1.date);
        return item;
      });

      const totalCount = await InputData.countDocuments();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: result, totalCount }));

    } catch (error) {
      console.error('Error al obtener los datos de la base de datos:', error);
      if (!res.headersSent) { // Verifica si ya se han enviado los encabezados
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Error al obtener los datos' }));
      }
    }
    return; // Añadir return aquí para evitar ejecución posterior de otros bloques
  }

  // Manejo de rutas no encontradas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
});

// Función para guardar en MongoDB
const saveMongo = async (newData) => {
  try {
    await newData.save();
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
};

// Iniciar el servidor
server.listen(port, () => {
  console.log(`API Rest escuchando en http://localhost:${port}`);
});
