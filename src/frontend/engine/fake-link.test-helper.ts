import type { DeviceInfo, OutputInfo } from "./devices";
import type { DeviceLink } from "./engine";

/** Recording DeviceLink for tests. */
export class FakeLink implements DeviceLink {
  sent: { key: string; value: number; durationMs?: number }[] = [];
  stops = 0;
  connected = false;
  failNext = false;
  /** Sends that never get an ack while set. */
  hang = false;
  connects = 0;
  /** Lets a test hold connect() open, like a slow real device. */
  connectGate: Promise<void> | null = null;
  constructor(public devices: DeviceInfo[]) {}
  list() {
    return this.connected ? this.devices : [];
  }
  async connect() {
    this.connects++;
    if (this.connectGate) await this.connectGate;
    this.connected = true;
  }
  async disconnect() {
    this.connected = false;
  }
  async startScanning() {}
  async stopScanning() {}
  async readBatteries() {}
  async send(o: OutputInfo, value: number, durationMs?: number) {
    if (this.hang) {
      this.sent.push({ key: o.key, value });
      return new Promise<void>(() => {});
    }
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
