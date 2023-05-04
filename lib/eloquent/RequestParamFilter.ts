
import { BarmouryObject } from "../util/Types";

export interface RequestParamFilterAttributtes {
    column?: string;
    operator: Operator;
    aliases?: string[];
    alwaysQuery?: boolean;
    booleanToInt?: boolean;
    acceptSnakeCase?: boolean;
    columnIsSnakeCase?: boolean;
    multiFilterSeparator?: string;
    columnObjectFieldsIsSnakeCase?: boolean;
}

export function RequestParamFilter(options?: RequestParamFilterAttributtes) {

    return function (target: any, propertyKey: string) {
        //descriptor.value.__barmoury_validate_groups = attr?.groups || ["CREATE"];
    };

}

export enum Operator {
    EQ,
    GT,
    LT,
    NE,
    IN,
    LIKE,
    GT_EQ,
    LT_EQ,
    ENTITY,
    BETWEEN,
    NOT_LIKE,
    CONTAINS,
    OBJECT_EQ,
    OBJECT_NE,
    ENDS_WITH,
    STARTS_WITH,
    OBJECT_LIKE,
    NOT_CONTAINS,
    OBJECT_STR_EQ,
    OBJECT_STR_NE,
    SENSITIVE_LIKE,
    OBJECT_NOT_LIKE,
    OBJECT_CONTAINS,
    OBJECT_ENDS_WITH,
    SENSITIVE_NOT_LIKE,
    OBJECT_STARTS_WITH,
    OBJECT_NOT_CONTAINS,
    OBJECT_STR_ENDS_WITH,
    SENSITIVE_OBJECT_LIKE,
    OBJECT_STR_STARTS_WITH
}
