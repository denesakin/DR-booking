const mongoose = require('mongoose');
const { DateTime } = require('luxon')
const { timeStringToDate } = require('../util/time')

const Schema = mongoose.Schema;

let clinicSchema = new Schema({
    id: {type: Number, required: true, unique: true},
    name: {type: String, required: true},
    owner: {type: String, required: true},
    dentists: {type: Number, required: true},
    address: {type: String, required: true},
    city: {type: String, required: true},
    coordinate: {
        longitude: {type: Number, required: true},
        latitude: {type: Number, required: true}
    },
    openinghours: {
        monday: {type: String, required: true},
        tuesday: {type: String, required: true},
        wednesday: {type: String, required: true},
        thursday: {type: String, required: true},
        friday: {type: String, required: true}
    }
});

clinicSchema.methods.getOpeningHours = function (date) {
    const currentDate = !date ?
        DateTime.now().setZone('UTC') :
        DateTime.fromISO(date, { zone: 'UTC' })
    const currentDay = currentDate.weekday;

    if (currentDay > 5) {
        return {};
    }

    const modelOpeningHours = this.openinghours.toObject();
    const dayKey = Object.keys(modelOpeningHours)[currentDay - 1];

    const openingHours = modelOpeningHours[dayKey].split('-');

    if (openingHours.length !== 2) {
        return {}
    }

    const startTime = timeStringToDate(openingHours[0], date);
    const endTime = timeStringToDate(openingHours[1], date);

    return { startTime, endTime };
}



module.exports = mongoose.model('Clinic', clinicSchema);
