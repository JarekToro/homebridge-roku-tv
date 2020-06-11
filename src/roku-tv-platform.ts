import {
  API,
  Categories,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  Service,
} from "homebridge";

import { homeScreenActiveId, PLUGIN_NAME } from "./settings";
import { Client } from "roku-client";
import { App } from "roku-client/dist/client";
import { RokuAccessory } from "./roku-tv-accessory";

interface RokuTvPlatformConfig {
  name?: string;
  excludedApps?: string[];
  pollingInterval?: number;
}

export class RokuTvPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap
    .Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public readonly accessoriesToPublish: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: RokuTvPlatformConfig,
    public readonly api: API
  ) {
    this.log.debug("Finished initializing platform:", this.config.name);

    this.api.on("didFinishLaunching", async () => {
      log.debug("Executed didFinishLaunching callback");
      this.discoverDevices()
        .then()
        .catch((e) => this.log.debug(e));
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    this.accessories.push(accessory);
  }

  async discoverDevices() {
    const devices = await Client.discoverAll();
    const deviceInfos: RokuDevice[] = await Promise.all(
      devices.map(async (d) => {
        const apps = await d.apps();
        const info = await d.info();
        apps.push({
          name: "Home",
          type: "Home",
          id: homeScreenActiveId,
          version: "1",
        });

        return {
          client: d,
          apps,
          info,
        };
      })
    );

    for (const deviceInfo of deviceInfos) {
      const uuid = this.api.hap.uuid.generate(deviceInfo.client.ip);

      this.withRokuAccessory(uuid, deviceInfo);

      this.api.publishExternalAccessories(
        PLUGIN_NAME,
        this.accessoriesToPublish
      );

      // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
    }
  }

  withRokuAccessory(uuid: string, deviceInfo: RokuDevice) {
    const existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid
    );

    if (existingAccessory) {
      this.log.info(
        "Restoring existing accessory from cache:",
        existingAccessory.displayName
      );

      new RokuAccessory(
        this,
        existingAccessory,
        deviceInfo,
        this.config.excludedApps ?? []
      );
    } else {
      const accessory = new this.api.platformAccessory(
        deviceInfo.info.userDeviceName,
        uuid,
        Categories.TELEVISION
      );
      new RokuAccessory(
        this,
        accessory,
        deviceInfo,
        this.config.excludedApps ?? []
      );
      this.accessoriesToPublish.push(accessory);
    }
  }
}

export interface RokuDevice {
  client: Client;
  apps: App[];
  info: Record<string, string>;
}
