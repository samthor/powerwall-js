# powerwall

Local Tesla Powerwall TEDAPI client and rolling-average status poller for Node.js.

## Usage

```ts
import { BatteryPoller, fetchSimpleStatus } from 'powerwall';

const config = {
  din: '1707000-XX-X--TGXXXXXXXXXXXX',
  secret: 'YOUR_WIFI_PASSWORD',
  // remote: '192.168.91.1:443', // optional default
};

// One-off status request:
const status = await fetchSimpleStatus(AbortSignal.timeout(5000), config);

// Or background 10s poller with 1-minute rolling average:
const poller = new BatteryPoller(config);
poller.start();
const smoothed = await poller.status(AbortSignal.timeout(5000));
```
