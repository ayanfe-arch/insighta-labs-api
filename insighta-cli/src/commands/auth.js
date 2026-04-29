const http = require('http')
const { BASE_URL, saveCredentials, clearCredentials, getCredentials } = require('../config')
const api = require('../api')
const chalk = require('chalk')
const open = require('open')
const ora = require('ora')

const loginCmd = async () => {
    const PORT = 9876
    const spinner = ora('Opening GitHub login in your browser...').start()

    const server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`)
        if (url.pathname === '/callback') {
            const access_token = url.searchParams.get('access_token')
            const refresh_token = url.searchParams.get('refresh_token')
            const username = url.searchParams.get('username')

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`
                <html><body style="font-family:sans-serif;text-align:center;padding:50px">
                <h2>✅ Logged in as @${username}</h2>
                <p>You can close this tab and go back to your terminal.</p>
                </body></html>
            `)

            saveCredentials({ access_token, refresh_token, username })
            spinner.succeed(chalk.green(`Logged in as @${username}`))
            server.close()
        }
    })

    server.listen(PORT, async () => {
        const loginUrl = `${BASE_URL}/auth/github/cli?port=${PORT}`
        await open(loginUrl)
    })

    server.on('error', (err) => {
        spinner.fail('Failed to start local server: ' + err.message)
        process.exit(1)
    })
}

const logoutCmd = async () => {
    const spinner = ora('Logging out...').start()
    try {
        const creds = getCredentials()
        if (!creds) {
            spinner.info('You are not logged in.')
            return
        }
        await api.post('/auth/logout')
        clearCredentials()
        spinner.succeed(chalk.green('Logged out successfully'))
    } catch {
        clearCredentials()
        spinner.succeed(chalk.green('Logged out successfully'))
    }
}

const whoamiCmd = async () => {
    const spinner = ora('Fetching user info...').start()
    try {
        const { data } = await api.get('/auth/whoami')
        spinner.stop()
        const user = data.data
        console.log(chalk.cyan('\n Current User'))
        console.log(`  Username : ${chalk.bold(user.username)}`)
        console.log(`  Email    : ${user.email || 'N/A'}`)
        console.log(`  Role     : ${chalk.yellow(user.role)}`)
        console.log(`  Active   : ${user.is_active ? chalk.green('Yes') : chalk.red('No')}\n`)
    } catch (err) {
        spinner.fail(err.response?.data?.message || err.message)
    }
}

module.exports = { loginCmd, logoutCmd, whoamiCmd }