const jwt = require('jsonwebtoken')
const User = require('../models/User')

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ status: "error", message: "Access token required" })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(decoded.id)
        if (!user) return res.status(401).json({ status: "error", message: "User not found" })
        if (!user.is_active) return res.status(403).json({ status: "error", message: "Account is deactivated" })

        req.user = user
        next()
    } catch (err) {
        return res.status(401).json({ status: "error", message: "Invalid or expired token" })
    }
}

module.exports = { authenticate }