
import { Validated } from "../../validation";
import { Model, Request } from "../model/Model";
import { ApiResponse } from "../model/ApiResponse";
import { RequestMethod } from "../enum/RequestMethod";
import { RequestMapping } from "../decorator/RequestMapping";
import { MySqlInterface, QueryArmoury } from "../../eloquent";
import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { AccessDeniedError, InvalidParameterError, RouteMethodNotSupportedError } from "../exception";

interface IQuerystring {
    username: string;
    password: string;
}

export class Controller<T1 extends Model<any, any>, T2 extends Request> {

    pageable: boolean = false;
    fastify?: FastifyInstance;
    fineName: string = "model";
    t1Constructor!: (new () => T1);
    storeAsynchronously: boolean = false;
    updateAsynchronously: boolean = false;
    deleteAsynchronously: boolean = false;

    readonly queryArmoury = new QueryArmoury(new MySqlInterface());
    static readonly NO_RESOURCE_FORMAT_STRING = "No ${name} found with the specified id ${id}";
    static readonly ACCESS_DENIED = "Access denied. You do not have the required role to access this endpoint";

    setup(t1Constructor: new () => T1, fastify: FastifyInstance) {
        this.fastify = fastify;
        this.t1Constructor = t1Constructor;
        this.fineName = this.t1Constructor.name;
    }

    async preResponse(entity: T1) { }
    async preResponses(entities: T1[]) {
        for (const entity of entities) this.preResponse(entity)
    }
    async resolveSubEntities(): Promise<boolean> { return true; }
    async skipRecursiveSubEntities(): Promise<boolean> { return true; }
    async preQuery(request: FastifyRequest, authentication: any): Promise<FastifyRequest> { return request; }
    async preCreate(request: FastifyRequest, authentication: any, entity: T1, entityRequest: T2) { }
    async postCreate(request: FastifyRequest, authentication: any, entity: T1) { }
    async preUpdate(request: FastifyRequest, authentication: any, entity: T1, entityRequest: T2) { }
    async postUpdate(request: FastifyRequest, authentication: any, prevEntity: T1, entity: T1) { }
    async preDelete(request: FastifyRequest, authentication: any, entity: T1, id: any) { }
    async postDelete(request: FastifyRequest, authentication: any, entity: T1) { }
    async onAsynchronousError(type: string, entity: any, error: any) {}

    async handleSqlInjectionQuery(request: FastifyRequest, authentication: any) {
        throw new AccessDeniedError("sql injection attack detected");
    }

    private async sanitizeAndGetRequestParameters(request: FastifyRequest, authentication: any) {
        if (QueryArmoury.BARMOURY_RAW_SQL_PARAMETER_KEY in (request.query as any)) {
            await this.handleSqlInjectionQuery(request, authentication);
        }
        return request;
    }

    async processResponse<T>(reply: FastifyReply, httpStatus: number, apiResponseOrData: T | ApiResponse<T>, message?: string): Promise<FastifyReply> {
        if (!message) {
            return (apiResponseOrData as ApiResponse<T>).r(reply, httpStatus);
        }
        return ApiResponse.build(httpStatus, apiResponseOrData, message).r(reply);
    }

    async getResourceById(id: any, authentication?: any): Promise<T1> {
        return this.queryArmoury.getResourceById(this.t1Constructor, id,
            Controller.NO_RESOURCE_FORMAT_STRING.replace("${name}", this.fineName).replace("${id}", id));
    }

    async postGetResourceById(request: FastifyRequest, authentication: any, entity: T1) { }

    async validateBeforeCommit(r: T1): Promise<string | null> {
        if (r === null) return "Invalid entity";
        return null;
    }

    async shouldNotHonourMethod(routeMethod: RouteMethod): Promise<boolean> {
        return routeMethod === null;
    }

    async getRouteMethodRoles(ignored: RouteMethod): Promise<string[]> {
        return [];
    }

    private async validateRouteAccess(request: FastifyRequest, routeMethod: RouteMethod, errMessage: string) {
        if (await this.shouldNotHonourMethod(routeMethod)) {
            throw new RouteMethodNotSupportedError(errMessage);
        }
        const roles = await this.getRouteMethodRoles(routeMethod);
        if (roles.length > 0 && !(request as any).authoritiesValues?.some((r: string) => roles.includes(r))) {
            throw new AccessDeniedError(Controller.ACCESS_DENIED);
        }
    }

    async injectUpdateFieldId(request: FastifyRequest, resourceRequest: T2): Promise<T2> {
        if (!(request.method == "POST" || request.method == "PUT" || request.method == "PATCH")) {
            return resourceRequest;
        }
        const id = (request.params as any).id;
        resourceRequest.___BARMOURY_UPDATE_ENTITY_ID___ = id;
        return resourceRequest;
    }

    async resolveRequestPayload(authentication: any, request: T2): Promise<T1> {
        return (new this.t1Constructor()).resolve(request, this.queryArmoury, authentication);
    }

    @RequestMapping({ value: "/stat", method: RequestMethod.GET })
    async stat(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.STAT, "The GET '**/stat' route is not supported for this resource");
        request = await this.preQuery(await this.sanitizeAndGetRequestParameters(request, (request as any).user), (request as any).user);
        return await this.processResponse(reply, 200, await this.queryArmoury.statWithQuery(request, this.t1Constructor),
            `${this.fineName} stat fetched successfully`);
    };

    @RequestMapping({ method: RequestMethod.GET })
    async index(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.INDEX, "The GET '**/' route is not supported for this resource");
        request = await this.preQuery(await this.sanitizeAndGetRequestParameters(request, (request as any).user), (request as any).user);
        const resources = await this.queryArmoury.pageQuery(request, this.t1Constructor, await this.resolveSubEntities(), this.pageable);
        await this.preResponses((resources as any).rows ?? (resources as any).content ?? resources);
        return await this.processResponse(reply, 200, resources, `${this.fineName} list fetched successfully`);
    };

    @Validated()
    @RequestMapping({ method: RequestMethod.POST })
    async store(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.STORE, "The POST '**/' route is not supported for this resource");
        const requestPayload: T2 = request.body as T2;
        const resource = await this.resolveRequestPayload((request as any).user, requestPayload);
        await this.preCreate(request, (request as any).user, resource, requestPayload);
        const msg = await this.validateBeforeCommit(resource);
        if (!!msg) throw new InvalidParameterError(msg);
        if (this.storeAsynchronously) {
            (this.t1Constructor as any).create(resource.dataValues).then((result: T1) => {
                this.postCreate(request, (request as any).user, result);
            }).catch((err: any) => this.onAsynchronousError("Store", resource, err));
            return await this.processResponse(reply, 202, null, `${this.fineName} is being created`);
        }
        const result = await (this.t1Constructor as any).create(resource.dataValues);
        await this.postCreate(request, (request as any).user, result);
        await this.preResponse(resource);
        return await this.processResponse(reply, 201, result, `${this.fineName} created successfully`);
    };

    @RequestMapping({ value: "/multiple", method: RequestMethod.POST })
    async storeMultiple(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.STORE_MULTIPLE, "The POST '**/multiple' route is not supported for this resource");
        const resources: T1[] = [];
        for (const requestPayload of (request.body as T2[])) {
            const resource = await this.resolveRequestPayload((request as any).user, requestPayload);
            await this.preCreate(request, (request as any).user, resource, requestPayload);
            const msg = await this.validateBeforeCommit(resource);
            if (!!msg) throw new InvalidParameterError(msg);
            if (this.storeAsynchronously) {
                (this.t1Constructor as any).create(resource.dataValues).then((result: T1) => {
                    this.postCreate(request, (request as any).user, result);
                }).catch((err: any) => this.onAsynchronousError("Store", resource, err));;
                continue;
            }
            const result = await (this.t1Constructor as any).create(resource.dataValues);
            await this.postCreate(request, (request as any).user, result);
            await this.preResponse(resource);
            resources.push(resource);
        }
        if (this.storeAsynchronously) {
            return await this.processResponse(reply, 202, null, `${this.fineName}s are being created`);
        }
        return await this.processResponse(reply, 201, resources, `${this.fineName}s created successfully`);
    };

    @RequestMapping({ value: "/:id", method: RequestMethod.GET })
    async show(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.SHOW, "The GET '**/:id' route is not supported for this resource");
        const id = (request.params as any).id;
        const resource: T1 = await this.getResourceById(id, (request as any).user);
        await this.postGetResourceById(request, (request as any).user, resource);
        await this.preResponse(resource);
        return await this.processResponse(reply, 200, resource, `${this.fineName} fetch successfully`);
    };

    @Validated({ groups: ["UPDATE"] })
    @RequestMapping({ value: "/:id", method: RequestMethod.PATCH })
    async update(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.UPDATE, "The PATCH '**/:id' route is not supported for this resource");
        const id = (request.params as any).id;
        const requestPayload: T2 = request.body as T2;
        let resource: T1 = (await this.getResourceById(id, (request as any).user));
        await this.postGetResourceById(request, (request as any).user, resource);
        resource = resource.resolve(requestPayload, this.queryArmoury, (request as any).user);
        await this.preUpdate(request, (request as any).user, resource, requestPayload);
        const msg = await this.validateBeforeCommit(resource);
        if (!!msg) throw new InvalidParameterError(msg);
        if (this.updateAsynchronously) {
            resource.update(resource.dataValues).then((result: T1) => {
                this.postUpdate(request, (request as any).user, resource, result);
            }).catch((err: any) => this.onAsynchronousError("Update", resource, err));;
            return await this.processResponse(reply, 202, null, `${this.fineName} is being updated`);
        }
        const result = await resource.update(resource.dataValues);
        await this.postUpdate(request, (request as any).user, resource, result);
        await this.preResponse(resource);
        return await this.processResponse(reply, 200, result, `${this.fineName} updated successfully`);
    };

    @RequestMapping({ value: "/:id", method: RequestMethod.DELETE })
    async destroy(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.DESTROY, "The DELETE '**/:id' route is not supported for this resource");
        const id = (request.params as any).id;
        const resource: T1 = await this.getResourceById(id);
        await this.postGetResourceById(request, (request as any).user, resource);
        await this.preDelete(request, (request as any).user, resource, id);
        if (this.deleteAsynchronously) {
            resource.destroy().then((_: any) => {
                this.postDelete(request, (request as any).user, resource);
            }).catch((err: any) => this.onAsynchronousError("Delete", resource, err));;
            return await this.processResponse(reply, 202, null, `${this.fineName} is being deleted`);
        }
        await resource.destroy();
        await this.postDelete(request, (request as any).user, resource);
        await this.preResponse(resource);
        return ApiResponse.noContent(reply);
    };

    @RequestMapping({ value: "/multiple", method: RequestMethod.DELETE })
    async destroyMultiple(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        await this.validateRouteAccess(request, RouteMethod.DESTROY_MULTIPLE, "The DELETE '**/multiple' route is not supported for this resource");
        const resources: T1[] = await Promise.all((request.body as any[]).map(async (id) => await this.getResourceById(id, (request as any).user)) as Promise<T1>[]);
        for (const resource of resources) {
            await this.postGetResourceById(request, (request as any).user, resource);
            await this.preDelete(request, (request as any).user, resource, resource.id!);
            if (this.deleteAsynchronously) {
                resource.destroy().then((_: any) => {
                    this.postDelete(request, (request as any).user, resource);
                }).catch((err: any) => this.onAsynchronousError("Delete", resource, err));;
                continue
            }
            await resource.destroy();
            await this.postDelete(request, (request as any).user, resource);
            await this.preResponse(resource);
        }
        if (this.storeAsynchronously) {
            return await this.processResponse(reply, 202, null, `${this.fineName}s are being deleted`);
        }
        return ApiResponse.noContent(reply);

    }

}

export enum RouteMethod {

    STAT,
    SHOW,
    INDEX,
    STORE,
    UPDATE,
    DESTROY,
    STORE_MULTIPLE,
    DESTROY_MULTIPLE,

}
