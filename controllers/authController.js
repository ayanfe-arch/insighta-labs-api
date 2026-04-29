require('dotenv').config()
const axios = require('axios')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '3m' }
    )
    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
    )
    return { accessToken, refreshToken }
}

const githubLogin = (req, res) => {
    const state = crypto.randomBytes(16).toString('hex')
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'user:email',
        state
    })
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
}

// CLI-specific login — encodes port in state
const githubCliLogin = (req, res) => {
    const { port } = req.query
    const state = `cli_${port}_${crypto.randomBytes(8).toString('hex')}`
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'user:email',
        state
    })
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
}

const githubCallback = async (req, res) => {
    try {
        const { code, state } = req.query

        // Detect CLI flow from state
        const isCli = state && state.startsWith('cli_')
        const cliPort = isCli ? state.split('_')[1] : null

        if (!code) {
            return res.status(400).json({ status: "error", message: "Missing code" })
        }

        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            new URLSearchParams({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_CALLBACK_URL,
            }).toString(),
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        const githubAccessToken = tokenRes.data.access_token

        if (!githubAccessToken) {
            console.error('GitHub token exchange failed:', tokenRes.data)
            return res.status(400).json({
                status: "error",
                message: "GitHub access token not received",
                detail: tokenRes.data.error_description || tokenRes.data.error
            })
        }

        const userRes = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${githubAccessToken}` }
        })

        let { id, login, email, avatar_url } = userRes.data

        if (!email) {
            try {
                const emailRes = await axios.get('https://api.github.com/user/emails', {
                    headers: { Authorization: `Bearer ${githubAccessToken}` }
                })
                const primaryEmail = emailRes.data.find(e => e.primary && e.verified)
                email = primaryEmail ? primaryEmail.email : ''
            } catch { email = '' }
        }

        let user = await User.findOne({ github_id: String(id) })

        if (!user) {
            user = new User({
                github_id: String(id),
                username: login,
                email: email || '',
                avatar_url,
                role: 'analyst',
                is_active: true
            })
        } else {
            if (!user.is_active) {
                return res.status(403).json({ status: "error", message: "Account is deactivated" })
            }
            user.username = login
            user.avatar_url = avatar_url
            if (email) user.email = email
        }

        const tokens = generateTokens(user)
        user.refresh_token = tokens.refreshToken
        user.last_login_at = new Date()
        await user.save()

        // CLI flow — redirect to local CLI server
        if (cliPort) {
            const params = new URLSearchParams({
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                username: login
            })
            return res.redirect(`http://localhost:${cliPort}/callback?${params.toString()}`)
        }

        // Web flow — HTTP-only cookies
        const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' }
        res.cookie('access_token', tokens.accessToken, { ...cookieOptions, maxAge: 3 * 60 * 1000 })
        res.cookie('refresh_token', tokens.refreshToken, { ...cookieOptions, maxAge: 5 * 60 * 1000 })

        return res.json({
            status: "success",
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            username: login
        })

    } catch (err) {
        console.error("GitHub auth error:", err.response?.data || err.message)
        return res.status(500).json({
            status: "error",
            message: "Authentication failed",
            detail: err.message
        })
    }
}

const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body
        if (!refresh_token) {
            return res.status(400).json({ status: "error", message: "Refresh token required" })
        }
        const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id)
        if (!user || user.refresh_token !== refresh_token) {
            return res.status(401).json({ status: "error", message: "Invalid refresh token" })
        }
        if (!user.is_active) {
            return res.status(403).json({ status: "error", message: "Account is deactivated" })
        }
        const tokens = generateTokens(user)
        user.refresh_token = tokens.refreshToken
        await user.save()
        return res.json({ status: "success", access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
    } catch (err) {
        return res.status(401).json({ status: "error", message: "Invalid or expired refresh token" })
    }
}

const logout = async (req, res) => {
    try {
        req.user.refresh_token = null
        await req.user.save()
        res.clearCookie('access_token')
        res.clearCookie('refresh_token')
        return res.json({ status: "success", message: "Logged out successfully" })
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Logout failed" })
    }
}

const whoami = (req, res) => {
    return res.json({ status: "success", data: req.user })
}

module.exports = { githubLogin, githubCliLogin, githubCallback, refreshToken, logout, whoami }