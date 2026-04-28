const mongoose = require('mongoose')
const { v7: uuidv7 } = require('uuid')

const userSchema = new mongoose.Schema({
    _id: { type: String, default: () => uuidv7() },
    github_id: { type: String, unique: true },
    username: String,
    email: String,
    avatar_url: String,
    role: { type: String, enum: ['admin', 'analyst'], default: 'analyst' },
    is_active: { type: Boolean, default: true },
    refresh_token: String,
    last_login_at: Date,
    created_at: { type: Date, default: Date.now }
}, {
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id
            delete ret._id
            delete ret.__v
            delete ret.refresh_token
            return ret
        }
    }
})

const User = mongoose.model('User', userSchema)
module.exports = User