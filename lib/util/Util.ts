import { Timeo } from "../api";
import { Cache } from "../cache";


export const Util = {

    cacheWriteAlong<T>(bufferSize: number, dateLastFlushed: Date, cache: Cache<T>, entry: T): boolean {
        cache.cache(entry);
        const diff = Timeo.dateDiffInMinutes(dateLastFlushed, new Date());
        return bufferSize >= cache.maxBufferSize() || diff >= cache.intervalBeforeFlush();
    },

    isFunction(variable: any) {
        return variable && {}.toString.call(variable) === '[object Function]';
    },

    isClass(variable: any) {
        return typeof variable === 'function' && /^\s*class\s+/.test(variable.toString());
    }

}