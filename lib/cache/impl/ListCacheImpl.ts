import { Cache } from "..";

export class ListCacheImpl<T> extends Cache<T> {

    cached: T[] = [];

    cache(data: T) {
        this.cached.push(data);
    }

    getCached(): any {
        const resultCached = this.cached;
        this.cached = [];
        return resultCached;
    }

}