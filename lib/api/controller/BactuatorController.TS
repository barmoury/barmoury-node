
import { BarmouryObject, FieldUtil } from "../../util";
import { FastifyReply, FastifyRequest } from "fastify";
import {
    RequestMapping, RequestMethod, ApiResponse, InvalidBactuatorQueryException,
    AccessDeniedError, Model, Controller, Request, ControllersRequestMap
} from "../index";
import { FieldsRequestParamFilterMap, FieldsStatQueryMap, RequestParamFilter, RequestParamFilterAttrs, barmouryObjectInternalSetStatQueryAttrDefaults } from "../../eloquent";

export default abstract class BactuatorController {

    static SQL_QUERY_SUCCESSFUL = "Query successfully";
    static SQL_QUERY_ERROR_MESSAGE = "You do not have the '%s' permission to perform this operation";

    sequelize?: any;
    springLike = false;
    resourcesMap!: BarmouryObject;
    introspectMap!: BarmouryObject;
    controllersMap!: BarmouryObject;

    abstract resources(): any[];
    abstract serviceName(): string;
    abstract isServiceOk(): boolean;
    abstract iconLocation(): string;
    abstract serviceApiName(): string;
    abstract downloadsCount(): number;
    abstract serviceDescription(): string;
    abstract databaseQueryRoute(): string;
    abstract databaseMultipleQueryRoute(): string;
    abstract logUrls(): { [index: string]: string; }[];
    abstract userStatistics(): { [index: string]: number; };
    abstract earningStatistics(): { [index: string]: number; };
    abstract controllers(): Controller<Model<any, any>, Request>[];
    abstract principalCan(request: FastifyRequest, dbMethod: string): boolean;

    isSnakeCase() {
        return false;
    }

    async processResponse<T>(reply: FastifyReply, httpStatus: number, data: T, message: string): Promise<FastifyReply> {
        return ApiResponse.build(httpStatus, data, message).r(reply);
    }

    async executeQueryForResult(request: FastifyRequest, queryString: string, includeColumnNames: boolean) {
        try {
            if (queryString.toUpperCase().includes("SELECT") && !this.principalCan(request, "SELECT")) {
                throw new AccessDeniedError(FieldUtil.strFormat(BactuatorController.SQL_QUERY_ERROR_MESSAGE, "SELECT"));
            } else if (queryString.toUpperCase().includes("UPDATE") && !this.principalCan(request, "UPDATE")) {
                throw new AccessDeniedError(FieldUtil.strFormat(BactuatorController.SQL_QUERY_ERROR_MESSAGE, "UPDATE"));
            } else if (queryString.toUpperCase().includes("DELETE") && !this.principalCan(request, "DELETE")) {
                throw new AccessDeniedError(FieldUtil.strFormat(BactuatorController.SQL_QUERY_ERROR_MESSAGE, "DELETE"));
            } else if (queryString.toUpperCase().includes("INSERT") && !this.principalCan(request, "UPDATE")) {
                throw new AccessDeniedError(FieldUtil.strFormat(BactuatorController.SQL_QUERY_ERROR_MESSAGE, "INSERT"));
            } else if (queryString.toUpperCase().includes("TRUNCATE") && !this.principalCan(request, "TRUNCATE")) {
                throw new AccessDeniedError(FieldUtil.strFormat(BactuatorController.SQL_QUERY_ERROR_MESSAGE, "TRUNCATE"));
            }
            const [results, _] = await this.sequelize.query(queryString);
            if (!this.springLike) return results;
            let res;
            if (queryString.toUpperCase().includes("SELECT")) {
                res = [];
                if (includeColumnNames) res.push(Object.keys(results[0]));
                for (const result of results) {
                    res.push(Object.values(result));
                }
            } else {
                res = results;
            }
            return res;
        } catch (err: any) {
            throw new InvalidBactuatorQueryException(err.message);
        }
    }

    resolveIntrospect() {
        this.introspectMap = {};
        this.introspectMap["name"] = this.serviceName();
        this.introspectMap["resources"] = this.resourcesMap;
        this.introspectMap["controllers"] = this.controllersMap;
        this.introspectMap["description"] = this.serviceDescription();
        this.introspectMap[this.resolveCasing("logUrls")] = this.logUrls();
        this.introspectMap[this.resolveCasing("iconLocation")] = this.iconLocation();
        this.introspectMap[this.resolveCasing("serviceApiName")] = this.serviceApiName();
        this.introspectMap[this.resolveCasing("databaseQueryRoute")] = this.databaseQueryRoute();
        this.introspectMap[this.resolveCasing("databaseMultipleQueryRoute")] = this.databaseMultipleQueryRoute();
    }

    resolveControllers(baseUrl: string) {
        this.controllersMap = {};
        const controllers = this.controllers();
        if (controllers == null) return;
        for (const controller of controllers) {
            const methodsMap: any = {};
            const methods = FieldUtil.getAllMethods(controller as any);
            const requestMapping = ControllersRequestMap[controller.constructor.name];
            for (const method of methods) {
                const requestMap: any = this.methodRequestMap(baseUrl,
                    (requestMapping != null && requestMapping.value.length > 0
                        ? requestMapping.value : ""),
                    method);
                if (!Object.keys(requestMap).length) continue;
                requestMap["parameters"] = ["FastifyRequest", "FastifyReply"];
                methodsMap[method.name] = requestMap;
            }
            this.controllersMap[controller.constructor.name] = methodsMap;
        }
    }

    methodRequestMap(baseUrl: string, controllerRoute: string, method: any) {
        const requestMap: any = {};
        const requestMapping = method.__barmoury_requestMapping;
        if (requestMapping != null) {
            const method = ((typeof requestMapping === "string") ? "GET" : requestMapping.method || "GET");
            const firstRoute = controllerRoute + ((typeof requestMapping === "string")
                ? requestMapping : requestMapping.value || "");
            requestMap["method"] = [method];
            requestMap["methods"] = [method];
            requestMap["consumes"] = ["any"];
            requestMap["produces"] = ["any"];
            requestMap["routes"] = [firstRoute];
            requestMap[this.resolveCasing("absoluteRoute")] = FieldUtil.strFormat("%s%s", baseUrl,
                firstRoute.length > 0 ? "/" + firstRoute : "");
        }
        return requestMap;
    }

    resolveResources() {
        this.resourcesMap = {};
        const models = this.resources();
        if (!models) return;
        for (const model of models) {
            const modelMap: any = {};
            const fieldsAttrs: any = {};
            const fields = FieldUtil.getAllFields(FieldsRequestParamFilterMap, model as any);
            for (let [mainFieldName, value, key] of fields) {
                const fieldAttrs: any = {};

                const statProps: any = {};
                const queryProps: any[] = [];
                const requestParamFilters = value as RequestParamFilterAttrs[];
                for (const requestParamFilter of requestParamFilters) {
                    // stat
                    const queryParam = mainFieldName;
                    if ((key in FieldsStatQueryMap) && (queryParam in FieldsStatQueryMap[key])) {
                        statProps[this.resolveCasing("medianQuery")] =
                            !!FieldsStatQueryMap[key][queryParam]["MedianQuery"]?.length;
                        statProps[this.resolveCasing("columnQuery")] =
                            !!FieldsStatQueryMap[key][queryParam]["ColumnQuery"]?.length;
                        statProps[this.resolveCasing("averageQuery")] =
                            !!FieldsStatQueryMap[key][queryParam]["AverageQuery"]?.length;
                        statProps[this.resolveCasing("occurrenceQuery")] =
                            !!FieldsStatQueryMap[key][queryParam]["OccurrenceQuery"]?.length;
                        statProps[this.resolveCasing("percentageChangeQuery")] =
                            !!FieldsStatQueryMap[key][queryParam]["PercentageChangeQuery"]?.length;
                    } else {
                        statProps[this.resolveCasing("medianQuery")] = false;
                        statProps[this.resolveCasing("columnQuery")] = false;
                        statProps[this.resolveCasing("averageQuery")] = false;
                        statProps[this.resolveCasing("occurrenceQuery")] = false;
                        statProps[this.resolveCasing("percentageChangeQuery")] = false;
                    }

                    // query params
                    if (requestParamFilter.operator == RequestParamFilter.Operator.RANGE) {
                        queryProps.push(this.getOperatorQueryObj(requestParamFilters.length, mainFieldName,
                            requestParamFilter.operator + "_FROM", requestParamFilter));
                        queryProps.push(this.getOperatorQueryObj(requestParamFilters.length, mainFieldName,
                            requestParamFilter.operator + "_TO", requestParamFilter));
                        continue;
                    }
                    queryProps.push(this.getOperatorQueryObj(requestParamFilters.length, mainFieldName,
                        requestParamFilter.operator!, requestParamFilter));
                }
                fieldAttrs["stat"] = statProps;
                fieldAttrs["query"] = queryProps;
                fieldsAttrs[mainFieldName] = fieldAttrs;
            }

            const statAttrs: any = {};
            const statQuery = (`${model}` in FieldsStatQueryMap && "StatQuery" in FieldsStatQueryMap[`${model}`])
                ? FieldsStatQueryMap[`${model}`]["StatQuery"] : barmouryObjectInternalSetStatQueryAttrDefaults({});
            if (!!statQuery) {
                statAttrs[this.resolveCasing("fetchHourly")] = statQuery.fetchHourly;
                statAttrs[this.resolveCasing("fetchYearly")] = statQuery.fetchYearly;
                statAttrs[this.resolveCasing("fetchMonthly")] = statQuery.fetchMonthly;
                statAttrs[this.resolveCasing("fetchPrevious")] = statQuery.fetchPrevious;
                statAttrs[this.resolveCasing("fetchWeekDays")] = statQuery.fetchWeekDays;
                statAttrs[this.resolveCasing("fetchMonthDays")] = statQuery.fetchMonthDays;
                statAttrs[this.resolveCasing("intervalColumn")] = statQuery.intervalColumn;
                statAttrs[this.resolveCasing("enableClientQuery")] = statQuery.enableClientQuery;
                statAttrs[this.resolveCasing("columnsAreSnakeCase")] = statQuery.columnsAreSnakeCase;
            }
            modelMap["stat"] = statAttrs;
            modelMap["fields"] = fieldsAttrs;
            this.resourcesMap[(model as any).name] = modelMap;
        }
    }

    resolveCasing(value: string) {
        return (this.isSnakeCase() ? FieldUtil.toSnakeCase(value) : value);
    }

    getOperatorQueryObj(length: number, name: string, operator: string,
        requestParamFilter: RequestParamFilterAttrs) {
        const fieldName = length > 1
            ? FieldUtil.strFormat("%s%s%c%s", name,
                requestParamFilter.multiFilterSeparator == "__" && this.isSnakeCase()
                    ? "_" : requestParamFilter.multiFilterSeparator,
                operator.charAt(0),
                operator.substring(1).toLowerCase())
            : name;
        const requestParamFilterProps: any = {};
        requestParamFilterProps[operator] = this.resolveCasing(fieldName);
        return requestParamFilterProps;
    }

    @RequestMapping({ value: "/health", method: RequestMethod.GET })
    async healthCheck(request: FastifyRequest, reply: FastifyReply) {
        const response: BarmouryObject = {};
        const serviceIsOk = this.isServiceOk();
        response["status"] = (serviceIsOk ? "ok" : "not ok");
        return await this.processResponse(reply, (serviceIsOk ? 200 : 500), response,
            `health check successful`);
    }

    @RequestMapping({ value: "/introspect", method: RequestMethod.GET })
    async introspect(request: FastifyRequest, reply: FastifyReply) {
        if (this.introspectMap == null) {
            await this.resolveControllers(process.env.SERVICE_BASE_URL || "");
            await this.resolveResources();
            await this.resolveIntrospect();
        }
        this.introspectMap["users"] = await this.userStatistics();
        this.introspectMap["earnings"] = await this.earningStatistics();
        this.introspectMap[this.resolveCasing("downloadCounts")] = await this.downloadsCount();
        return await this.processResponse(reply, 200, this.introspectMap, "introspect data fetched successfully");
    }

    @RequestMapping({ value: "/database/query/single", method: RequestMethod.POST })
    async executeSingleQueries(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;
        let includeColumnNames = body["includeColumnNames"];
        if (!includeColumnNames) includeColumnNames = body[this.resolveCasing("includeColumnNames")];
        const result = await this.executeQueryForResult(request, body.query, (includeColumnNames ?? false));
        return await this.processResponse(reply, 200, result, BactuatorController.SQL_QUERY_SUCCESSFUL);
    }

    @RequestMapping({ value: "/database/query/multiple", method: RequestMethod.POST })
    async executeMultipleQueries(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;
        const response: BarmouryObject = {};
        let includeColumnNames = body["includeColumnNames"];
        if (!includeColumnNames) includeColumnNames = body[this.resolveCasing("includeColumnNames")];
        for (const queryString of (body.queries ?? [])) {
            try {
                const result = await this.executeQueryForResult(request, queryString, includeColumnNames ?? false);
                response[queryString] = result;
            } catch (err: any) {
                response[queryString] = err.message;
            }
        }
        return await this.processResponse(reply, 200, response, BactuatorController.SQL_QUERY_SUCCESSFUL);
    }

}
