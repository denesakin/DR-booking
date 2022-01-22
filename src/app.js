const express = require('express')
const app = express()
const mongoose = require('mongoose');
const CircuitBreaker = require('opossum');
const circuitFaultTopic = '/team13/circuitFault';
const { RateLimiterMemory } = require('rate-limiter-flexible')
const requestLimiter = require('./RequestLimiters/RequestLimiter')

const bookingsController = require('./controllers/bookingsController')

// Parse requests of content-type 'application/json'
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 3001
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/db'

// Allows us to connect to docker MongoDB database
mongoose.connect(mongoUrl, (err => {
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    console.log('Connected to database')
  }
}))

app.get('/api', (req, res) => {
  res.sendStatus(200)
})

// MQTT
const mqtt = require('mqtt')

const host = 'localhost'
const mqttPort = '1883'

const connectUrl = `mqtt://${host}:${mqttPort}`
const client = mqtt.connect(connectUrl, {
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
})

const bookingTopic = '/team13/booking'
client.on('connect', () => {
  console.log('Connected')
  client.subscribe([bookingTopic], () => {
    console.log(`Subscribe to topic '${bookingTopic}'`)
  })
})

// Rate limiter configuration
const rateLimiterOptions = {
  points: 2, // This allows for 3 requests to be fully processed by the system. This is one value below the break point (3), as the request that causes the circuit to break is still accepted. This means that any more requests after 3 will not be retreived/accepted due to the circuit being open. NOTE: rather than 100 requests per second, it's 2 requests per 5 seconds for demonstrative purposes
  duration: 5,
};

const rateLimiter = new RateLimiterMemory(rateLimiterOptions);

//Circuit breaker configuration

// This function wraps around the function we want to watch. Once we have gone above our request limit of 3 requests within 5 seconds, we throw an error that is caught here. An error that is caught here invokes the circuit breaker to open
async function functionThatCouldFail() {
  try{
    await requestLimiter.bookingRequestLimiter(rateLimiter);
  } catch(err) {
    throw err;
  }
}

const circuitBreakerOptions = {
  timeout: 5000, // If our function takes longer than 5 seconds, trigger a failure
  errorThresholdPercentage: 0.001, // When 0.01% or more of requests fail, trip the circuit. Threshold is calculated by ( number of errors/number of circuit breaker fires). Hence, 0.001 would ensure that limiting 100 requests per second would work.
  resetTimeout: 10000 // After 10 seconds, try again.
};

const breaker = new CircuitBreaker(functionThatCouldFail, circuitBreakerOptions);

// When the circuit closes, we want to notify that to other components, so that they know requests can be sent
breaker.on('close', () => {
  console.log('Circuit is closed!')
  client.publish(circuitFaultTopic, 'false');
});

// When the circuit Half opens, we want to notify that to other components, so that they know requests can be sent
breaker.on('halfOpen', () => {
  console.log('Circuit is half open!');
  client.publish(circuitFaultTopic, 'false');
});

// When the circuit opens, we want to publish this to mqtt so that components subscribed are aware that they cannot send requests anymore
breaker.on('open', () => {
  console.log('Circuit is open!')
  client.publish(circuitFaultTopic, 'true');
} )

client.on('message', (topic, payload) => {
  if (topic !== bookingTopic) {
    return;
  }

  const { method, data } = parsePayload(payload);

  switch (method) {
    case "create":
      dispatchBookingCreation(data);
      break;
    default:
      console.error(`Unsupported method: ${method}`);
  }
})

const parsePayload = payload => {
  const parsedPayload = JSON.parse(payload.toString());
  const method = parsedPayload['method'];
  const data = parsedPayload['data'];
  return { method, data }
}

const dispatchBookingCreation = (data) => {
  // This code ensures that bookings are only posted when the circuit is closed. Note, breaker.fire() invokes the functionThatCouldFail() method above.
  breaker.fire()
  .then(() => {
    console.log('Create request accepted!')
    bookingsController.createBooking(data)
      .then(booking => console.log(`Successfully created booking with code '${booking.code}'`))
      .catch(err => console.error(err))
  })
  // The oppossum library opens the circuit via errors. Hence, we consider system overload (x requests in y time) to throw an error.
  .catch(err => {
    if (!(err instanceof Error)){  // This checks if the error is actually an error, or from the rate limiter. Done because we want the 3rd request that causes the circuit to open to also be accepted in the system (more info above in the rate limiter configuration)!
      console.log('Create request accepted!')
      bookingsController.createBooking(data)
        .then(booking => console.log(`Successfully created booking with code '${booking.code}'`))
        .catch(err => console.error(err)); // Accept the request that caused the circuit to break
    }
    console.error(err);
  })
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
