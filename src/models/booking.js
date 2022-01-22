const mongoose = require('mongoose')
const Schema = mongoose.Schema

const bookingSchema = new Schema({
    clinicId: {type: Number},
    code: {type: String},
    date: {type: String},
    startTime: {type: String},
    endTime: {type: String}
})

module.exports = mongoose.model('Booking', bookingSchema)
