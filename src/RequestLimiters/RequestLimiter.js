// This code was made to provide the business logic specific to our use case of the rate limiter library. In this case, we want to invoke our cicruit breaker by throwing the rejection/error of our rate limiter.
async function bookingRequestLimiter(requestLimiter) {
  await requestLimiter.consume(1)
    .then((rateLimiterRes) => {
      console.log('consumed a point');
      console.log(rateLimiterRes)
    })
    .catch(rej => {
      throw rej;
    });
}

module.exports.bookingRequestLimiter = bookingRequestLimiter;