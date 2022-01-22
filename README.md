# booking
## MQTT
This booking component contains an MQTT controller which connects to an MQTT broker through subscribing to a topic and awaits for any published messages coming from the broker and the subscribed topic. Then the request body gets parsed into a javascript object which gets passed to the booking controller.

## Booking controller
This booking component contains a booking controller which handles all the logic behind booking an appointment. The booking controllers is connected to the MQTT controller and handles the request bodies from the MQTT messages passed from the MQTT controller

## Circuit Breaker
The Booking component also contains a circuit breaker that wraps around the booking controlller. The circuit breaker has a threshold of 3 requests within 5 seconds. Once open, it takes 10 seconds to recover and close the circuit. The number of requests is tracked via a rate limiter, which invokes the circuit breaker once the threshold is exceeded.
