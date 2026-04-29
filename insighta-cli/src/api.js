const axios = require('axios')
const { getCredentials, saveCredentials, clearCredentials, BASE_URL } = require('./config')

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'X-API-Version': '1' }
})

// Attach token to every request
api.interceptors.request.use((config) => {
    const creds = getCredentials()
    if (creds?.access_token) {
        config.headers.Authorization = `Bearer ${creds.access_token}`
    }
    return config
})

// Auto-refresh on 401
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true
            const creds = getCredentials()
            if (!creds?.refresh_token) {
                clearCredentials()
                console.error('\nSession expired. Please run: insighta login')
                process.exit(1)
            }
            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refresh_token: creds.refresh_token
                })
                saveCredentials({
                    ...creds,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token
                })
                original.headers.Authorization = `Bearer ${data.access_token}`
                return api(original)
            } catch {
                clearCredentials()
                console.error('\nSession expired. Please run: insighta login')
                process.exit(1)
            }
        }
        return Promise.reject(err)
    }
)

module.exports = api