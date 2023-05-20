
import { Model } from "./model/Model";

export const Timeo = {

    resolve(model: Model<any, any>) {
        if (!model.id) { Timeo.resolveCreated(model); }
        else { Timeo.resolveUpdated(model); }
    },

    resolveCreated(model: Model<any, any>) {
        model.createdAt = (new Date());
        Timeo.resolveUpdated(model);
    },

    resolveUpdated(model: Model<any, any>) {
        model.updatedAt = new Date();
    },

    toSimpleSqlDate(d: Date): string {
        return (d.getFullYear()
            + "-" + ("0" + (d.getMonth() + 1)).slice(-2)
            + "-" + ("0" + d.getDate()).slice(-2))
            + " " + ("0" + d.getHours()).slice(-2)
            + ":" + ("0" + d.getMinutes()).slice(-2)
            + ":" + ("0" + d.getSeconds()).slice(-2);
    },

    fromSimpleSqlDate(d: string): Date {
        return new Date(d);
    },

    dateToUTC(d: Date) {
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()/*, d.getHours(), d.getMinutes(), d.getSeconds()*/);
    },

    dateDiff(a: Date, b: Date, divider: number): number {
        let diff = b.getTime() - a.getTime();
        let neg = diff < 0; if (neg) diff = Math.abs(diff);
        return (neg ? -Math.floor(diff / divider) : Math.floor(diff / divider));
    },

    dateDiffInDays(a: Date, b: Date): number {
        return Timeo.dateDiff(a, b, (1000 * 60 * 60 * 24));
    },

    dateDiffInHours(a: Date, b: Date): number {
        return Timeo.dateDiff(a, b, (1000 * 60 * 60));
    },

    dateDiffInMinutes(a: Date, b: Date): number {
        return Timeo.dateDiff(a, b, (1000 * 60));
    },

    dateDiffInYears(a: Date, b: Date): number {
        const ageDifMs = (a as any) - (b as any);
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    },

    addDays(a: Date, value: number): Date {
        return new Date(a.getTime() + (value * (1000 * 60 * 60 * 24)));
    },

    addHours(a: Date, value: number): Date {
        return new Date(a.getTime() + (value * (1000 * 60 * 60)));
    },

    addMinutes(a: Date, value: number): Date {
        return new Date(a.getTime() + (value * (1000 * 60)));
    },

    addYears(a: Date, value: number): Date {
        return new Date(a.getTime() + (value * (1000 * 60 * 60 * 24 * 365)));
    },

    isPast(date: Date, now: Date = new Date()): boolean {
        return date.getTime() < now.getTime();
    },

    isFuture(date: Date, now: Date = new Date()): boolean {
        return date.getTime() > now.getTime();
    }

}
