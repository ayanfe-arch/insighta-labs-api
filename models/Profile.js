const mongoose = require('mongoose')
const { v7: uuidv7 } = require('uuid')

const profileSchema = new mongoose.Schema({
    _id: { type: String, default: () => uuidv7() },
    name: String,
    gender: String,
    gender_probability: Number,
    sample_size: Number,
    age: Number,
    age_group: String,
    country_id: String,
    country_name: String,
    country_probability: Number,
    created_at: Date
}, {
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id
            delete ret._id
            delete ret.__v
            return ret
        }
    }
})

const Profile = mongoose.model('Profile', profileSchema)
module.exports = Profile