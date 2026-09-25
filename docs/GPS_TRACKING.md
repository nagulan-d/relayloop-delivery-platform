# Relayloop GPS tracking

The rider client requests browser geolocation only after the rider opts in or begins an active delivery. Coordinates are sent through a protected mutation no more often than every 5 seconds while active. The server stores the latest latitude, longitude, and timestamp on the rider record and publishes a `RIDER_LOCATION_UPDATED` event.

No fake coordinates are used. If permission is denied, the browser does not support geolocation, or a fix is unavailable, the UI displays `Location unavailable` and the delivery remains operational without silently inventing movement. Optional historical points should be retained with a bounded policy rather than written indefinitely.
