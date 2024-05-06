
export abstract class Cache<T> {

    abstract getCached(): any;
    abstract cache(data: T): void;

    maxBufferSize(): number {
        return 150;
    }

    intervalBeforeFlush(): number {
        return 20;
    }

}
