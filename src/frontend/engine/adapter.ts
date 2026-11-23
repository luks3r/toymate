import {
  ButtplugBrowserWebsocketClientConnector,
  ButtplugClient,
  DeviceOutput,
  InputCommandType,
  InputType,
  OutputType,
  type ButtplugClientDevice,
} from "buttplug";
import { OUTPUT_KINDS, outputKey, type DeviceInfo, type OutputInfo, type OutputKind } from "./devices";
import type { OutputSink } from "./governor";

export interface AdapterEvents {
  onDevicesChanged(): void;
  onDisconnected(): void;
  onScanningFinished(): void;
}

const isOutputKind = (v: string): v is OutputKind => (OUTPUT_KINDS as readonly string[]).includes(v);

/** Thin wrapper over buttplug. The only module that imports it. */
export class ButtplugAdapter implements OutputSink {
  private client: ButtplugClient | null = null;
  private devices: DeviceInfo[] = [];
  private byIndex = new Map<number, ButtplugClientDevice>();

  constructor(private events: AdapterEvents) {}

  get connected(): boolean {
    return this.client?.connected ?? false;
  }

  list(): readonly DeviceInfo[] {
    return this.devices;
  }

  async connect(url: string): Promise<void> {
    await this.disconnect();
    const client = new ButtplugClient("Toymate");
    client.addListener("deviceadded", () => this.refresh());
    client.addListener("deviceremoved", () => this.refresh());
    client.addListener("scanningfinished", () => this.events.onScanningFinished());
    client.addListener("disconnect", () => {
      if (this.client !== client) return;
      this.client = null;
      this.refresh();
      this.events.onDisconnected();
    });
    this.client = client;
    try {
      await client.connect(new ButtplugBrowserWebsocketClientConnector(url));
    } catch (error) {
      this.client = null;
      throw error;
    }
    this.refresh();
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    if (!client) return;
    this.client = null;
    try {
      if (client.connected) {
        await client.stopAllDevices().catch(() => {});
        await client.disconnect();
      }
    } finally {
      this.refresh();
    }
  }

  async startScanning(): Promise<void> {
    await this.client?.startScanning();
  }

  async stopScanning(): Promise<void> {
    await this.client?.stopScanning().catch(() => {});
  }

  async readBatteries(): Promise<void> {
    for (const info of this.devices) {
      const device = this.byIndex.get(info.index);
      const feature = device && [...device.features.values()].find((f) => f.hasInput(InputType.Battery));
      if (!feature) continue;
      try {
        const reading = await feature.runInput(InputType.Battery, InputCommandType.Read);
        const value = reading?.value ?? NaN;
        const range = feature.input(InputType.Battery)?.valueRange ?? [0, 100];
        if (Number.isFinite(value)) info.battery = Math.round(((value - range[0]) / (range[1] - range[0] || 1)) * 100);
      } catch {
        // Battery is informational; a failed read must not disturb output.
      }
    }
    this.events.onDevicesChanged();
  }

  private refresh() {
    const devices = this.client ? [...this.client.devices.values()].sort((a, b) => a.index - b.index) : [];
    const seen = new Map<string, number>();
    const previous = new Map(this.devices.map((d) => [d.index, d.battery]));
    this.byIndex = new Map(devices.map((d) => [d.index, d]));
    this.devices = devices.map((device) => {
      const name = device.displayName || device.name;
      const ordinal = (seen.get(name) ?? 0) + 1;
      seen.set(name, ordinal);
      const outputs: OutputInfo[] = [];
      for (const feature of device.features.values()) {
        const hasHwPosition = feature.hasOutput(OutputType.HwPositionWithDuration);
        for (const out of feature.outputs.values()) {
          if (!isOutputKind(out.type)) continue;
          if (out.type === "Position" && hasHwPosition) continue;
          outputs.push({
            key: outputKey(name, ordinal, feature.index, out.type),
            deviceIndex: device.index,
            deviceName: name,
            featureIndex: feature.index,
            kind: out.type,
            range: out.valueRange,
            ...(out.durationRange ? { durationRange: out.durationRange } : {}),
            timingGapMs: device.messageTimingGap ?? 100,
          });
        }
      }
      return { index: device.index, name, outputs, battery: previous.get(device.index) ?? null };
    });
    this.events.onDevicesChanged();
  }

  async send(output: OutputInfo, value: number, durationMs?: number): Promise<void> {
    const feature = this.byIndex.get(output.deviceIndex)?.features.get(output.featureIndex);
    if (!feature) return;
    const [min, max] = output.range;
    const v = Math.max(min, Math.min(max, value));
    const command =
      output.kind === "HwPositionWithDuration"
        ? DeviceOutput.HwPositionWithDuration.value(v, durationMs ?? 500)
        : DeviceOutput[output.kind].value(v);
    await feature.runOutput(command);
  }

  async stopAll(): Promise<void> {
    if (this.client?.connected) await this.client.stopAllDevices();
  }
}
