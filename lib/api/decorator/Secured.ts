
export function Secured(opts: string[]) {
    return function (_: any, __: string, descriptor: PropertyDescriptor) {
        descriptor.value.__barmoury_secured = opts;
    };
}

