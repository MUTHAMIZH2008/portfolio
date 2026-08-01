const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const Twilio = require('twilio');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

dotenv.config();
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  imageUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Contact = mongoose.model("Contact", contactSchema);
const app = express();
const port = process.env.PORT || 3000;

// ---- Twilio (SMS) config ----
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const targetPhone = process.env.TARGET_PHONE_NUMBER;

// ---- Email (Nodemailer / Gmail) config ----
const emailUser = process.env.EMAIL_USER;       // your Gmail address
const emailPass = process.env.EMAIL_PASS;       // Gmail App Password (not your normal password)
const emailTo = process.env.EMAIL_TO || emailUser; // where you want to receive messages

if (!accountSid || !authToken || !twilioPhone || !targetPhone) {
  console.error('Missing Twilio environment variables. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TARGET_PHONE_NUMBER.');
  process.exit(1);
}

if (!emailUser || !emailPass) {
  console.error('Missing email environment variables. Please set EMAIL_USER and EMAIL_PASS (Gmail App Password).');
  process.exit(1);
}

const twilioClient = Twilio(accountSid, authToken);

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.post('/send-message', async (req, res) => {
  const { name, email, message, imageUrl } = req.body;
  console.log(req.body);
  try {
    const contact = new Contact({
        name,
        email,
        message,
        imageUrl
    });

    await contact.save();
    console.log("✅ Data Saved to MongoDB");
} catch (err) {
    console.log("❌ Database Error:", err);
}
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const smsBody = `New portfolio message from ${name} (${email}):\n\n${message}\n\nImage: ${imageUrl || 'none'}`;

  const mailOptions = {
    from: `"Portfolio Contact Form" <${emailUser}>`,
    to: emailTo,
    replyTo: email,
    subject: `New portfolio message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nImage: ${imageUrl || 'none'}`,
    html: `
      <h3>New portfolio contact message</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
      ${imageUrl ? `<p><strong>Image:</strong> <a href="${imageUrl}">${imageUrl}</a></p>` : ''}
    `,
  };

  // Send SMS and email in parallel; don't let one failure block the other
  const [smsResult, emailResult] = await Promise.allSettled([
    twilioClient.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: targetPhone,
    }),
    mailTransporter.sendMail(mailOptions),
  ]);

  const smsOk = smsResult.status === 'fulfilled';
  const emailOk = emailResult.status === 'fulfilled';

  if (!smsOk) {
    console.error('Twilio send failed:', smsResult.reason);
  }
  if (!emailOk) {
    console.error('Email send failed:', emailResult.reason);
  }

  if (smsOk || emailOk) {
    res.json({
      success: true,
      sms: smsOk ? { sid: smsResult.value.sid } : { error: 'SMS failed' },
      email: emailOk ? { messageId: emailResult.value.messageId } : { error: 'Email failed' },
    });
  } else {
    res.status(500).json({ error: 'Failed to send both SMS and email.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
