
export class EntityNotFoundError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, EntityNotFoundError.prototype);
    }
    
}
