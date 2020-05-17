import {Service, PlatformAccessory, Logger} from 'homebridge';

import {RokuPlatform, RokuDevice} from './platform';
import {PLUGIN_NAME} from './settings';
import {Client, keys} from 'roku-client';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class RokuAccessory {
    roku: Client;
    tvService: Service;
    private log: Logger;

    constructor(
        private readonly platform: RokuPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly device: RokuDevice) {
      this.roku = new Client(device.ip);

      this.log = platform.log;
        // set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.Manufacturer, this.device.info.vendorName)
          .setCharacteristic(this.platform.Characteristic.Model, this.device.info.modelName)
          .setCharacteristic(this.platform.Characteristic.Name, this.device.info.userDeviceName)
          .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.info.serialNumber);

        this.tvService = this.accessory.getService(this.platform.Service.Television)
            || this.accessory.addService(this.platform.Service.Television);


        this.tvService.setCharacteristic(this.platform.Characteristic.Name, this.device.name);


        // set sleep discovery characteristic
        this.tvService.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
          this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

        // handle on / off events using the Active characteristic
        this.tvService.getCharacteristic(this.platform.Characteristic.Active)
          .on('set', (newValue, callback) => {
            this.log.info('set Active => setNewValue: ' + newValue);
            this.tvService.updateCharacteristic(this.platform.Characteristic.Active, 1);
            callback(null);
          });

        this.tvService.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);

        // handle input source changes
        this.tvService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
          .on('set', (newValue, callback) => {

            // the value will be the value you set for the Identifier Characteristic
            // on the Input Source service that was selected - see input sources below.

            this.log.info('set Active Identifier => setNewValue: ' + newValue);
            callback(null);
          });

        // handle remote control input
        this.tvService.getCharacteristic(this.platform.Characteristic.RemoteKey)
          .on('set', (newValue, callback) => {
            let returnPromise: Promise<unknown> | null = null;
            switch (newValue) {
              case this.platform.Characteristic.RemoteKey.REWIND: {
                this.log.info('set Remote Key Pressed: REWIND');
                returnPromise = this.roku.keypress(keys.REVERSE);
                break;
              }
              case this.platform.Characteristic.RemoteKey.FAST_FORWARD: {
                this.log.info('set Remote Key Pressed: FAST_FORWARD');
                returnPromise = this.roku.keypress(keys.FORWARD);
                break;
              }
              case this.platform.Characteristic.RemoteKey.NEXT_TRACK: {
                this.log.info('set Remote Key Pressed: NEXT_TRACK');
                returnPromise = this.roku.keypress(keys.RIGHT);
                break;
              }
              case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK: {
                this.log.info('set Remote Key Pressed: PREVIOUS_TRACK');
                returnPromise = this.roku.keypress(keys.LEFT);
                break;
              }
              case this.platform.Characteristic.RemoteKey.ARROW_UP: {
                this.log.info('set Remote Key Pressed: ARROW_UP');
                returnPromise = this.roku.keypress(keys.UP);
                break;
              }
              case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
                this.log.info('set Remote Key Pressed: ARROW_DOWN');
                returnPromise = this.roku.keypress(keys.DOWN);
                break;
              }
              case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
                this.log.info('set Remote Key Pressed: ARROW_LEFT');
                returnPromise = this.roku.keypress(keys.LEFT);
                break;
              }
              case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
                this.log.info('set Remote Key Pressed: ARROW_RIGHT');
                returnPromise = this.roku.keypress(keys.RIGHT);
                break;
              }
              case this.platform.Characteristic.RemoteKey.SELECT: {
                this.log.info('set Remote Key Pressed: SELECT');
                returnPromise = this.roku.keypress(keys.SELECT);
                break;
              }
              case this.platform.Characteristic.RemoteKey.BACK: {
                this.log.info('set Remote Key Pressed: BACK');
                returnPromise = this.roku.keypress(keys.BACK);
                break;
              }
              case this.platform.Characteristic.RemoteKey.EXIT: {
                this.log.info('set Remote Key Pressed: EXIT');
                returnPromise = this.roku.keypress(keys.HOME);
                break;
              }
              case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
                this.log.info('set Remote Key Pressed: PLAY_PAUSE');
                returnPromise = this.roku.keypress(keys.PLAY);
                break;
              }
              case this.platform.Characteristic.RemoteKey.INFORMATION: {
                this.log.info('set Remote Key Pressed: INFORMATION');
                returnPromise = this.roku.keypress(keys.INFO);
                break;
              }
            }
            // eslint-disable-next-line eqeqeq
            if (returnPromise != null){
              returnPromise.then(callback);
            }else {
              callback(null);
            }
            // don't forget to callback!
          });

        /**
         * Create a speaker service to allow volume control
         */

        const speakerService = this.accessory.addService(this.platform.Service.TelevisionSpeaker);

        speakerService
          .setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE)
          .setCharacteristic(this.platform.Characteristic.VolumeControlType, this.platform.Characteristic.VolumeControlType.RELATIVE);

        // handle volume control
        speakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
          .on('set', (newValue, callback) => {
            if (newValue === this.platform.Characteristic.VolumeSelector.INCREMENT){
              this.roku.command().volumeUp().send().then(callback);
            } else {
              this.roku.command().volumeDown().send().then(callback);

            }
          });


        for (const key in device.appMap){
          const value = device.appMap[key];

          const inputService = this.accessory.addService(this.platform.Service.InputSource, key, key);
          inputService
            .setCharacteristic(this.platform.Characteristic.Identifier, value.id)
            .setCharacteristic(this.platform.Characteristic.ConfiguredName, key)
            .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
            .setCharacteristic(this.platform.Characteristic.InputSourceType, value.type === 'app1' ? 
              this.platform.Characteristic.InputSourceType.APPLICATION 
              : this.platform.Characteristic.InputSourceType.HDMI );

          this.tvService.addLinkedService(inputService);

        }

        /**
         * Create TV Input Source Services
         * These are the inputs the user can select from.
         * When a user selected an input the corresponding Identifier Characteristic
         * is sent to the TV Service ActiveIdentifier Characteristic handler.
         */

        // HDMI 1 Input Source
        // link to tv service
        //
        // // HDMI 2 Input Source
        // const hdmi2InputService = this.tvAccessory.addService(this.Service.InputSource, 'hdmi2', 'HDMI 2');
        // hdmi2InputService
        //     .setCharacteristic(this.Characteristic.Identifier, 2)
        //     .setCharacteristic(this.Characteristic.ConfiguredName, 'HDMI 2')
        //     .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
        //     .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.HDMI);
        // this.tvService.addLinkedService(hdmi2InputService); // link to tv service
        //
        // // Netflix Input Source
        // const netflixInputService = this.tvAccessory.addService(this.Service.InputSource, 'netflix', 'Netflix');
        // netflixInputService
        //     .setCharacteristic(this.Characteristic.Identifier, 3)
        //     .setCharacteristic(this.Characteristic.ConfiguredName, 'Netflix')
        //     .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
        //     .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.HDMI);
        // this.tvService.addLinkedService(netflixInputService); // link to tv service
        //

        /**
         * Publish as external accessory
         * Only one TV can exist per bridge, to bypass this limitation, you should
         * publish your TV as an external accessory.
         */

        this.platform.api.publishExternalAccessories(PLUGIN_NAME, [this.accessory]);

    }
}
