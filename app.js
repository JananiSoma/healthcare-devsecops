const express = require('express');
const app = express();
const patients = [{ id: 1, name: 'Test Patient', condition: 'Demo' }]; // dummy data only
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/patients/:id', (req, res) => {
  const p = patients.find(x => x.id == req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'not found' });
});
app.listen(3000);
