require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files from the parent directory
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Check if credentials exist and are valid URLs before initializing
let supabase = null;
if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('Missing or invalid Supabase credentials in .env file. Database will be disconnected.');
}

// ----------------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------------

// 1. Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChronoSync Backend is running.' });
});

// 2. Tasks API
app.get('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  
  const { data, error } = await supabase.from('tasks').select('*');
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });

  const { title, phase, strain, duration, completed } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ title, phase, strain, duration, completed }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });

  const { completed } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .update({ completed })
    .eq('id', req.params.id)
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id);
    
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

// 3. Habits API
app.get('/api/habits', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  const { data, error } = await supabase.from('habits').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/habits', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  const { title, category, icon, streak, days } = req.body;
  const { data, error } = await supabase
    .from('habits')
    .insert([{ title, category, icon, streak, days }])
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put('/api/habits/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  const { title, category, icon, streak, days } = req.body;
  const { data, error } = await supabase
    .from('habits')
    .update({ title, category, icon, streak, days })
    .eq('id', req.params.id)
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/habits/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  const { error } = await supabase.from('habits').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

// 4. Retrospective / Analytics API
app.get('/api/retrospective', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  const { data, error } = await supabase.from('retrospectives').select('*').order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/retrospective', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not connected' });
  const { text } = req.body;
  const { data, error } = await supabase
    .from('retrospectives')
    .insert([{ text }])
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ success: true, message: 'Saved successfully.', data: data[0] });
});


// Catch-all: serve index.html for any non-API routes (local dev only)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start Server only when executed directly (not when imported as a serverless function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless function
module.exports = app;
