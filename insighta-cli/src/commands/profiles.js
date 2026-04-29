const api = require('../api')
const chalk = require('chalk')
const ora = require('ora')
const Table = require('cli-table3')
const fs = require('fs')
const path = require('path')

const listCmd = async (options) => {
    const spinner = ora('Fetching profiles...').start()
    try {
        const params = {}
        if (options.gender) params.gender = options.gender
        if (options.country) params.country = options.country
        if (options.ageGroup) params.age_group = options.ageGroup
        if (options.minAge) params.min_age = options.minAge
        if (options.maxAge) params.max_age = options.maxAge
        if (options.sortBy) params.sort_by = options.sortBy
        if (options.order) params.order = options.order
        if (options.page) params.page = options.page
        if (options.limit) params.limit = options.limit

        const { data } = await api.get('/api/profiles', { params })
        spinner.stop()

        const profiles = data.data
        if (!profiles || profiles.length === 0) {
            console.log(chalk.yellow('No profiles found.'))
            return
        }

        const table = new Table({
            head: ['Name', 'Gender', 'Age', 'Age Group', 'Country'].map(h => chalk.cyan(h)),
            style: { compact: true }
        })

        profiles.forEach(p => {
            table.push([p.name, p.gender || 'N/A', p.age || 'N/A', p.age_group || 'N/A', p.country_name || p.country_id || 'N/A'])
        })

        console.log(table.toString())
        console.log(chalk.gray(`  Page ${data.page}/${data.total_pages} — ${data.total} total profiles\n`))
    } catch (err) {
        spinner.fail(err.response?.data?.message || err.message)
    }
}

const getCmd = async (id) => {
    const spinner = ora('Fetching profile...').start()
    try {
        const { data } = await api.get(`/api/profiles/${id}`)
        spinner.stop()
        const p = data.data
        console.log(chalk.cyan('\n Profile Details'))
        console.log(`  ID              : ${p.id}`)
        console.log(`  Name            : ${chalk.bold(p.name)}`)
        console.log(`  Gender          : ${p.gender || 'N/A'}`)
        console.log(`  Gender Prob     : ${p.gender_probability || 'N/A'}`)
        console.log(`  Age             : ${p.age || 'N/A'}`)
        console.log(`  Age Group       : ${p.age_group || 'N/A'}`)
        console.log(`  Country         : ${p.country_name || 'N/A'} (${p.country_id || 'N/A'})`)
        console.log(`  Country Prob    : ${p.country_probability || 'N/A'}`)
        console.log(`  Created At      : ${p.created_at}\n`)
    } catch (err) {
        spinner.fail(err.response?.data?.message || err.message)
    }
}

const searchCmd = async (query) => {
    const spinner = ora('Searching...').start()
    try {
        const { data } = await api.get('/api/profiles/search', { params: { q: query } })
        spinner.stop()

        const profiles = data.data
        if (!profiles || profiles.length === 0) {
            console.log(chalk.yellow('No results found.'))
            return
        }

        const table = new Table({
            head: ['Name', 'Gender', 'Age', 'Age Group', 'Country'].map(h => chalk.cyan(h))
        })

        profiles.forEach(p => {
            table.push([p.name, p.gender || 'N/A', p.age || 'N/A', p.age_group || 'N/A', p.country_name || 'N/A'])
        })

        console.log(table.toString())
        console.log(chalk.gray(`  ${data.total} result(s) found\n`))
    } catch (err) {
        spinner.fail(err.response?.data?.message || err.message)
    }
}

const createCmd = async (options) => {
    const spinner = ora(`Creating profile for "${options.name}"...`).start()
    try {
        const { data } = await api.post('/api/profiles', { name: options.name })
        spinner.succeed(chalk.green(`Profile created!`))
        const p = data.data
        console.log(`  ID      : ${p.id}`)
        console.log(`  Name    : ${p.name}`)
        console.log(`  Gender  : ${p.gender}`)
        console.log(`  Age     : ${p.age}`)
        console.log(`  Country : ${p.country_name}\n`)
    } catch (err) {
        spinner.fail(err.response?.data?.message || err.message)
    }
}

const exportCmd = async (options) => {
    const spinner = ora('Exporting profiles...').start()
    try {
        const params = { format: options.format }
        if (options.gender) params.gender = options.gender
        if (options.country) params.country = options.country

        const { data, headers } = await api.get('/api/profiles/export', {
            params,
            responseType: 'text'
        })

        const timestamp = Date.now()
        const filename = `profiles_${timestamp}.csv`
        const filepath = path.join(process.cwd(), filename)
        fs.writeFileSync(filepath, data)

        spinner.succeed(chalk.green(`Exported to ${filepath}`))
    } catch (err) {
        spinner.fail(err.response?.data?.message || err.message)
    }
}

module.exports = { listCmd, getCmd, searchCmd, createCmd, exportCmd }