require('dotenv').config()
const axios = require('axios')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )

    return { accessToken, refreshToken }
}

const githubLogin = (req, res) => {
    const state = crypto.randomBytes(16).toString('hex')

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: `${process.env.APP_URL}/auth/github/callback`,
        scope: 'user:email',
        state
    })

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
}

const githubCallback = async (req, res) => {
    try {
        const { code } = req.query

        if (!code) {
            return res.status(400).json({ status: "error", message: "Missing code" })
        }

        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${process.env.APP_URL}/auth/github/callback`,
        })

        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            params.toString(),
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        const githubAccessToken = tokenRes.data.access_token

        if (!githubAccessToken) {
            return res.status(400).json({
                status: "error",
                message: "GitHub access token not received"
            })
        }

        const userRes = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${githubAccessToken}`
            }
        })

        const { id, login, email, avatar_url } = userRes.data

        let user = await User.findOne({ github_id: String(id) })

        if (!user) {
            user = new User({
                github_id: String(id),
                username: login,
                email: email || '',
                avatar_url,
                role: 'analyst'
            })
        } else {
            user.username = login
            user.avatar_url = avatar_url
        }

        const tokens = generateTokens(user)

        user.refresh_token = tokens.refreshToken
        user.last_login_at = new Date()

        await user.save()

        if (req.query.cli) {
            return res.json({
                status: "success",
                ...tokens,
                username: login
            })
        }

        res.cookie('access_token', tokens.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 3 * 60 * 1000
        })

        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 5 * 60 * 1000
        })

        return res.json({
            status: "success",
            ...tokens,
            username: login
        })

    } catch (err) {
        console.error("GitHub auth error:", err.response?.data || err.message)

        return res.status(500).json({
            status: "error",
            message: "Authentication failed"
        })
    }
}

const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body

        if (!refresh_token) {
            return res.status(400).json({
                status: "error",
                message: "Refresh token required"
            })
        }

        const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET)

        const user = await User.findById(decoded.id)

        if (!user || user.refresh_token !== refresh_token) {
            return res.status(401).json({
                status: "error",
                message: "Invalid refresh token"
            })
        }

        const tokens = generateTokens(user)

        user.refresh_token = tokens.refreshToken
        await user.save()

        return res.json({
            status: "success",
            ...tokens
        })

    } catch (err) {
        return res.status(401).json({
            status: "error",
            message: "Invalid or expired refresh token"
        })
    }
}

const logout = async (req, res) => {
    try {
        req.user.refresh_token = null
        await req.user.save()

        res.clearCookie('access_token')
        res.clearCookie('refresh_token')

        return res.json({
            status: "success",
            message: "Logged out successfully"
        })
    } catch (err) {
        return res.status(500).json({
            status: "error",
            message: "Logout failed"
        })
    }
}

const whoami = (req, res) => {
    return res.json({
        status: "success",
        data: req.user
    })
}

module.exports = {
    githubLogin,
    githubCallback,
    refreshToken,
    logout,
    whoami
}