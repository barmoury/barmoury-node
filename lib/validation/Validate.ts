
import "reflect-metadata";
import { FieldUtil } from "../util/FieldUtil";
import { BarmouryObject } from "../util/Types";

// empty it after controllers registration completes
export const ControllersValidationMap: BarmouryObject = {};

export interface ValidateAttributtes {
    model?: any;
    groups?: string[];
}

export interface ValidatorAttr {
    message: string;
    propertyKey: string;
    validate: (sequelize: any, value: any, opt: any) => Promise<boolean>;
}

export function Validate(attr?: ValidateAttributtes) {

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value.__barmoury_validate_groups = attr?.groups || ["CREATE"];
    };

}

export function prepareValidationMap(key: any, group: string = "CREATE") {
    if (!(key in ControllersValidationMap)) {
        ControllersValidationMap[key] = {};
    }
    if (!("__bamoury__validation_queries__" in ControllersValidationMap[key])) {
        ControllersValidationMap[key]["__bamoury__validation_queries__"] = {};
    }
    if (!(group in ControllersValidationMap[key]["__bamoury__validation_queries__"])) {
        ControllersValidationMap[key]["__bamoury__validation_queries__"][group] = [];
    }
}

export function prepareObjectAjvSchema(key: any, schema: any = {}, group: string = "CREATE") {
    if (!(key in ControllersValidationMap)) {
        ControllersValidationMap[key] = {};
    }
    if (!("body" in ControllersValidationMap[key])) {
        ControllersValidationMap[key]["body"] = {};
    }
    if (!(group in ControllersValidationMap[key]["body"])) {
        ControllersValidationMap[key]["body"][group] = {};
    }
    ControllersValidationMap[key]["body"][group] = FieldUtil.mergeObjects(true, ControllersValidationMap[key]["body"][group], schema);
}

export function prepareValidationSchema(key: any, propertyKey: string, target: any, group: string) {
    prepareObjectAjvSchema(key, {}, group); // TODO pick base on validator type
    if (!("required" in ControllersValidationMap[key]["body"][group])) {
        ControllersValidationMap[key]["body"][group]["required"] = [];
    }
    if (!("properties" in ControllersValidationMap[key]["body"][group])) {
        ControllersValidationMap[key]["body"][group]["properties"] = {};
    }
    if (!(propertyKey in ControllersValidationMap[key]["body"][group]["properties"])) {
        ControllersValidationMap[key]["body"][group]["properties"][propertyKey] = {};
    }
    if (!("type" in ControllersValidationMap[key]["body"][group]["properties"][propertyKey])) {
        ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["type"] =
            [Reflect.getMetadata("design:type", target, propertyKey).name.toLowerCase()];
    }
}

export function registerValidation(target: any, group: string, validation: ValidatorAttr) {
    const key = `${target.constructor}`;
    prepareValidationMap(key, group);
    ControllersValidationMap[key]["__bamoury__validation_queries__"][group].push(validation);
}

// TODO add schema validation suppport for Joi and Yup
