const express = require('express');
const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Ruta que recibe cualquier JSON y lo responde
app.post('/json', (req, res) => {
  const receivedJson = req.body;
  console.log('JSON Received:', receivedJson);
  res.status(200).json({
    message: 'JSON received successfully',
    data: receivedJson,
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`API Rest escuchando en http://localhost:${port}`);
});
