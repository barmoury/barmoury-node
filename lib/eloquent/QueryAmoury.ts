
import { SqlInterface } from ".";
import { FastifyRequest } from "fastify";
import { EntityNotFoundError } from "../api";
import { BarmouryObject, FieldUtil } from "../util";

export class QueryArmoury {

    constructor(sqlInterface: SqlInterface) {

    }

    statWithQuery<T>(request: FastifyRequest, clazz: (new () => T)) {
        return {};
    }

    async pageQuery<T>(request: FastifyRequest, clazz: (new () => T), springLike: boolean = false) {
        const query = (request.query as any);
        const pageFilter = this.buildPageFilter(query);
        const filter = FieldUtil.mergeObjects(true, pageFilter);
        const result = await (clazz as any).findAndCountAll(filter);
        return (springLike ? this.makeResultSpringy(result, filter) : result);
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
            last: filter.offset >= (count-filter.limit),
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

    async getResourceById<T>(clazz: (new () => T), id: any, message: string): Promise<T> {
        const resource = await (clazz as any).findByPk(id);
        if (resource) return resource;
        throw new EntityNotFoundError(message);
    }

}
