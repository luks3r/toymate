import type { DeviceInfo, OutputInfo } from "./devices";
import type { DeviceLink } from "./engine";

/** Recording DeviceLink for tests. */
export class FakeLink implements DeviceLink {
  sent: { key: string; value: number; durationMs?: number }[] = [];
  stops = 0;
  connected = false;
  failNext = false;
  constructor(public devices: DeviceInfo[]) {}
  list() {
    return this.connected ? this.devices : [];
  }
  async connect() {
    this.connected = true;
  }
  async disconnect() {
    this.connected = false;
  }
  async startScanning() {}
  async stopScanning() {}
  async readBatteries() {}
  async send(o: OutputInfo, value: number, durationMs?: number) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("ble gone");
    }
    this.sent.push({ key: o.key, value, ...(durationMs === undefined ? {} : { durationMs }) });
  }
  async stopAll() {
    this.stops++;
  }
}
