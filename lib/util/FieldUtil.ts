import { BarmouryObject } from "./Types";

export const FieldUtil = {

    mergeObjects(recurse: boolean, ...sources: any[]) {
        let result: any = {};
        if (!recurse) {
            for (const source of sources) {
                if (!source) continue;
                result = { ...result, ...source };
            }
            return result;
        }
        for (const source of sources) {
            if (!source) continue;
            Object.keys(source).forEach(key => {
                if (!result[key]) {
                    result[key] = source[key];
                } else if (result[key] instanceof Array && typeof result[key] == typeof source[key]) {
                    result[key] = result[key].concat(source[key]);
                } else if (typeof result[key] == "object" && typeof result[key] == typeof source[key]) {
                    result[key] = FieldUtil.mergeObjects(true, result[key], source[key]);
                }
            });
        }
        return result;
    },

    mergeArrays(...sources: any[]) {
        return sources.reduce((acc, source) => {
            if (source) return acc.concat(source);
            return acc;
        }, []);
    },

    unique(arr: any[]) {
        const a = arr.concat();
        for (var i = 0; i < a.length; ++i) {
            for (var j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j])
                    a.splice(j--, 1);
            }
        }
        return a;
    },

    transformKeys(obj: BarmouryObject | any[], transformer: (key: string) => string, excludes: string[] = []) {
        return obj instanceof Array
            ? obj.map((entry): any => entry && typeof entry == "object" ? FieldUtil.transformKeys(entry, transformer, excludes) : entry)
            : Object.entries(obj).reduce((acc: BarmouryObject, entry: any) => {
                const [key, value] = entry;
                acc[transformer(key)] = excludes.includes(key) || value == null || value == undefined || typeof value != "object"
                    ? value
                    : FieldUtil.transformKeys(value, transformer, excludes);
                return acc;
            }, {});
    },

    keysToSnakeCase(obj: BarmouryObject | any[], excludes: string[] = []) {
        return FieldUtil.transformKeys(obj, (key) => FieldUtil.toSnakeCase(key), excludes);
    },

    keysToCamelCase(obj: BarmouryObject | any[], excludes: string[] = []) {
        return FieldUtil.transformKeys(obj, (key) => FieldUtil.toCamelCase(key), excludes);
    },

    toCamelCase(str: string): string {
        return (str && str.replace(/[^a-zA-Z0-9]+(.)/g, function (word, index) {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '').replace(/\_/g, '')) || str;
    },

    toSnakeCase(str: string): string {
        return (str && str.match(
            /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
            ?.map(s => s.toLowerCase())
            ?.join('_')) || str;
    },

}

