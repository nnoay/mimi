const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;
const FILE = path.join(__dirname, 'appointments.json');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create appointments.json if it doesn't exist
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]));

// Allowed time slots
const allowedSlotsWeekdays = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00'
];
const allowedSlotsSaturday = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'
];

// Nodemailer configuration (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'orm49364@gmail.com', // ✅ Replace with your Gmail
    pass: 'ahqz loeg qaqk uwbf'     // ✅ Replace with your App Password
  }
});

// POST route to handle bookings
app.post('/book', (req, res) => {
  const { name, email, phone, service, date, time, message } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !service || !date || !time) {
    return res.status(400).send('⛔ Tous les champs obligatoires doivent être remplis.');
  }

  const day = new Date(date).getDay(); // 0 = Sunday, 6 = Saturday

  // Sunday is not allowed
  if (day === 0) {
    return res.send('⛔ Le docteur ne travaille pas le dimanche.');
  }

  // Choose allowed time slots based on day
  const allowedSlots = (day === 6) ? allowedSlotsSaturday : allowedSlotsWeekdays;

  if (!allowedSlots.includes(time)) {
    return res.send('⛔ Heure non disponible pour ce jour. Veuillez choisir un créneau valide.');
  }

  // Load current appointments
  let appointments;
  try {
    appointments = JSON.parse(fs.readFileSync(FILE));
  } catch {
    appointments = [];
  }

  // Check for time conflict
  const conflict = appointments.find(appt => appt.date === date && appt.time === time);
  if (conflict) {
    return res.send('⛔ Ce créneau horaire est déjà réservé.');
  }

  // Save appointment
  const newAppointment = { name, email, phone, service, date, time, message, timestamp: Date.now() };
  appointments.push(newAppointment);
  fs.writeFileSync(FILE, JSON.stringify(appointments, null, 2));

  // Send confirmation email
  const mailOptions = {
    from: 'orm49364@gmail.com',
    to: email,
    subject: 'Confirmation de votre rendez-vous',
    text: `Bonjour ${name},

Votre rendez-vous a été confirmé avec succès.

📅 Date : ${date}
🕒 Heure : ${time}
💉 Service : ${service}

Merci pour votre confiance !

— Cabinet médical esthétique`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur email :', error);
    } else {
      console.log('Email envoyé :', info.response);
    }
  });

  // ✅ Redirect to confirmation page
  res.redirect('/success.html');
});

// Optional: allow admin to view appointments
app.get('/appointments', (req, res) => {
  if (req.query.admin !== '1') return res.status(403).send('Accès refusé');
  try {
    const appointments = JSON.parse(fs.readFileSync(FILE));
    res.json(appointments);
  } catch {
    res.json([]);
  }
});

// Optional: allow admin to delete an appointment
app.delete('/delete/:index', (req, res) => {
  if (req.query.admin !== '1') return res.status(403).send('Accès refusé');
  try {
    let appointments = JSON.parse(fs.readFileSync(FILE));
    appointments.splice(req.params.index, 1);
    fs.writeFileSync(FILE, JSON.stringify(appointments, null, 2));
    res.send('Supprimé');
  } catch {
    res.status(500).send('Erreur serveur');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
