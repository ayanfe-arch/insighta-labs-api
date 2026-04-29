const express = require('express')
const router = express.Router()
const { githubLogin, githubCliLogin, githubCallback, refreshToken, logout, whoami } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')


router.get('/github', githubLogin)
router.get('/github/cli', githubCliLogin)       // ← NEW
router.get('/github/callback', githubCallback)
router.post('/refresh', refreshToken)
router.post('/logout', authenticate, logout)
router.get('/whoami', authenticate, whoami)

module.exports = router