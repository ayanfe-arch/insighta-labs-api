require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const app = express()
app.set('trust proxy', 1)

// Logging
app.use(morgan('combined'))

// CORS
app.use(cors({
    origin: process.env.WEB_PORTAL_URL || 'http://localhost:5173',
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { status: "error", message: "Too many requests" }
})

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { status: "error", message: "Too many requests" }
})

//app.use('/auth', authLimiter)
app.use('/api', apiLimiter)

// Routes
app.use('/auth', require('./routes/auth'))
app.use('/api/profiles', require('./routes/profiles'))

// MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('Connection failed', err.message))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

console.log("ENV TEST:", 
process.env.GITHUB_CLIENT_ID);