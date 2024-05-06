
export class MissingTokenError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, MissingTokenError.prototype);
    }
    
}
