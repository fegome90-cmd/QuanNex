const express = require('express');
const app = express();

app.get('/api', (req, res) => {
  res.json({ message: 'Mixed React + Express API' });
});

module.exports = app;
