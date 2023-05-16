
import { FastifyRequest } from "fastify";
import sequelize, { Op } from "sequelize";
import { BarmouryObject, FieldUtil } from "../util";
import { EntityNotFoundError, Model, Timeo } from "../api";
import {
    FieldsRequestParamFilterMap, FieldsStatQueryMap, RequestParamFilter, RequestParamFilterAttrs,
    RequestParamFilterOperator,
    SqlInterface,
    StatQuery,
    StatQueryAttrs,
    barmouryObjectInternalSetStatQueryAttrDefaults
} from ".";

export class QueryArmoury {

    sqlInterface: SqlInterface;
    static PERCENTAGE_CHANGE_RELAY_KEY = "___percentage_change____";

    constructor(sqlInterface: SqlInterface) {
        this.sqlInterface = sqlInterface;
    }

    async pageQuery<T>(request: FastifyRequest, clazz: (new (...args: any[]) => Model<any, any>), springLike: boolean = false) {
        const query = (request.query as any);
        const joinTables: BarmouryObject = {};
        const pageFilter = this.buildPageFilter(query);
        const requestFields = this.resolveQueryFields(clazz, request, joinTables);
        const filter = FieldUtil.mergeObjects(true, FieldUtil.mergeObjects(false,
            this.buildWhereFilter(requestFields, joinTables), pageFilter));
        const result = await (clazz as any).findAndCountAll(filter);
        return (springLike ? this.makeResultSpringy(result, filter) : result);
    }

    async statWithQuery<T>(request: FastifyRequest, clazz: (new (...args: any[]) => Model<any, any>)) {
        const joinTables: BarmouryObject = {};
        const requestFields = this.resolveQueryFields(clazz, request, joinTables);
        const statRequestFields = this.resolveQueryFields(clazz, request, joinTables, true);
        const filter = this.buildWhereFilter(requestFields, joinTables);
        const statQuery = (`${clazz}` in FieldsStatQueryMap && "StatQuery" in FieldsStatQueryMap[`${clazz}`])
            ? FieldsStatQueryMap[`${clazz}`]["StatQuery"] : barmouryObjectInternalSetStatQueryAttrDefaults({});
        return await this.getResourceStat(statRequestFields, requestFields, request,
            filter, statQuery, true, clazz);
    }

    async getResourceStat(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        isMainStat: boolean,
        clazz: (new (...args: any[]) => Model<any, any>),
        currentPercentageMap?: BarmouryObject) {

        let newEndDateStr = null;
        let newStartDateStr = null;
        const stat: BarmouryObject = {};

        const medianQueries: BarmouryObject = {};
        const columnQueries: BarmouryObject = {};
        const averageQueries: BarmouryObject = {};
        const occurrenceQueries: BarmouryObject = {};
        const percentageChangeQueries: BarmouryObject = {};

        for (const [name, values] of Object.entries(statRequestFields)) {
            const columnName = values[0];
            if (values[4].length) medianQueries[columnName] = values[4];
            if (values[5].length) columnQueries[columnName] = values[5];
            if (values[6].length) averageQueries[columnName] = values[6];
            if (values[7].length) occurrenceQueries[columnName] = values[7];
            if (values[8].length) percentageChangeQueries[columnName] = values[8];
        }

        let to;
        let from;
        let toKey;
        let fromKey;
        let toDate: Date;
        let different = 0;
        let startDate: Date;
        let isCamelCase = false;
        let differentUnit = "days";
        let containsIntervalValues = false;

        let intervalColumn = statQuery.intervalColumn;
        if (this.hasStatQueryCapability(request, statQuery, "interval_column", clazz)) {
            let qValue = (request.query as any)["stat.query.interval_column"];
            if (qValue != null) intervalColumn = `${qValue}`;
        }
        fromKey = intervalColumn + "_from";
        if (!(fromKey in requestFields)) {
            isCamelCase = true;
            fromKey = FieldUtil.toCamelCase(fromKey);
        }
        toKey = isCamelCase ? intervalColumn + "To" : intervalColumn + "_to";
        containsIntervalValues = (fromKey in requestFields) && (toKey in requestFields);
        if (containsIntervalValues) {
            from = requestFields[fromKey][3][0];
            to = requestFields[toKey][3][0];
            startDate = Timeo.fromSimpleSqlDate(from);
            toDate = Timeo.fromSimpleSqlDate(to);
        }
        let processPrevious = isMainStat && !currentPercentageMap &&
            containsIntervalValues && statQuery.fetchPrevious &&
            this.hasStatQueryCapability(request, statQuery, "fetch_previous", clazz);
        if (processPrevious) {
            let newEndDate: Date = new Date(startDate!.getTime());
            let newStartDate: Date = new Date(startDate!.getTime());
            different = Timeo.dateDiffInDays(toDate!, startDate!);
            if (different < 0) {
                newStartDate.setDate(newStartDate.getDate() + different);
            } else {
                different = Timeo.dateDiffInHours(toDate!, startDate!);
                if (different < 0) {
                    newStartDate.setHours(newStartDate.getHours() + different);
                    differentUnit = "hours";
                } else {
                    different = Timeo.dateDiffInMinutes(toDate!, startDate!);
                    newStartDate.setMinutes(newStartDate.getMinutes() + different);
                    differentUnit = "minutes";
                }
            }
            newEndDateStr = Timeo.toSimpleSqlDate(newEndDate);
            newStartDateStr = Timeo.toSimpleSqlDate(newStartDate);
        }
        const totalCount = await this.resolveColumnQueries(request, clazz, stat, statQuery, filter, requestFields, columnQueries);
        if (Object.keys(medianQueries).length && this.hasStatQueryCapability(request, statQuery, "process_medians", clazz)) {
            await this.resolveMedianQueries(request, clazz, stat, statQuery, filter, requestFields, medianQueries);
        }
        if (Object.keys(averageQueries) && this.hasStatQueryCapability(request, statQuery, "process_averages", clazz)) {
            await this.resolveAverageQueries(request, clazz, stat, statQuery, filter, requestFields, averageQueries);
        }
        if (Object.keys(occurrenceQueries) && this.hasStatQueryCapability(request, statQuery, "process_occurrences", clazz)) {
            await this.resolveOccurrenceQueries(request, clazz, stat, totalCount, statQuery, filter, statRequestFields,
                occurrenceQueries);
        }

        let percentageMap = null;
        if (Object.keys(percentageChangeQueries)
            && this.hasStatQueryCapability(request, statQuery, "process_percentage_changes", clazz)) {
            percentageMap = await this.resolvePercentageChangeQueries(request, clazz, stat, statQuery, filter, statRequestFields, percentageChangeQueries);
        }
        if (isMainStat && from) {
            stat["from"] = from;
            stat["to"] = to;
        }

        let previous = null;
        if (processPrevious) {
            previous = await this.getStatBetweenDate(statRequestFields, requestFields, percentageMap!, request,
                filter, statQuery, clazz,
                fromKey, toKey,
                newStartDateStr!, newEndDateStr!,
                differentUnit, -different);

        }
        if (percentageMap && currentPercentageMap) {
            stat[QueryArmoury.PERCENTAGE_CHANGE_RELAY_KEY] =
                await this.resolvePercentageChangeQueries_Calc(currentPercentageMap, percentageMap);
        }
        if (processPrevious) {
            if (QueryArmoury.PERCENTAGE_CHANGE_RELAY_KEY in previous!) {
                const percentageChange = previous![QueryArmoury.PERCENTAGE_CHANGE_RELAY_KEY];
                delete previous![QueryArmoury.PERCENTAGE_CHANGE_RELAY_KEY];
                for (const [fieldName, value] of Object.entries(percentageChange)) {
                    stat[fieldName] = value;
                }
            }
            stat["previous"] = previous;
        }

        if (isMainStat && !!startDate! && statQuery.fetchHourly &&
            this.hasStatQueryCapability(request, statQuery, "fetch_hourly", clazz)) {
            stat["hourly"] = await this.fetchHourly(statRequestFields, requestFields, request,
                filter, statQuery, clazz, fromKey, toKey, startDate!, toDate!);
        }
        if (isMainStat && !!startDate! && statQuery.fetchMonthly &&
            this.hasStatQueryCapability(request, statQuery, "fetch_monthly", clazz)) {
            stat["monthly"] = await this.fetchMonthly(statRequestFields, requestFields, request,
                filter, statQuery, clazz, fromKey, toKey, startDate!);
        }
        if (isMainStat && !!startDate! && statQuery.fetchWeekDays &&
            this.hasStatQueryCapability(request, statQuery, "fetch_week_days", clazz)) {
            stat[(clazz as any).underscored ? "week_days" : "weekDays"] = await this.fetchWeekDays(statRequestFields,
                requestFields, request, filter, statQuery, clazz, fromKey, toKey, startDate!);
        }
        if (isMainStat && !!startDate! && statQuery.fetchMonthDays &&
            this.hasStatQueryCapability(request, statQuery, "fetch_month_days", clazz)) {
            stat[(clazz as any).underscored ? "month_days" : "monthDays"] = await this.fetchMonthDays(statRequestFields,
                requestFields, request, filter, statQuery, clazz, fromKey, toKey, startDate!);
        }
        if (isMainStat && !!startDate! && statQuery.fetchYearly &&
            this.hasStatQueryCapability(request, statQuery, "fetch_yearly", clazz)) {
            stat["yearly"] = await this.fetchYearly(statRequestFields, requestFields, request,
                filter, statQuery, clazz, fromKey, toKey, startDate!, toDate!);
        }

        return stat;
    }

    async fetchHourly(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        clazz: any,

        fromKey: string,
        toKey: string,
        startDate: Date,
        endDate: Date) {

        const result: any[] = [];
        let different = Timeo.dateDiffInHours(startDate, endDate);
        while (different > 0) {
            endDate = new Date(startDate!.getTime());
            endDate.setHours(endDate.getHours() + 1);
            different--;
            result.push(await this.getStatBetweenDate(statRequestFields, requestFields, null, request,
                filter, statQuery, clazz,
                fromKey, toKey,
                Timeo.toSimpleSqlDate(startDate), Timeo.toSimpleSqlDate(endDate),
                "hourly", different + 1));
            startDate = new Date(endDate!.getTime());
        }
        return result;

    }

    async fetchMonthly(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        clazz: any,

        fromKey: string,
        toKey: string,
        mainStartDate: Date) {

        const result: any[] = [];
        const monthIndex = mainStartDate.getMonth();
        mainStartDate = new Date(mainStartDate.getFullYear(), 0, 1);

        for (let index = 0; index < 12; index++) {
            const startDate = new Date(mainStartDate!.getTime());
            startDate.setMonth(index);
            startDate.setDate(1);
            const endDate = new Date(startDate!.getTime());
            endDate.setMonth(index + 1);
            endDate.setDate(0);
            const stat = await this.getStatBetweenDate(statRequestFields, requestFields, null, request,
                filter, statQuery, clazz,
                fromKey, toKey,
                Timeo.toSimpleSqlDate(startDate), Timeo.toSimpleSqlDate(endDate),
                "monthly", index - monthIndex);
            stat[clazz.underscored ? "month_name" : "monthName"] = startDate.toLocaleString('default', { month: 'long' });
            result.push(stat);
        }
        return result;

    }

    async fetchWeekDays(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        clazz: any,

        fromKey: string,
        toKey: string,
        mainStartDate: Date) {

        const result: any[] = [];
        const dayIndex = mainStartDate.getDay();
        mainStartDate.setDate(mainStartDate.getDate() + (0 - dayIndex));

        for (let index = 0; index < 7; index++) {
            const startDate = new Date(mainStartDate!.getTime());
            startDate.setDate(startDate.getDate() + (index));
            const endDate = new Date(startDate!.getTime());
            endDate.setDate(startDate.getDate() + 1);

            const stat = await this.getStatBetweenDate(statRequestFields, requestFields, null, request,
                filter, statQuery, clazz,
                fromKey, toKey,
                Timeo.toSimpleSqlDate(startDate), Timeo.toSimpleSqlDate(endDate),
                (clazz.underscored ? "week_day" : "weekDay"), index - dayIndex);
            stat[clazz.underscored ? "week_day" : "weekDay"] = startDate.toLocaleString('default', { weekday: 'long' });
            result.push(stat);
        }
        return result;

    }

    async fetchMonthDays(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        clazz: any,

        fromKey: string,
        toKey: string,
        mainStartDate: Date) {

        const result: any[] = [];
        const dateIndex = mainStartDate.getDate();
        const maxMonthDate = (new Date(mainStartDate.getFullYear(), mainStartDate.getMonth() + 1, 0)).getDate();

        for (let index = 1; index <= maxMonthDate; index++) {
            const startDate = new Date(mainStartDate!.getTime());
            startDate.setDate(index);
            const endDate = new Date(startDate!.getTime());
            endDate.setDate(index + 1);

            const stat = await this.getStatBetweenDate(statRequestFields, requestFields, null, request,
                filter, statQuery, clazz,
                fromKey, toKey,
                Timeo.toSimpleSqlDate(startDate), Timeo.toSimpleSqlDate(endDate),
                (clazz.underscored ? "day_of_month" : "dayOfMonth"), index - dateIndex);
            stat[clazz.underscored ? "day_of_month" : "dayOfMonth"] = index;
            result.push(stat);
        }
        return result;

    }

    async fetchYearly(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        clazz: any,

        fromKey: string,
        toKey: string,
        startDate: Date,
        endDate: Date) {

        const result: any[] = [];
        let different = Timeo.dateDiffInYears(startDate, endDate) + 1;

        for (let index = 0; index < different; index++) {
            startDate = new Date(startDate.getFullYear() + index, 0, 1);
            endDate = new Date(startDate.getFullYear(), 12, 0);
            const stat = await this.getStatBetweenDate(statRequestFields, requestFields, null, request,
                filter, statQuery, clazz,
                fromKey, toKey,
                Timeo.toSimpleSqlDate(startDate), Timeo.toSimpleSqlDate(endDate),
                "yearly", different - index - 1);
            stat["year"] = startDate.getFullYear();
            result.push(stat);
        }
        return result;

    }

    async getStatBetweenDate(statRequestFields: BarmouryObject,
        requestFields: BarmouryObject,
        currentPercentageMap: BarmouryObject | null,
        request: FastifyRequest,
        filter: BarmouryObject,
        statQuery: StatQueryAttrs,
        clazz: any,

        fromKey: string,
        toKey: string,
        newStartStr: string,
        newEndStr: string,

        differentUnit: string,
        different: number) {

        const modified1 = requestFields[toKey]; modified1[3] = newEndStr;
        requestFields[toKey] = modified1;
        const modified2 = requestFields[fromKey]; modified2[3] = newStartStr;
        requestFields[fromKey] = modified2;
        filter.where[modified2[0]][Op.lte] = newEndStr;
        filter.where[modified2[0]][Op.gte] = newStartStr;
        const result = await this.getResourceStat(statRequestFields, requestFields, request, filter, statQuery, false,
            clazz, currentPercentageMap!);
        result["from"] = newStartStr;
        result["to"] = newEndStr;
        result[clazz.underscored ? "difference_unit" : "differenceUnit"] = differentUnit;
        result[clazz.underscored ? "difference_from_present" : "differenceFromPresent"] = different;

        return result;

    }

    async resolveColumnQueries(request: FastifyRequest,
        clazz: any,
        stat: BarmouryObject,
        statQuery: StatQueryAttrs,
        filter: BarmouryObject,
        requestFields: BarmouryObject,
        columnQueries: BarmouryObject) {

        const countName = clazz.tableName + (statQuery.columnsAreSnakeCase ? "_count" : "Count");
        const totalCount = await clazz.count(filter);
        stat[countName] = totalCount;

        if (this.hasStatQueryCapability(request, statQuery, "process_column_queries", clazz)) {
            for (const [columnName, queries] of Object.entries(columnQueries)) {
                for (const query of queries) {
                    const name = query.name.length
                        ? FieldUtil.strFormat(query.name, columnName)
                        : columnName;
                    const hasFunction = !!query.sqlFunction.length;
                    const ownFilter = FieldUtil.mergeObjects(true, filter, query.whereClause);
                    ownFilter.raw = true;
                    ownFilter.group = columnName;
                    if (hasFunction) {
                        ownFilter.attributes = [
                            [sequelize.fn(query.sqlFunction, sequelize.col(columnName)), name]
                        ];
                    } else {
                        ownFilter.attributes = [[columnName, name]];
                    }
                    const result = await clazz.findAll(ownFilter);
                    stat[name] = FieldUtil.getSequlizeSingleValue(result, name);
                }
            }
        }

        return totalCount;
    }

    async resolveMedianQueries(request: FastifyRequest,
        clazz: any,
        stat: BarmouryObject,
        statQuery: StatQueryAttrs,
        filter: BarmouryObject,
        requestFields: BarmouryObject,
        medianQueries: BarmouryObject) {

        /*for (const [columnName, queries] of Object.entries(medianQueries)) {
            for (const query of queries) {
                const name = query.name.length
                    ? FieldUtil.strFormat(query.name, columnName)
                    : columnName;
                const ownFilter = FieldUtil.mergeObjects(true, filter, query.whereClause);
                ownFilter.raw = true;
                ownFilter.group = columnName;
                ownFilter.attributes = [
                    sequelize.literal(` ${clazz.tableName} entity2`),
                    [sequelize.literal(`SUM(${columnName})`), name]
                ];
                const result = await clazz.findOne(ownFilter);
                //stat[name] = result.dataValues[name];
                console.log("GATER HERE MEDIAN", result, clazz.tableName);
            }
        }*/
    }

    async resolveAverageQueries(request: FastifyRequest,
        clazz: any,
        stat: BarmouryObject,
        statQuery: StatQueryAttrs,
        filter: BarmouryObject,
        requestFields: BarmouryObject,
        averageQueries: BarmouryObject) {

        for (const [columnName, queries] of Object.entries(averageQueries)) {
            for (const query of queries) {
                const name = query.name.length
                    ? FieldUtil.strFormat(query.name, columnName)
                    : columnName;
                const ownFilter = FieldUtil.mergeObjects(true, filter, query.whereClause);
                ownFilter.raw = true;
                ownFilter.group = columnName;
                ownFilter.attributes = [
                    [sequelize.fn(this.sqlInterface.averageFunction(), sequelize.col(columnName)), name]
                ];
                const result = await clazz.findAll(ownFilter);
                stat[name] = FieldUtil.getSequlizeSingleValue(result, name);
            }
        }
    }

    async resolveOccurrenceQueries(request: FastifyRequest,
        clazz: any,
        stat: BarmouryObject,
        totalCount: number,
        statQuery: StatQueryAttrs,
        filter: BarmouryObject,
        statRequestFields: BarmouryObject,
        occurrenceQueries: BarmouryObject) {

        for (const [columnName, queries] of Object.entries(occurrenceQueries)) {
            for (const query of queries) {
                const name = query.name.length
                    ? FieldUtil.strFormat(query.name, columnName, query.type)
                    : columnName;
                const ownFilter = FieldUtil.mergeObjects(true, filter, query.whereClause);
                ownFilter.raw = true;
                ownFilter.group = columnName;
                ownFilter.order = [["count", "DESC"]];
                ownFilter.attributes = [
                    columnName,
                    [sequelize.fn(this.sqlInterface.countFunction(), sequelize.col(columnName)), "count"]
                ];
                const occurrence: BarmouryObject = {};
                const result = await clazz.findAll(ownFilter);
                for (const row of result) {
                    const count = FieldUtil.getSequlizeSingleValue(row, "count");
                    let key = FieldUtil.getSequlizeSingleValue(row, columnName);
                    if (key == null || key == undefined) continue;
                    let camelCasedName = columnName;
                    if (`${key}` == "1" || `${key}` == "0") camelCasedName = FieldUtil.toCamelCase(columnName);
                    if (columnName in statRequestFields || camelCasedName in statRequestFields) {
                        let requestParamFilter = statRequestFields[columnName];
                        if (!requestParamFilter) requestParamFilter = statRequestFields[camelCasedName];
                        if (requestParamFilter) requestParamFilter = requestParamFilter[2];
                        if (requestParamFilter != null && requestParamFilter.booleanToInt) {
                            key = `${key}` != "0";
                        }
                    }
                    if (query.type == StatQuery.OccurrenceQuery.Type.PERCENTAGE) {
                        occurrence[`${key}`] = ((count * 100) / totalCount);
                    } else {
                        occurrence[`${key}`] = count;
                    }
                }
                stat[name] = occurrence;
            }
        }
    }

    // percentage, say last month is 10 this month = 20
    // ((20 - 10) / 10) * 100
    async resolvePercentageChangeQueries(request: FastifyRequest,
        clazz: any,
        stat: BarmouryObject,
        statQuery: StatQueryAttrs,
        filter: BarmouryObject,
        statRequestFields: BarmouryObject,
        percentageChangeQueries: BarmouryObject) {

        const percentageMap: BarmouryObject = {};
        for (const [columnName, queries] of Object.entries(percentageChangeQueries)) {
            for (const query of queries) {
                const name = query.name.length
                    ? FieldUtil.strFormat(query.name, columnName)
                    : columnName;
                const ownFilter = FieldUtil.mergeObjects(true, filter, query.whereClause);
                ownFilter.raw = true;
                ownFilter.attributes = [
                    [sequelize.fn(query.sqlFunction, sequelize.col(columnName)), "count"]
                ];
                const result = await clazz.findOne(ownFilter);
                percentageMap[name] = FieldUtil.getSequlizeSingleValue(result, "count") || 0;
            }
        }
        return percentageMap;
    }

    // percentage, say last month is 10 this month = 20
    // ((20 - 10) / 10) * 100
    async resolvePercentageChangeQueries_Calc(current: BarmouryObject, previous: BarmouryObject) {
        const result: BarmouryObject = {};

        for (const [columnName, value] of Object.entries(current)) {
            const prev = parseFloat(previous[columnName]);
            let percentageChange = parseFloat(value) - prev;
            percentageChange = percentageChange / prev;
            percentageChange = percentageChange * 100.0;
            result[columnName] = !isFinite(percentageChange) || isNaN(percentageChange) ? 100 : percentageChange;
        }

        return result;
    }

    hasStatQueryCapability(request: FastifyRequest, statQuery: StatQueryAttrs, capability: string, clazz: any) {
        if (statQuery == null) return false;
        if (!clazz?.underscored) capability = FieldUtil.toCamelCase(capability);
        capability = "stat.query." + capability;
        return (!statQuery.enableClientQuery
            || !(capability in (request.query as any))
            || (capability in (request.query as any) &&
                `${(request.query as any)[capability]}` != "false"));
    }

    resolveQueryFields<T>(clazz: (new (...args: any[]) => Model<any, any>),
        request: FastifyRequest,
        joinTables: BarmouryObject,
        resolveStatQueryAnnotations: boolean = false) {

        const requestFields: BarmouryObject = {};
        const fields = FieldUtil.getAllFields(FieldsRequestParamFilterMap, clazz);
        for (let [mainFieldName, value, key] of fields) {
            const requestParamFilters = value as RequestParamFilterAttrs[];
            let columnName = FieldUtil.getFieldColumnName(mainFieldName, (clazz as any).underscored);
            const requestParamFiltersCount = requestParamFilters.length;
            for (let requestParamFilter of requestParamFilters) {
                if (requestParamFilter.column) columnName = requestParamFilter.column;
                if (requestParamFilter.columnIsSnakeCase) columnName = FieldUtil.toSnakeCase(columnName);

                let fieldName = mainFieldName;
                if (requestParamFiltersCount > 1) {
                    const operator: string = requestParamFilter.operator as unknown as string;
                    fieldName = `${fieldName}${requestParamFilter.multiFilterSeparator == "__" &&
                        (requestParamFilter.acceptSnakeCase || (clazz as any).underscored)
                        ? "_" : requestParamFilter.multiFilterSeparator
                        }${operator[0]}${operator.substring(1)}`;
                }
                let extraFieldNames: any = [];
                extraFieldNames.push(fieldName);
                if (!resolveStatQueryAnnotations) {
                    extraFieldNames = new Set(FieldUtil.mergeArrays(extraFieldNames, requestParamFilter.aliases));
                    if (requestParamFilter.acceptSnakeCase) {
                        for (const extraFieldName of extraFieldNames) {
                            extraFieldNames.add(FieldUtil.toSnakeCase(extraFieldName));
                        }
                    }
                    if (requestParamFilter.operator === RequestParamFilter.Operator.RANGE) {
                        const fromExtraFieldNames: Set<string> = new Set();
                        const toExtraFieldNames: Set<string> = new Set();
                        for (const extraFieldName of extraFieldNames) {
                            fromExtraFieldNames.add(extraFieldName + (extraFieldName.includes("_") ? "_from" : "From"));
                            toExtraFieldNames.add(extraFieldName + (extraFieldName.includes("_") ? "_to" : "To"));
                        }
                        const fromRequestParamFilter2 = FieldUtil.cloneObjects([], requestParamFilter);
                        const toRequestParamFilter2 = FieldUtil.cloneObjects([], requestParamFilter);
                        fromRequestParamFilter2.operator = RequestParamFilter.Operator.GT_EQ;
                        toRequestParamFilter2.operator = RequestParamFilter.Operator.LT_EQ;
                        this.resolveQueryForSingleField(clazz, requestFields, fromRequestParamFilter2, false,
                            joinTables, request, fromExtraFieldNames, columnName, { name: mainFieldName, key });
                        this.resolveQueryForSingleField(clazz, requestFields, toRequestParamFilter2, false,
                            joinTables, request, toExtraFieldNames, columnName, { name: mainFieldName, key });
                        continue;
                    }
                }
                this.resolveQueryForSingleField(clazz, requestFields, requestParamFilter, resolveStatQueryAnnotations,
                    joinTables, request, extraFieldNames, columnName, { name: mainFieldName, key });
            }
            // for stat query
            if (resolveStatQueryAnnotations && requestParamFiltersCount == 0) {
                const extraFieldNames = new Set<string>(); extraFieldNames.add(mainFieldName);
                this.resolveQueryForSingleField(clazz, requestFields, {} as RequestParamFilterAttrs, resolveStatQueryAnnotations,
                    joinTables, request, extraFieldNames, columnName, { name: mainFieldName, key });
            }
        }
        return requestFields;
    }

    resolveQueryForSingleField(clazz: (new (...args: any[]) => Model<any, any>),
        requestFields: BarmouryObject,
        requestParamFilter: RequestParamFilterAttrs,
        resolveStatQueryAnnotations: boolean,
        joinTables: BarmouryObject,
        request: FastifyRequest,
        queryParams: Set<string>,
        columnName: string,
        field: any) {

        for (let queryParam of queryParams) {
            let isPresent = false;
            const values: string[] = [];
            const isEntity = !resolveStatQueryAnnotations && requestParamFilter.operator == RequestParamFilter.Operator.ENTITY;
            const objectFilter = (!resolveStatQueryAnnotations
                && (requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_EQ
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_NE
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_LIKE
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_STR_EQ
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_STR_NE
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_NOT_LIKE
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_CONTAINS
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_ENDS_WITH
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_STARTS_WITH
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_NOT_CONTAINS
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_STR_ENDS_WITH
                    || requestParamFilter.operator == RequestParamFilter.Operator.OBJECT_STR_STARTS_WITH));

            if (!resolveStatQueryAnnotations/* && requestParamFilter.operator !== RequestParamFilter.Operator.NONE*/) {
                for (let [key, eValues] of Object.entries(request.query as any)) {
                    if (key == queryParam || (objectFilter && key.startsWith(queryParam))
                        || (isEntity && key.startsWith(`${queryParam}.`))) {
                        let anyValuePresent = false;
                        if (typeof eValues == "string") eValues = [eValues];
                        for (let value of eValues as any) {
                            if (value == "" || value == undefined || value == null) continue;
                            if (requestParamFilter.booleanToInt) value = value == "true" ? "1" : "0";
                            values.push(value);
                            isPresent = true;
                            if (!anyValuePresent) anyValuePresent = true;
                            if (!anyValuePresent) continue;
                        }
                        queryParam = (objectFilter && requestParamFilter.columnObjectFieldsIsSnakeCase
                            ? FieldUtil.toSnakeCase(key) : key);
                        break;
                    }
                }
                if (!resolveStatQueryAnnotations && !isPresent && !requestParamFilter.alwaysQuery) {
                    continue;
                }
                if (queryParam in requestFields) {
                    continue;
                }
            }
            if (resolveStatQueryAnnotations) queryParam = field.name;
            // handle join columns
            // end handle join column
            const rfValue = [
                columnName,
                isPresent,
                requestParamFilter,
                values,
            ];
            /*if (!resolveStatQueryAnnotations && entity != null) {
                requestFields.put(queryParam, fieldClass);
                joinTables.put(entity.name(), joinColumn);
            }*/
            if (resolveStatQueryAnnotations) {
                let medianQueries = [];
                let columnQueries = [];
                let averageQueries = [];
                let occurrenceQueries = [];
                let percentageChangeQueries = [];
                if ((field.key in FieldsStatQueryMap) && (queryParam in FieldsStatQueryMap[field.key])) {
                    medianQueries = FieldsStatQueryMap[field.key][queryParam]["MedianQuery"] || [];
                    columnQueries = FieldsStatQueryMap[field.key][queryParam]["ColumnQuery"] || [];
                    averageQueries = FieldsStatQueryMap[field.key][queryParam]["AverageQuery"] || [];
                    occurrenceQueries = FieldsStatQueryMap[field.key][queryParam]["OccurrenceQuery"] || [];
                    percentageChangeQueries = FieldsStatQueryMap[field.key][queryParam]["PercentageChangeQuery"] || [];
                }
                rfValue.push(medianQueries);
                rfValue.push(columnQueries);
                rfValue.push(averageQueries);
                rfValue.push(occurrenceQueries);
                rfValue.push(percentageChangeQueries);
            }
            requestFields[queryParam] = rfValue;
        }

    }

    buildWhereFilter(requestFields: BarmouryObject, joinTables: BarmouryObject) {
        const filter: BarmouryObject = {};
        let virginQuery = true;
        for (const [matchingFieldName, values] of Object.entries(requestFields)) {
            const columnName = values[0];
            const requestParamFilter: RequestParamFilterAttrs = values[2];

            if (virginQuery) filter.where = {};
            const relationQuery = this.getRelationQueryPart(columnName, false,
                matchingFieldName, requestParamFilter.operator!, values[3]);
            filter.where[columnName] = FieldUtil.mergeObjects(false, filter.where[columnName], relationQuery);
            virginQuery = false;
        }
        return filter;
    }

    getRelationQueryPart(columnName: string,
        isEntityField: boolean,
        matchingFieldName: string,
        operator: RequestParamFilterOperator,
        value: any[]): any {
        const matchingFieldNameParts = matchingFieldName.split(".");
        const objectField =
            (matchingFieldNameParts.length > 1 ? matchingFieldNameParts[1] : matchingFieldNameParts[0]);
        if (operator == RequestParamFilter.Operator.EQ) {
            return { [Op.eq]: value[0] };
        } else if (operator == RequestParamFilter.Operator.GT) {
            return { [Op.gt]: value[0] };
        } else if (operator == RequestParamFilter.Operator.LT) {
            return { [Op.lt]: value[0] };
        } else if (operator == RequestParamFilter.Operator.NE) {
            return { [Op.ne]: value[0] };
        } else if (operator == RequestParamFilter.Operator.IN) {
            return { [Op.in]: value };
        } else if (operator == RequestParamFilter.Operator.GT_EQ) {
            return { [Op.gte]: value[0] };
        } else if (operator == RequestParamFilter.Operator.LT_EQ) {
            return { [Op.lte]: value[0] };
        } else if (operator == RequestParamFilter.Operator.LIKE
            || operator == RequestParamFilter.Operator.CONTAINS) {
            return { [Op.like]: `%${value[0]}%` };
        } else if (operator == RequestParamFilter.Operator.ILIKE) {
            return { [Op.iLike]: `%${value[0]}%` };
        } else if (operator == RequestParamFilter.Operator.NOT_LIKE
            || operator == RequestParamFilter.Operator.NOT_CONTAINS) {
            return { [Op.notLike]: `%${value[0]}%` };
        } else if (operator == RequestParamFilter.Operator.NOT_ILIKE) {
            return { [Op.notILike]: `%${value[0]}%` };
        } else if (operator == RequestParamFilter.Operator.ENDS_WITH) {
            return { [Op.endsWith]: value };
        } else if (operator == RequestParamFilter.Operator.STARTS_WITH) {
            return { [Op.startsWith]: value };
        } else if (operator == RequestParamFilter.Operator.NOT_IN) {
            return { [Op.notIn]: value };
        } else if (operator == RequestParamFilter.Operator.BETWEEN) {
            return { [Op.between]: value };
        } else if (operator == RequestParamFilter.Operator.NOT_BETWEEN) {
            return { [Op.between]: value };
        } else if (operator == RequestParamFilter.Operator.OBJECT_EQ) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":${value[0]}%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":${value[0]}}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_NE) {
            return {
                [Op.or]: {
                    [Op.notLike]: sequelize.literal(`'%"${objectField}":${value[0]}%'`),
                    [Op.notLike]: sequelize.literal(`'%"${objectField}":${value[0]}}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_STR_EQ) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":"${value[0]}"%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":"${value[0]}"}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_STR_NE) {
            return {
                [Op.or]: {
                    [Op.notLike]: sequelize.literal(`'%"${objectField}":"${value[0]}"%'`),
                    [Op.notLike]: sequelize.literal(`'%"${objectField}":"${value[0]}"}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_LIKE
            || operator == RequestParamFilter.Operator.OBJECT_CONTAINS) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":%${value[0]}%,%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":%${value[0]}%}'`),
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_NOT_LIKE
            || operator == RequestParamFilter.Operator.OBJECT_NOT_CONTAINS) {
            return {
                [Op.or]: {
                    [Op.notLike]: sequelize.literal(`'%"${objectField}":%${value[0]}%,%'`),
                    [Op.notLike]: sequelize.literal(`'%"${objectField}":%${value[0]}%})'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_ENDS_WITH) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":%${value[0]},%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":%${value[0]}}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_STARTS_WITH) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":${value[0]}%,%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":${value[0]}%}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_STR_ENDS_WITH) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":\"%${value[0]}",%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":\"%${value[0]}"}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.OBJECT_STR_STARTS_WITH) {
            return {
                [Op.or]: {
                    [Op.like]: sequelize.literal(`'%"${objectField}":"${value[0]}%",%'`),
                    [Op.like]: sequelize.literal(`'%"${objectField}":"${value[0]}%"}'`)
                }
            };
        } else if (operator == RequestParamFilter.Operator.ENTITY) {
            // TODO use sequelize relations
        }
        return {};
    }

    buildPageFilter(query: BarmouryObject) {
        let sorts = query.sort || [];
        const limit = query.size ? parseInt(query.size) : undefined;
        if (typeof sorts === "string") {
            sorts = [sorts];
        }
        const pageFilter = {
            limit,
            offset: ((query.page || 1) - 1) * (limit || 10),
            order: sorts.map((sort: string) => sort.split(","))
        };
        return pageFilter;
    }

    makeResultSpringy(result: BarmouryObject, filter: BarmouryObject) {
        const count = result["count"];
        const content = result["rows"];
        const sorted = filter.order && filter.order.length;
        const pageNumber = (filter.offset / (filter.limit || 10)) + 1;
        delete result["rows"];
        return {
            content,
            pageable: {
                sort: {
                    empty: !sorted,
                    sorted: !!sorted,
                    unsorted: !sorted
                },
                offset: filter.offset,
                pageNumber: pageNumber,
                pageSize: (filter.limit || 10),
                paged: !!filter.limit,
                unpaged: !filter.limit
            },
            last: filter.offset >= (count - filter.limit),
            totalPages: Math.ceil(count / filter.limit),
            totalElements: count,
            first: filter.offset == 0,
            size: (filter.limit || 10),
            number: pageNumber,
            sort: {
                empty: !sorted,
                sorted: !!sorted,
                unsorted: !sorted
            },
            numberOfElements: count,
            empty: count == 0
        };
    }

    async getResourceById<T>(clazz: (new (...args: any[]) => T), id: any, message: string): Promise<T> {
        const resource = await (clazz as any).findByPk(id);
        if (resource) return resource;
        throw new EntityNotFoundError(message);
    }

}
