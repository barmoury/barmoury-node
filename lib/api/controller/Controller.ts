
import { Validate } from "../../validation";
import { Model, Request } from "../model/Model";
import { ApiResponse } from "../model/ApiResponse";
import { RequestMethod } from "../enum/RequestMethod";
import { FastifyRequest, FastifyReply } from "fastify";
import { RequestMapping } from "../decorator/RequestMapping";
import { MySqlInterface, QueryArmoury } from "../../eloquent";
import { AccessDeniedError, InvalidParameterError, RouteMethodNotSupportedError } from "../exception";

interface IQuerystring {
    username: string;
    password: string;
}

interface Authentication {

}

export class Controller<T1 extends Model<any, any>, T2 extends Request> {

    fineName: string = "model";
    springLike: boolean = false;
    t1Constructor!: (new () => T1);

    readonly queryArmoury = new QueryArmoury(new MySqlInterface());
    static readonly NO_RESOURCE_FORMAT_STRING = "No ${name} found with the specified id";
    static readonly ACCESS_DENIED = "Access denied. You do not have the required role to access this endpoint";

    async preResponse(entity: T1) { }
    async preQuery(request: FastifyRequest) { }
    async preCreate(request: FastifyRequest, authentication: Authentication, entity: T1, entityRequest: T2) { }
    async postCreate(request: FastifyRequest, authentication: Authentication, entity: T1) { }
    async preUpdate(request: FastifyRequest, authentication: Authentication, entity: T1, entityRequest: T2) { }
    async postUpdate(request: FastifyRequest, authentication: Authentication, entity: T1) { }
    async preDelete(request: FastifyRequest, authentication: Authentication, entity: T1, id: Number) { }
    async postDelete(request: FastifyRequest, authentication: Authentication, entity: T1) { }

    async processResponse<T>(reply: FastifyReply, httpStatus: number, data: T, message: string): Promise<FastifyReply> {
        return ApiResponse.build(httpStatus, data, message).r(reply);
    }

    setup(t1Constructor: new () => T1) {
        this.t1Constructor = t1Constructor;
        this.fineName = this.t1Constructor.name;
    }

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

    async injectUpdateFieldId(request: FastifyRequest, resourceRequest: T2): Promise<T2> {
        // todo get method if not post, put or patch return resourceRequest
        // else get the id from path parameter and set in resource request
        resourceRequest.updateEntityId = parseInt("id");
        return resourceRequest;
    }

    async resolveRequestPayload(authentication: Authentication, request: T2): Promise<T1> {
        // get the user details, then set second
        return (new this.t1Constructor()).resolve(request, this.queryArmoury);
    }

    @RequestMapping({ value: "/stat", method: RequestMethod.GET })
    async stat(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.STAT)) {
            throw new RouteMethodNotSupportedError("The GET '**/stat' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.STAT);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        await this.preQuery(request);
        return await this.processResponse(reply, 200, this.queryArmoury.statWithQuery(request, this.t1Constructor),
            `${this.fineName} stat fetched successfully`);
    };

    @RequestMapping({ method: RequestMethod.GET })
    async index(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.INDEX)) {
            throw new RouteMethodNotSupportedError("The GET '**/' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.INDEX);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        await this.preQuery(request);
        const resources = await this.queryArmoury.pageQuery(request, this.t1Constructor, this.springLike);
        return await this.processResponse(reply, 200, resources, `${this.fineName} list fetched successfully`);
    };

    @Validate()
    @RequestMapping({ method: RequestMethod.POST })
    async store(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.STORE)) {
            throw new RouteMethodNotSupportedError("The POST '**/' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.STORE);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        const requestPayload: T2 = request.body as T2;
        const resource = await this.resolveRequestPayload({}, requestPayload);
        await this.preCreate(request, {}, resource, requestPayload);
        const msg = await this.validateBeforeCommit(resource);
        if (!!msg) throw new InvalidParameterError(msg);
        const result = await (this.t1Constructor as any).create(resource.dataValues);
        await this.postCreate(request, {}, result);
        await this.preResponse(resource);
        return await this.processResponse(reply, 201, result, `${this.fineName} created successfully`);
    };

    @RequestMapping({ value: "/multiple", method: RequestMethod.POST })
    async storeMultiple(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.STORE_MULTIPLE)) {
            throw new RouteMethodNotSupportedError("The POST '**/multiple' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.STORE_MULTIPLE);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        const resources: T1[] = [];
        for (const requestPayload of (request.body as T2[])) {
            const resource = await this.resolveRequestPayload({}, requestPayload);
            await this.preCreate(request, {}, resource, requestPayload);
            const msg = await this.validateBeforeCommit(resource);
            if (!!msg) throw new InvalidParameterError(msg);
            const result = await (this.t1Constructor as any).create(resource.dataValues);
            await this.postCreate(request, {}, result);
            await this.preResponse(resource);
            resources.push(resource);
        }
        return await this.processResponse(reply, 201, resources, `${this.fineName} created successfully`);
    };

    @RequestMapping({ value: "/:id", method: RequestMethod.GET })
    async show(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.SHOW)) {
            throw new RouteMethodNotSupportedError("The GET '**/{id}' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.SHOW);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        const id = (request.params as any).id;
        const resource: T1 = await this.queryArmoury.getResourceById(this.t1Constructor, id,
            Controller.NO_RESOURCE_FORMAT_STRING.replace("${name}", this.fineName));
        await this.preResponse(resource);
        return await this.processResponse(reply, 200, resource, `${this.fineName} fetch successfully`);
    };

    @Validate({ groups: ["UPDATE"] })
    @RequestMapping({ value: "/:id", method: RequestMethod.PATCH })
    async update(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.UPDATE)) {
            throw new RouteMethodNotSupportedError("The PATCH '**/{id}' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.UPDATE);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        const id = (request.params as any).id;
        const requestPayload: T2 = request.body as T2;
        const resource: T1 = (await this.queryArmoury.getResourceById(this.t1Constructor, id,
            Controller.NO_RESOURCE_FORMAT_STRING.replace("${name}", this.fineName)))
            .resolve(requestPayload, this.queryArmoury, {});
        await this.preUpdate(request, {}, resource, requestPayload);
        const msg = await this.validateBeforeCommit(resource);
        if (!!msg) throw new InvalidParameterError(msg);
        const result = await resource.update(resource.dataValues);
        await this.postUpdate(request, {}, result);
        await this.preResponse(resource);
        return await this.processResponse(reply, 200, result, `${this.fineName} updated successfully`);
    };

    @RequestMapping({ value: "/:id", method: RequestMethod.DELETE })
    async destroy(request: FastifyRequest, reply: FastifyReply) {
        if (await this.shouldNotHonourMethod(RouteMethod.DESTROY)) {
            throw new RouteMethodNotSupportedError("The DELETE '**/{id}' route is not supported for this resource");
        }
        const roles = await this.getRouteMethodRoles(RouteMethod.DESTROY);
        if (roles.length > 0 /*&& nonmatch on in auth roles*/) throw new AccessDeniedError(Controller.ACCESS_DENIED);
        const id = (request.params as any).id;
        const resource: T1 = await this.queryArmoury.getResourceById(this.t1Constructor, id,
            Controller.NO_RESOURCE_FORMAT_STRING.replace("${name}", this.fineName));
        await this.preDelete(request, {}, resource, id);
        resource.destroy();
        await this.postDelete(request, {}, resource);
        await this.preResponse(resource);
        return ApiResponse.noContent(reply);
    };

}

export enum RouteMethod {

    STAT,
    SHOW,
    INDEX,
    STORE,
    UPDATE,
    DESTROY,
    STORE_MULTIPLE

}
