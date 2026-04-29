const os = require('os')
const fs = require('fs')
const path = require('path')

const CONFIG_DIR = path.join(os.homedir(), '.insighta')
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json')
const BASE_URL = process.env.INSIGHTA_API_URL || 'https://insighta-labs-api-production.up.railway.app'

const getCredentials = () => {
    try {
        if (fs.existsSync(CREDENTIALS_FILE)) {
            return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
        }
    } catch {}
    return null
}

const saveCredentials = (data) => {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2))
}

const clearCredentials = () => {
    if (fs.existsSync(CREDENTIALS_FILE)) fs.unlinkSync(CREDENTIALS_FILE)
}

module.exports = { getCredentials, saveCredentials, clearCredentials, BASE_URL }