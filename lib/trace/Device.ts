
const UAParser = require("ua-parser-js")
const parser = new UAParser("user-agent");

export class Device {

    osName?: string;
    osVersion?: string;
    engineName?: string;
    deviceName?: string;
    deviceType?: string;
    deviceClass?: string;
    browserName?: string;
    engineVersion?: string;
    browserVersion?: string;

    static build(userAgent: string): Device {
        parser.setUA(userAgent);
        const result = parser.getResult();
        const device = {
            osName: result.os.name,
            osVersion: result.os.version,
            deviceType: result.device.type,
            engineName: result.engine.name,
            deviceName: result.device.model,
            browserName: result.browser.name,
            deviceClass: result.device.vendor,
            engineVersion: result.engine.version,
            browserVersion: result.browser.version,
        };
        return device;
    }

}

