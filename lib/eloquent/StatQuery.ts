
import { BarmouryObject, FieldUtil } from "../util";

export const FieldsStatQueryMap: BarmouryObject = {};

export interface StatQueryAttrs {
    fetchHourly?: boolean;
    fetchYearly?: boolean;
    fetchMonthly?: boolean;
    fetchWeekDays?: boolean;
    intervalColumn?: string;
    fetchPrevious?: boolean;
    fetchMonthDays?: boolean;
    enableClientQuery?: boolean;
    columnsAreSnakeCase?: boolean;
}

export function StatQuery(options?: StatQueryAttrs) {

    return function (target: any) {
        const key = `${target}`;
        if (!(key in FieldsStatQueryMap)) FieldsStatQueryMap[key] = {};
        FieldsStatQueryMap[key]["StatQuery"] =
            FieldUtil.mergeObjects(false, FieldsStatQueryMap[key]["StatQuery"],
                barmouryObjectInternalSetStatQueryAttrDefaults(options || {}));
    };

}

export function barmouryObjectInternalSetStatQueryAttrDefaults(attr: StatQueryAttrs) {
    if (attr.fetchHourly == undefined) attr.fetchHourly = false;
    if (attr.fetchYearly == undefined) attr.fetchYearly = false;
    if (attr.fetchMonthly == undefined) attr.fetchMonthly = false;
    if (attr.fetchWeekDays == undefined) attr.fetchWeekDays = false;
    if (attr.fetchPrevious == undefined) attr.fetchPrevious = false;
    if (attr.fetchMonthDays == undefined) attr.fetchMonthDays = false;
    if (attr.enableClientQuery == undefined) attr.enableClientQuery = false;
    if (attr.intervalColumn == undefined) attr.intervalColumn = "updated_at";
    if (attr.columnsAreSnakeCase == undefined) attr.columnsAreSnakeCase = true;
    return attr;
}

// ColumnQuery

export interface ColumnQueryAttr {
    name?: string;
    sqlFunction?: string;
    whereClause?: BarmouryObject;
}

export function ColumnQuery(options?: ColumnQueryAttr) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        if (!(key in FieldsStatQueryMap)) FieldsStatQueryMap[key] = barmouryObjectInternalSetStatQueryAttrDefaults({});
        if (!(propertyKey in FieldsStatQueryMap[key])) FieldsStatQueryMap[key][propertyKey] = {};
        FieldsStatQueryMap[key][propertyKey]["ColumnQuery"] =
            FieldUtil.mergeArrays(FieldsStatQueryMap[key][propertyKey]["ColumnQuery"],
                boiColumnQueryAttrDefaults(options || {}));
    };

}

export function boiColumnQueryAttrDefaults(attr: ColumnQueryAttr) {
    if (attr.whereClause == undefined) attr.whereClause = {};
    if (attr.sqlFunction == undefined) attr.sqlFunction = "";
    if (attr.name == undefined) attr.name = "%s_count";
    return attr;
}

// OccurrenceQuery

export interface OccurrenceQueryAttr {
    name?: string;
    fetchCount?: number;
    type?: OccurrenceQueryType;
    whereClause?: BarmouryObject;
}

export function OccurrenceQuery(options?: OccurrenceQueryAttr) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        if (!(key in FieldsStatQueryMap)) FieldsStatQueryMap[key] = barmouryObjectInternalSetStatQueryAttrDefaults({});
        if (!(propertyKey in FieldsStatQueryMap[key])) FieldsStatQueryMap[key][propertyKey] = {};
        FieldsStatQueryMap[key][propertyKey]["OccurrenceQuery"] =
            FieldUtil.mergeArrays(FieldsStatQueryMap[key][propertyKey]["OccurrenceQuery"],
                boiOccurrenceQueryAttrDefaults(options || {}));
    };

}

export enum OccurrenceQueryType {
    COUNT = "count",
    PERCENTAGE = "percentage"
}

export function boiOccurrenceQueryAttrDefaults(attr: OccurrenceQueryAttr) {
    if (attr.name == undefined) attr.name = "top_%s_%s";
    if (attr.fetchCount == undefined) attr.fetchCount = 10;
    if (attr.whereClause == undefined) attr.whereClause = {};
    if (attr.type == undefined) attr.type = OccurrenceQueryType.COUNT;
    return attr;
}

OccurrenceQuery.Type = OccurrenceQueryType;

// AverageQuery

export interface AverageQueryAttr {
    name?: string;
    whereClause?: BarmouryObject;
}

export function AverageQuery(options?: AverageQueryAttr) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        if (!(key in FieldsStatQueryMap)) FieldsStatQueryMap[key] = barmouryObjectInternalSetStatQueryAttrDefaults({});
        if (!(propertyKey in FieldsStatQueryMap[key])) FieldsStatQueryMap[key][propertyKey] = {};
        FieldsStatQueryMap[key][propertyKey]["AverageQuery"] =
            FieldUtil.mergeArrays(FieldsStatQueryMap[key][propertyKey]["AverageQuery"],
                boiAverageQueryAttrDefaults(options || {}));
    };

}

export function boiAverageQueryAttrDefaults(attr: AverageQueryAttr) {
    if (attr.name == undefined) attr.name = "average_%s";
    if (attr.whereClause == undefined) attr.whereClause = {};
    return attr;
}

// MedianQuery

export interface MedianQueryAttr {
    name?: string;
    whereClause?: BarmouryObject;
}

export function MedianQuery(options?: MedianQueryAttr) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        if (!(key in FieldsStatQueryMap)) FieldsStatQueryMap[key] = barmouryObjectInternalSetStatQueryAttrDefaults({});
        if (!(propertyKey in FieldsStatQueryMap[key])) FieldsStatQueryMap[key][propertyKey] = {};
        FieldsStatQueryMap[key][propertyKey]["MedianQuery"] =
            FieldUtil.mergeArrays(FieldsStatQueryMap[key][propertyKey]["MedianQuery"],
                boiMedianQueryAttrDefaults(options || {}));
    };

}

export function boiMedianQueryAttrDefaults(attr: MedianQueryAttr) {
    if (attr.name == undefined) attr.name = "median_%s";
    if (attr.whereClause == undefined) attr.whereClause = {};
    return attr;
}

// PercentageChangeQuery

export interface PercentageChangeQueryAttr {
    name?: string;
    sqlFunction?: string;
    whereClause?: BarmouryObject;
}

export function PercentageChangeQuery(options?: PercentageChangeQueryAttr) {

    return function (target: any, propertyKey: string) {
        const key = `${target.constructor}`;
        if (!(key in FieldsStatQueryMap)) FieldsStatQueryMap[key] = barmouryObjectInternalSetStatQueryAttrDefaults({});
        if (!(propertyKey in FieldsStatQueryMap[key])) FieldsStatQueryMap[key][propertyKey] = {};
        FieldsStatQueryMap[key][propertyKey]["PercentageChangeQuery"] =
            FieldUtil.mergeArrays(FieldsStatQueryMap[key][propertyKey]["PercentageChangeQuery"],
                boiPercentageChangeQueryAttrDefaults(options || {}));
    };

}

export function boiPercentageChangeQueryAttrDefaults(attr: PercentageChangeQueryAttr) {
    if (attr.whereClause == undefined) attr.whereClause = {};
    if (attr.sqlFunction == undefined) attr.sqlFunction = "COUNT";
    if (attr.name == undefined) attr.name = "%s_percentage_change";
    return attr;
}

// end

OccurrenceQuery.Type = OccurrenceQueryType;

StatQuery.ColumnQuery = ColumnQuery;
StatQuery.MedianQuery = MedianQuery;
StatQuery.AverageQuery = AverageQuery;
StatQuery.OccurrenceQuery = OccurrenceQuery;
StatQuery.PercentageChangeQuery = PercentageChangeQuery;
