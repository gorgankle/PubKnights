const express = require('express');
const path = require('node:path');

const app = express();
const port = Number(process.env.PREVIEW_PORT) || 8765;
const publicDirectory = path.join(__dirname, '..', 'public');

app.use(express.static(publicDirectory));

app.listen(port, '127.0.0.1', () => {
    console.log(`Sprite preview available at http://127.0.0.1:${port}`);
});
