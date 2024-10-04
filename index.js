// Importar dependencias
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importa la librería cors
const fs = require('fs'); // Importa el módulo File System para escribir archivos

// Configurar la aplicación y el puerto
const app = express();
const port = 7000;

// Middleware para parsear JSON
app.use(express.json());
app.use(cors());

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

// Ruta para recibir el JSON y almacenarlo en MongoDB
app.post('/', async (req, res) => {
  try {

    console.log(req);
     // Guardar el JSON recibido en un archivo de log con la fecha actual
     const logData = `Fecha: ${new Date().toISOString()}\n${JSON.stringify(req.body, null, 2)}\n\n`;
     fs.appendFileSync('./log.txt', logData); // Guardar en un archivo llamado "log.txt" en la ruta del proyecto

    // Crear una nueva instancia del modelo con el JSON recibido
    const newData = new InputData(req.body);
    
    // Guardar el documento en la base de datos
    await newData.save();

   

    // Responder con éxito
    console.log('Guardado ok');
    console.log(JSON.stringify(req.body, null, 2));
    res.status(200).json({ message: 'Datos guardados exitosamente en MongoDB', data: req.body });
  } catch (error) {
    console.log('Error con los datos');
    fs.appendFileSync('./log.txt', 'Error con los datos');

    // Registrar el error en el archivo de log
    const errorLog = `Fecha: ${new Date().toISOString()}\nError al guardar datos: ${error.message}\nDatos: ${JSON.stringify(req.body, null, 2)}\n\n`;
    fs.appendFileSync('./log.txt', errorLog); // Guardar en un archivo llamado "log.txt" en la ruta del proyecto
  

    console.log(JSON.stringify(req.body, null, 2));
    console.error('Error al guardar datos:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud', error });
  }
});

// Nueva ruta para obtener los datos almacenados
app.get('/data', async (req, res) => {
  try {
    const data = await InputData.find();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener los datos:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
});


// Iniciar el servidor
app.listen(port, () => {
  console.log(`API Rest escuchando en http://localhost:${port}`);
});
