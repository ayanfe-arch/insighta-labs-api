const express = require('express')
const router = express.Router()
const { createProfile, getAllProfiles, getSingleProfile, deleteProfile, searchProfiles, exportProfiles } = require('../controllers/profileController')
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/roleCheck')

// API version check middleware
const checkApiVersion = (req, res, next) => {
    if (!req.headers['x-api-version']) {
        return res.status(400).json({ status: "error", message: "API version header required" })
    }
    next()
}

router.use(authenticate)
router.use(checkApiVersion)

router.post('/', requireAdmin, createProfile)
router.get('/export', getAllProfiles)
router.get('/search', searchProfiles)
router.get('/', getAllProfiles)
router.get('/:id', getSingleProfile)
router.delete('/:id', requireAdmin, deleteProfile)

module.exports = router