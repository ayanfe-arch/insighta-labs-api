const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: "error", message: "Admin access required" })
    }
    next()
}

const requireAnalyst = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'analyst') {
        return res.status(403).json({ status: "error", message: "Access denied" })
    }
    next()
}

module.exports = { requireAdmin, requireAnalyst }