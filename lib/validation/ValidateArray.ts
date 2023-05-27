
import { ControllersValidationMap, prepareValidationSchema, registerValidation } from "./Validate";
import { ContraintValidationError } from "../api";
import { Util } from "../util";

export interface ValidateArrayAttributtes {
    itemType: any;
    message?: string;
    groups?: string[];
    minItems?: number;
    maxItems?: number;
    nestedArrayValues?: boolean;
    itemValidator?: (sequelize: any, values: any, opt: any) => Promise<boolean>;
    itemValidators?: {
        message: string,
        validate: (sequelize: any, values: any, opt: any) => Promise<boolean>
    }[];
}

function getStoredValidation(group: string, key: any) {
    const item = ((ControllersValidationMap[`${key}`] || {}).body || {})[group] || {};
    item.type = "object";
    return item;
}

export const ValidateArray = (options: ValidateArrayAttributtes) => {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        const groups = options?.groups || ["CREATE"];
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["type"] = "array";
            if (options.minItems) ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["minItems"] = options.minItems;
            if (options.maxItems) ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["maxItems"] = options.maxItems;
            if (typeof options.itemType === "function") {
                if (Util.isClass(options.itemType)) {
                    ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"] =
                        getStoredValidation(group, options.itemType);
                    return;
                }
                options.itemType(target, propertyKey);
                const items = ControllersValidationMap[key]["body"][group]["properties"][propertyKey];
                ControllersValidationMap[key]["body"][group]["properties"][propertyKey] = { type: "array", items };
                return;
            } else if (typeof options.itemType === "object" && options.itemType instanceof Array) {
                const ajvValues = options.itemType
                    .map(item => {
                        if (typeof item == "function") {
                            if (Util.isClass(item)) return getStoredValidation(group, item);
                            const cachedSchema = ControllersValidationMap[key]["body"][group]["properties"][propertyKey];
                            options.itemType(target, propertyKey);
                            const items = ControllersValidationMap[key]["body"][group]["properties"][propertyKey];
                            ControllersValidationMap[key]["body"][group]["properties"][propertyKey] = cachedSchema;
                            return items;
                        }
                        return { type: item };
                    });
                ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"] = {
                    anyOf: ajvValues
                };
                return;
            }
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"] = {};
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["items"]["type"] = options.itemType;


            if (!options.itemValidators && !options.itemValidator) continue;
            const message = options.message || "The entry value '{value}' did not pass validation";
            const itemValidators = [...(options.itemValidators || []), (options.itemValidator ? {
                message,
                validate: options.itemValidator
            } : undefined)];
            registerValidation(target, group, {
                message,
                propertyKey,
                validate: async (sequelize: any, values: string[], opt: any) => {
                    for (const value of values) {
                        for (const itemValidator of itemValidators) {
                            if (!itemValidator) continue;
                            if (!await itemValidator.validate!(sequelize, value, opt)) {
                                throw new ContraintValidationError(itemValidator.message.replace(/{value}+/g, value));
                            }
                        }
                    }
                    return true;
                }
            });
        }
    };

}

