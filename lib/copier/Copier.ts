
import { FieldUtil } from "../util";
import { BarmouryObject } from "../util/Types";

export class Copier {
    
    // TODO revisit to honor annotations, and not just copy blindly
    static copy<T>(target: T, ...sources: BarmouryObject[]) {
        //console.log("TARGETTT ", target);
        for (const source of sources) {
            Object.keys(source).forEach(key => {
                (target as any)[key] = source[key];
            });
        }
    }

}
