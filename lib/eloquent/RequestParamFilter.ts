
import { FieldUtil } from "../util";
import { BarmouryObject } from "../util/Types";

export const FieldsRequestParamFilterMap: BarmouryObject = {};

export interface RequestParamFilterAttrs {
    column?: string;
    aliases?: string[];
    alwaysQuery?: boolean;
    booleanToInt?: boolean;
    acceptSnakeCase?: boolean;
    columnIsSnakeCase?: boolean;
    multiFilterSeparator?: string;
    operator?: RequestParamFilterOperator;
    columnObjectFieldsIsSnakeCase?: boolean;
}

export function RequestParamFilter(options?: RequestParamFilterAttrs) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        if (!(key in FieldsRequestParamFilterMap)) FieldsRequestParamFilterMap[key] = {};
        FieldsRequestParamFilterMap[key][propertyKey] =
            FieldUtil.mergeArrays(FieldsRequestParamFilterMap[key][propertyKey], 
                barmouryObjectInternalSetParamFilterAttrsDefaults(options || {}));
    };

}

// lol
function barmouryObjectInternalSetParamFilterAttrsDefaults(attr: RequestParamFilterAttrs) {
    if (attr.alwaysQuery == undefined) attr.alwaysQuery = false;
    if (attr.booleanToInt == undefined) attr.booleanToInt = false;
    if (attr.acceptSnakeCase == undefined) attr.acceptSnakeCase = true;
    if (attr.columnIsSnakeCase == undefined) attr.columnIsSnakeCase = true;
    if (attr.multiFilterSeparator == undefined) attr.multiFilterSeparator = "__";
    if (attr.operator == undefined) attr.operator = RequestParamFilterOperator.EQ;
    if (attr.columnObjectFieldsIsSnakeCase == undefined) attr.columnObjectFieldsIsSnakeCase = true;
    return attr;
}

export enum RequestParamFilterOperator {
    EQ = "EQ",
    GT = "GT",
    LT = "LT",
    NE = "NE",
    IN = "IN",
    NONE = "NONE",
    LIKE = "LIKE",
    ILIKE = "ILIKE",
    GT_EQ = "GT_EQ",
    LT_EQ = "LT_EQ",
    RANGE = "RANGE",
    NOT_IN = "NOT_IN",
    ENTITY = "ENTITY",
    BETWEEN = "BETWEEN",
    NOT_LIKE = "NOT_LIKE",
    CONTAINS = "CONTAINS",
    NOT_ILIKE = "NOT_ILIKE",
    OBJECT_EQ = "OBJECT_EQ",
    OBJECT_NE = "OBJECT_NE",
    ENDS_WITH = "ENDS_WITH",
    NOT_BETWEEN = "NOT_BETWEEN",
    STARTS_WITH = "STARTS_WITH",
    OBJECT_LIKE = "OBJECT_LIKE",
    NOT_CONTAINS = "NOT_CONTAINS",
    OBJECT_STR_EQ = "OBJECT_STR_EQ",
    OBJECT_STR_NE = "OBJECT_STR_NE",
    SENSITIVE_LIKE = "SENSITIVE_LIKE",
    OBJECT_NOT_LIKE = "OBJECT_NOT_LIKE",
    OBJECT_CONTAINS = "OBJECT_CONTAINS",
    OBJECT_ENDS_WITH = "OBJECT_ENDS_WITH",
    SENSITIVE_NOT_LIKE = "SENSITIVE_NOT_LIKE",
    OBJECT_STARTS_WITH = "OBJECT_STARTS_WITH",
    OBJECT_NOT_CONTAINS = "OBJECT_NOT_CONTAINS",
    OBJECT_STR_ENDS_WITH = "OBJECT_STR_ENDS_WITH",
    SENSITIVE_OBJECT_LIKE = "SENSITIVE_OBJECT_LIKE",
    OBJECT_STR_STARTS_WITH = "OBJECT_STR_STARTS_WITH"
}

RequestParamFilter.Operator = RequestParamFilterOperator;
