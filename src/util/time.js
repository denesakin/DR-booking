const { DateTime } = require('luxon');

const timeStringToDate = (str, date) => {
  const parts = str.split(':');

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);

  const currentDate = !date ?
      DateTime.now().setZone('UTC') :
      DateTime.fromISO(date, { zone: 'UTC' });

  return DateTime.fromObject({
    year: currentDate.year,
    month: currentDate.month,
    day: currentDate.day,
    hour: hours,
    minute: minutes
  }, { zone: 'UTC' });
}

module.exports = {
  timeStringToDate
}
