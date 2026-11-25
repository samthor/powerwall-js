// This module polls the Powerwall every 10 seconds and computes a 1-minute rolling average.

import { type DataBattery, type TedApiConfig, fetchSimpleStatus } from './client.ts';

const POLL_INTERVAL_MS = 10_000;
const WINDOW_DURATION_MS = 60_000;
const POLL_TIMEOUT_MS = 8_000;

type Sample = {
  whenMs: number;
  status: DataBattery;
};

export class BatteryPoller {
  private readonly config: TedApiConfig;
  private samples: Sample[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(config: TedApiConfig) {
    this.config = config;
  }

  // This method starts the background polling loop.
  start(): void {
    if (this.timer) {
      return;
    }
    void this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, POLL_INTERVAL_MS);
    this.timer.unref();
  }

  private async pollOnce(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
    try {
      const status = await fetchSimpleStatus(controller.signal, this.config);
      this.recordSample(Date.now(), status);
    } catch (err) {
      console.warn('battery poll failed:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordSample(nowMs: number, status: DataBattery): void {
    const cutoffMs = nowMs - WINDOW_DURATION_MS;
    this.samples = this.samples.filter((s) => s.whenMs >= cutoffMs);
    this.samples.push({ whenMs: nowMs, status });
  }

  // This method returns the smoothed battery status over the last minute, or fetches live if empty.
  async status(signal: AbortSignal): Promise<DataBattery> {
    const nowMs = Date.now();
    const cutoffMs = nowMs - WINDOW_DURATION_MS;
    this.samples = this.samples.filter((s) => s.whenMs >= cutoffMs);

    if (this.samples.length === 0) {
      const fresh = await fetchSimpleStatus(signal, this.config);
      this.recordSample(Date.now(), fresh);
      return fresh;
    }

    const latest = this.samples[this.samples.length - 1].status;
    const count = this.samples.length;

    let sumBattery = 0;
    let sumSite = 0;
    let sumLoad = 0;
    let sumSolar = 0;
    let sumSolarRGM = 0;
    let sumGenerator = 0;
    let sumConductor = 0;

    for (const { status } of this.samples) {
      sumBattery += status.powerBattery;
      sumSite += status.powerSite;
      sumLoad += status.powerLoad;
      sumSolar += status.powerSolar;
      sumSolarRGM += status.powerSolarRGM;
      sumGenerator += status.powerGenerator;
      sumConductor += status.powerConductor;
    }

    return {
      ...latest,
      powerBattery: sumBattery / count,
      powerSite: sumSite / count,
      powerLoad: sumLoad / count,
      powerSolar: sumSolar / count,
      powerSolarRGM: sumSolarRGM / count,
      powerGenerator: sumGenerator / count,
      powerConductor: sumConductor / count,
    };
  }
}
