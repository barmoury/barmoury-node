
import "reflect-metadata";
import { ControllersValidationMap, prepareValidationSchema } from "./Validated";

export interface ValidAttributes {
    value?: any;
    groups?: string[];
}

export function Valid(options?: ValidAttributes) {

    return function (target: any, propertyKey: string) {
        const groups = options?.groups || ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            let value = options?.value || Reflect.getMetadata("design:type", target, propertyKey);
            if (typeof value !== "function") return;
            const schema = ((ControllersValidationMap[`${value}`] || {}).body || {})[group] || {};
            schema.type = "object"; ControllersValidationMap[key]["body"][group]["properties"][propertyKey] = schema;
        }
    };

}
