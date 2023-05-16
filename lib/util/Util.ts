import { Timeo } from "../api";
import { Cache } from "../cache";


export const Util = {

    cacheWriteAlong<T>(bufferSize: number, dateLastFlushed: Date, cache: Cache<T>, entry: T): boolean {
        cache.cache(entry);
        const diff = Timeo.dateDiffInMinutes(dateLastFlushed, new Date());
        return bufferSize >= cache.maxBufferSize() || diff >= cache.intervalBeforeFlush();
    }

}