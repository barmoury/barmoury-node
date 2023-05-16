
import { Validator } from "./Validator";
import { BarmouryObject } from "../util/Types";
import { ControllersValidationMap, prepareValidationSchema } from "./Validate";
import { type } from "os";

export interface ValidateArrayAttributtes {
    itemType: any;
    message?: string;
    groups?: string[];
    minItems?: number;
    maxItems?: number;
}

export function ValidateArray(options: ValidateArrayAttributtes) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        const groups = options?.groups || ["CREATE"];
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["type"] = "array";
            if (options.minItems) ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["minItems"] = options.minItems;
            if (options.maxItems) ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["maxItems"] = options.maxItems;
            if (typeof options.itemType === "function") {
                const itemType = ((ControllersValidationMap[`${options.itemType}`] || {}).body || {})[group] || {};
                itemType.type = "object";
                ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"] = itemType;
                return;
            } else if (typeof options.itemType === "object" && options.itemType instanceof Array) {
                const ajvValues = options.itemType
                    .map(item => {
                        if (typeof item == "function") {
                            item = ((ControllersValidationMap[`${item}`] || {}).body || {})[group] || {};
                            item.type = "object";
                        }
                        return item;
                    });
                ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"] = {
                    anyOf: ajvValues
                };
                return;
            }
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"] = {};
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"]["type"] = options.itemType;
        }
    };

}
