import { PlatformAccessory, Characteristic, Logger } from "homebridge";
import { Service, WithUUID } from "hap-nodejs";
import { RokuTvPlatform } from "./roku-tv-platform";

export abstract class BaseAccessory {
  protected readonly Characteristic: typeof Characteristic;
  protected readonly logger: Logger;

  protected constructor(
    protected readonly platform: RokuTvPlatform,
    protected readonly accessory: PlatformAccessory
  ) {
    this.Characteristic = platform.Characteristic;
    this.logger = platform.log;
  }

  withService<T extends WithUUID<typeof Service>>(name: T): Service {
    return this.accessory.getService(name) || this.accessory.addService(name);
  }
}
