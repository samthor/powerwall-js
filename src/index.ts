// This module re-exports the Tesla Powerwall TEDAPI client and rolling-average poller.

export {
  type DataBattery,
  type SimplePhase,
  type TedApiConfig,
  fetchSimpleStatus,
} from './client.ts';
export { BatteryPoller } from './poller.ts';
