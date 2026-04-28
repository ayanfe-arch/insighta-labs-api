require('dotenv').config()
const axios = require('axios')
const Profile = require('../models/Profile')

const createProfile = async (req, res) => {
    try {
        const name = req.body.name
        if (!name) return res.status(400).json({ status: "error", message: "Name is required" })
        if (typeof name !== 'string') return res.status(422).json({ status: "error", message: "Name must be a string" })

        const existing = await Profile.findOne({ name: name.toLowerCase() })
        if (existing) {
            return res.status(200).json({ status: "success", message: "Profile already exists", data: existing })
        }

        const [genderRes, ageRes, nationalityRes] = await Promise.all([
            axios.get(`https://api.genderize.io?name=${name}`),
            axios.get(`https://api.agify.io?name=${name}`),
            axios.get(`https://api.nationalize.io?name=${name}`)
        ])

        const genderData = genderRes.data
        const ageData = ageRes.data
        const nationalityData = nationalityRes.data

        if (!genderData.gender || genderData.count === 0) return res.status(502).json({ status: "error", message: "Genderize returned an invalid response" })
        if (!ageData.age) return res.status(502).json({ status: "error", message: "Agify returned an invalid response" })
        if (!nationalityData.country || nationalityData.country.length === 0) return res.status(502).json({ status: "error", message: "Nationalize returned an invalid response" })

        const age = ageData.age
        let age_group
        if (age <= 12) age_group = 'child'
        else if (age <= 19) age_group = 'teenager'
        else if (age <= 59) age_group = 'adult'
        else age_group = 'senior'

        const topCountry = nationalityData.country.sort((a, b) => b.probability - a.probability)[0]

        const countryNames = {
            'NG': 'Nigeria', 'US': 'United States', 'GB': 'United Kingdom',
            'GH': 'Ghana', 'KE': 'Kenya', 'ZA': 'South Africa',
            'CM': 'Cameroon', 'CI': 'Ivory Coast', 'SN': 'Senegal',
            'TZ': 'Tanzania', 'UG': 'Uganda', 'ET': 'Ethiopia',
            'EG': 'Egypt', 'MA': 'Morocco', 'DZ': 'Algeria',
            'AO': 'Angola', 'MZ': 'Mozambique', 'MG': 'Madagascar',
            'FR': 'France', 'DE': 'Germany', 'IT': 'Italy',
            'ES': 'Spain', 'PH': 'Philippines', 'IN': 'India',
            'BR': 'Brazil', 'MX': 'Mexico', 'CA': 'Canada',
            'AU': 'Australia', 'JP': 'Japan', 'CN': 'China'
        }

        const profile = new Profile({
            name: name.toLowerCase(),
            gender: genderData.gender,
            gender_probability: genderData.probability,
            sample_size: genderData.count,
            age: ageData.age,
            age_group,
            country_id: topCountry.country_id,
            country_name: countryNames[topCountry.country_id] || topCountry.country_id,
            country_probability: topCountry.probability,
            created_at: new Date()
        })

        await profile.save()
        return res.status(201).json({ status: "success", data: profile })

    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error" })
    }
}

const getAllProfiles = async (req, res) => {
    try {
        // Check if this is an export request
        if (req.query.format === 'csv') {
            return exportProfiles(req, res)
        }

        const { gender, age_group, country_id, min_age, max_age, min_gender_probability, min_country_probability, sort_by, order, page = 1, limit = 10 } = req.query

        const filter = {}
        if (gender) filter.gender = gender.toLowerCase()
        if (age_group) filter.age_group = age_group.toLowerCase()
        if (country_id) filter.country_id = country_id.toUpperCase()
        if (min_age || max_age) {
            filter.age = {}
            if (min_age) filter.age.$gte = Number(min_age)
            if (max_age) filter.age.$lte = Number(max_age)
        }
        if (min_gender_probability) filter.gender_probability = { $gte: Number(min_gender_probability) }
        if (min_country_probability) filter.country_probability = { $gte: Number(min_country_probability) }

        const sortObj = {}
        const validSortFields = ['age', 'created_at', 'gender_probability']
        if (sort_by && validSortFields.includes(sort_by)) {
            sortObj[sort_by] = order === 'desc' ? -1 : 1
        }

        const pageNum = Math.max(1, Number(page))
        const limitNum = Math.min(50, Math.max(1, Number(limit)))
        const skip = (pageNum - 1) * limitNum

        const total = await Profile.countDocuments(filter)
        const totalPages = Math.ceil(total / limitNum)
        const profiles = await Profile.find(filter).sort(sortObj).skip(skip).limit(limitNum)

        const baseUrl = `/api/profiles`
        const buildLink = (p) => `${baseUrl}?page=${p}&limit=${limitNum}`

        return res.status(200).json({
            status: "success",
            page: pageNum,
            limit: limitNum,
            total,
            total_pages: totalPages,
            links: {
                self: buildLink(pageNum),
                next: pageNum < totalPages ? buildLink(pageNum + 1) : null,
                prev: pageNum > 1 ? buildLink(pageNum - 1) : null
            },
            data: profiles
        })
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error" })
    }
}

const exportProfiles = async (req, res) => {
    try {
        const { gender, age_group, country_id, min_age, max_age, sort_by, order } = req.query

        const filter = {}
        if (gender) filter.gender = gender.toLowerCase()
        if (age_group) filter.age_group = age_group.toLowerCase()
        if (country_id) filter.country_id = country_id.toUpperCase()
        if (min_age || max_age) {
            filter.age = {}
            if (min_age) filter.age.$gte = Number(min_age)
            if (max_age) filter.age.$lte = Number(max_age)
        }

        const sortObj = {}
        if (sort_by) sortObj[sort_by] = order === 'desc' ? -1 : 1

        const profiles = await Profile.find(filter).sort(sortObj)

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `profiles_${timestamp}.csv`

        const headers = 'id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at'
        const rows = profiles.map(p => {
            const obj = p.toObject()
            return `${obj._id},${obj.name},${obj.gender},${obj.gender_probability},${obj.age},${obj.age_group},${obj.country_id},${obj.country_name},${obj.country_probability},${obj.created_at}`
        })

        const csv = [headers, ...rows].join('\n')

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        return res.status(200).send(csv)

    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error" })
    }
}

const getSingleProfile = async (req, res) => {
    try {
        const profile = await Profile.findById(req.params.id)
        if (!profile) return res.status(404).json({ status: "error", message: "Profile not found" })
        return res.status(200).json({ status: "success", data: profile })
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error" })
    }
}

const deleteProfile = async (req, res) => {
    try {
        const profile = await Profile.findByIdAndDelete(req.params.id)
        if (!profile) return res.status(404).json({ status: "error", message: "Profile not found" })
        return res.status(204).send()
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error" })
    }
}

const searchProfiles = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query
        if (!q) return res.status(400).json({ status: "error", message: "Query is required" })

        const query = q.toLowerCase()
        const filter = {}

        if (query.includes('female')) filter.gender = 'female'
        else if (query.includes('male')) filter.gender = 'male'

        if (query.includes('child')) filter.age_group = 'child'
        else if (query.includes('teenager')) filter.age_group = 'teenager'
        else if (query.includes('adult')) filter.age_group = 'adult'
        else if (query.includes('senior')) filter.age_group = 'senior'

        if (query.includes('young')) filter.age = { $gte: 16, $lte: 24 }

        const aboveMatch = query.match(/(?:above|over)\s+(\d+)/)
        if (aboveMatch) filter.age = { ...filter.age, $gte: Number(aboveMatch[1]) }

        const belowMatch = query.match(/(?:below|under)\s+(\d+)/)
        if (belowMatch) filter.age = { ...filter.age, $lte: Number(belowMatch[1]) }

        const countryMap = {
            'nigeria': 'NG', 'ghana': 'GH', 'kenya': 'KE',
            'south africa': 'ZA', 'cameroon': 'CM', 'angola': 'AO',
            'ethiopia': 'ET', 'tanzania': 'TZ', 'uganda': 'UG',
            'egypt': 'EG', 'morocco': 'MA', 'algeria': 'DZ',
            'united states': 'US', 'usa': 'US', 'uk': 'GB',
            'united kingdom': 'GB', 'france': 'FR', 'germany': 'DE',
            'india': 'IN', 'brazil': 'BR', 'philippines': 'PH'
        }

        for (const [countryName, code] of Object.entries(countryMap)) {
            if (query.includes(countryName)) {
                filter.country_id = code
                break
            }
        }

        if (Object.keys(filter).length === 0) {
            return res.status(400).json({ status: "error", message: "Unable to interpret query" })
        }

        const pageNum = Math.max(1, Number(page))
        const limitNum = Math.min(50, Math.max(1, Number(limit)))
        const skip = (pageNum - 1) * limitNum
        const total = await Profile.countDocuments(filter)
        const totalPages = Math.ceil(total / limitNum)
        const profiles = await Profile.find(filter).skip(skip).limit(limitNum)

        return res.status(200).json({
            status: "success",
            page: pageNum,
            limit: limitNum,
            total,
            total_pages: totalPages,
            links: {
                self: `/api/profiles/search?q=${q}&page=${pageNum}&limit=${limitNum}`,
                next: pageNum < totalPages ? `/api/profiles/search?q=${q}&page=${pageNum + 1}&limit=${limitNum}` : null,
                prev: pageNum > 1 ? `/api/profiles/search?q=${q}&page=${pageNum - 1}&limit=${limitNum}` : null
            },
            data: profiles
        })

    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error" })
    }
}

module.exports = { createProfile, getAllProfiles, getSingleProfile, deleteProfile, searchProfiles, exportProfiles }