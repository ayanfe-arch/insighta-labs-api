require('dotenv').config();
const mongoose = require('mongoose');
const { v7: uuidv7 } = require('uuid');
const Profile = require('./models/Profile');
const data = require('./seed_profiles.json');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const profiles = data.profiles;

    const bulkOps = profiles.map(p => ({
      updateOne: {
        filter: { name: p.name.toLowerCase() },
        update: {
          $setOnInsert: {
            id: uuidv7(),
            name: p.name.toLowerCase(),
            gender: p.gender,
            gender_probability: p.gender_probability,
            age: p.age,
            age_group: p.age_group,
            country_id: p.country_id,
            country_name: p.country_name,
            country_probability: p.country_probability,
            created_at: new Date()
          }
        },
        upsert: true
      }
    }));

    await Profile.bulkWrite(bulkOps);

    console.log('Seeding complete');
    process.exit(0);

  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();