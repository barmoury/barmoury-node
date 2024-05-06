
export class ConstraintValidationError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, ConstraintValidationError.prototype);
    }
    
}
