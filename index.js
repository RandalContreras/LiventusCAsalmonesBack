// Importar dependencias
const mongoose = require('mongoose');
const cors = require('cors'); // Importa la librería cors
const fs = require('fs'); // Importa el módulo File System para escribir archivos
const http = require('http'); // Importar el módulo http nativo de Node.js


// Configurar la aplicación y el puerto
const port = 7000;

// Middleware para parsear JSON
//app.use(express.json());


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

// Crear el servidor HTTP
const server = http.createServer((req, res) => {
  // Solo aceptar solicitudes POST en la ruta raíz
  if (req.method === 'POST' && req.url === '/') {
      let body = '';

      // Escuchar el evento 'data' para recibir los datos del cuerpo de la solicitud
      req.on('data', chunk => {
          body += chunk.toString(); // Convertir los datos binarios a string y agregarlos al cuerpo
      });

      // Una vez que se recibe todo el cuerpo de la solicitudc
      req.on('end', () => {
          try {
              console.log(body);

              // Intentar analizar el cuerpo como JSON
              const jsonData = JSON.parse(body);

              // Crear una nueva instancia del modelo con el JSON recibido
              const newData = new InputData(req.body);
              
              saveMongo(newData);
              

              // Procesar el JSON recibido según sea necesario (aquí se imprime en consola)
              console.log('Solicitud recibida con el siguiente cuerpo:', jsonData);

              // Enviar una respuesta de éxito
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'success', receivedData: jsonData }));
          } catch (error) {
              // Manejar errores en caso de que el cuerpo no sea JSON válido
              console.error('Error al procesar la solicitud:', error.message);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
          }
      });
  } else {
      // Manejar cualquier solicitud que no sea POST a la raíz
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
  }
});

const saveMongo = async (newData) => {
  try {
    // Guardar el documento en la base de datos
    await newData.save();

    // Devuelve `true` si el valor es mayor a 10, en caso contrario devuelve `false`
    return true;
  } catch (error) {
    console.error('Error processing value:', error);
    // En caso de error, se podría manejar de alguna manera o devolver `false`
    return false;
  }
};


// Iniciar el servidor
server.listen(port, () => {
  console.log(`API Rest escuchando en http://localhost:${port}`);
});
