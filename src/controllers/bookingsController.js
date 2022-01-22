const Booking = require("../models/booking");
const Clinic = require("../models/clinic");
const Joi = require('joi');
const { timeStringToDate } = require('../util/time');

const dateRegex = new RegExp("^\\d{4}-\\d{2}-\\d{2}$")
const timeRegex = new RegExp("^\\d{2}:\\d{2}$")

const postBody = Joi.object({
    clinicId: Joi.number().positive().required(),
    code: Joi.string().required(),
    date: Joi.string().regex(dateRegex).required(),
    startTime: Joi.string().regex(timeRegex).required(),
    endTime: Joi.string().regex(timeRegex).required()
});

const createBooking = async (data) => {
    const { error } = postBody.validate(data);

    if (error) {
        return Promise.reject("Invalid data provided for booking creation")
    }

    const bookingExists = await Booking.exists({
        clinicId: data.clinicId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime
    });

    if (bookingExists) {
        return Promise.reject(`Booking for date ${data.date} (${data.startTime} - ${data.endTime}) at clinic with id '${data.clinicId}' already exists`);
    }

    const bookingCodeExists = await Booking.exists({ code: data.code });

    if (bookingCodeExists) {
        return Promise.reject(`Booking with code '${data.code}' already exists`);
    }

    const clinic = await Clinic.findOne({ id: data.clinicId });

    if (!clinic) {
        return Promise.reject(`Clinic with id '${data.clinicId}' not found`);
    }

    await verifyBookingData(clinic, data);

    const booking = new Booking(data);

    return booking.save();
}

const verifyBookingData = async (clinic, data) => {
    const { startTime, endTime } = clinic.getOpeningHours(data.date);

    if (!startTime || !endTime) {
        return Promise.reject(`Failed to fetch current opening hours for clinic with id '${clinic.id}'`);
    }

    const dataStartTime = timeStringToDate(data.startTime, data.date);
    const dataEndTime = timeStringToDate(data.endTime, data.date);

    if (dataStartTime < startTime) {
        return Promise.reject(`The provided booking start time (${dataStartTime.toFormat('HH:mm')}) is lower than clinic start time (${startTime.toFormat('HH:mm')})`);
    }

    if (dataEndTime > endTime) {
        return Promise.reject(`The provided booking end time (${dataStartTime.toFormat('HH:mm')}) is greater than clinic end time (${startTime.toFormat('HH:mm')})`);
    }

    if (dataStartTime > dataEndTime) {
        return Promise.reject(`The provided booking start time (${dataStartTime.toFormat('HH:mm')}) is greater than the provided booking end time (${dataEndTime.toFormat('HH:mm')})`);
    }

    if (dataStartTime.minute !== 0 && dataStartTime.minute !== 30) {
        return Promise.reject(`The provided start time (${dataStartTime.toFormat('HH:mm')}) needs to start on a full/half hour`)
    }

    if (dataEndTime.minute !== 0 && dataEndTime.minute !== 30) {
        return Promise.reject(`The provided end time (${dataEndTime.toFormat('HH:mm')}) needs to start on a full/half hour`)
    }

    const timeDiff = dataEndTime.diff(dataStartTime, 'minutes').toObject();

    if (timeDiff.minutes !== 30) {
        return Promise.reject(`Bookings can only be made in 30 minute intervals`)
    }
}

module.exports = { createBooking }
