const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'API del Centro Médico Voller funcionando correctamente' });
    });

    app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});