"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const TLD = require("tldjs");
function timeUnit(step, name) {
    return { step, name };
}
const TIME_UNITS = [
    timeUnit(1, 'ms'),
    timeUnit(1000, 'seconds'),
    timeUnit(60, 'minutes'),
    timeUnit(60, 'hours'),
    timeUnit(24, 'days'),
    timeUnit(31, 'months'),
    timeUnit((365 / 31), 'years'),
];
const TIME_UNIT_THRESHOLD = 0.95;
function padDate(value, num) {
    const str = value.toString();
    if (str.length >= num) {
        return str;
    }
    const zeroesToAdd = num - str.length;
    return '0'.repeat(zeroesToAdd) + str;
}
//TODO add type check
function getDomainFromURL(url) {
    try {
        return TLD.getDomain(url);
    }
    catch (e) {
    }
    return undefined;
}
exports.getDomainFromURL = getDomainFromURL;
function formatDateTime(datetime) {
    const date = (typeof datetime === 'number') ? new Date(datetime) : datetime;
    const dateStr = `${date.getFullYear()}`
        + `-${padDate(date.getMonth() + 1, 2)}`
        + `-${padDate(date.getDate(), 2)}`;
    const timeStr = `${padDate(date.getHours(), 2)}`
        + `:${padDate(date.getMinutes(), 2)}`
        + `:${padDate(date.getSeconds(), 2)}`
        + `.${padDate(date.getMilliseconds(), 3)}`;
    return `${dateStr} ${timeStr}`;
}
exports.formatDateTime = formatDateTime;
function formatDuration(millis) {
    if (millis < 0) {
        return 'unknown';
    }
    let remaining = millis;
    let nextUnitIndex = 1;
    while (nextUnitIndex < TIME_UNITS.length &&
        remaining / TIME_UNITS[nextUnitIndex].step >= TIME_UNIT_THRESHOLD) {
        remaining = remaining / TIME_UNITS[nextUnitIndex].step;
        nextUnitIndex += 1;
    }
    return `${remaining.toFixed(1)} ${TIME_UNITS[nextUnitIndex - 1].name}`;
}
exports.formatDuration = formatDuration;
function timeoutExecute(millis, promise) {
    return __awaiter(this, void 0, void 0, function* () {
        let timeout = null;
        const result = yield Promise.race([
            (() => __awaiter(this, void 0, void 0, function* () {
                yield new Promise((resolve) => {
                    timeout = setTimeout(resolve, millis);
                });
                throw new Error(`Timeout hit: ${millis}`);
            }))(),
            (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield promise;
                }
                catch (error) {
                    // Cancel timeout in error case
                    clearTimeout(timeout);
                    throw error;
                }
            }))(),
        ]);
        clearTimeout(timeout); // is there a better way?
        return result;
    });
}
exports.timeoutExecute = timeoutExecute;
function debugGenerator(namespace) {
    const debug = Debug(`puppeteer-cluster: ${namespace}`);
    return debug;
}
exports.debugGenerator = debugGenerator;
const logToConsole = Debug('puppeteer-cluster:log');
logToConsole.log = console.error.bind(console);
function log(msg) {
    logToConsole(msg);
}
exports.log = log;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFDQSwrQkFBK0I7QUFDL0IsNkJBQTZCO0FBTzdCLFNBQVMsUUFBUSxDQUFDLElBQVksRUFBRSxJQUFZO0lBQ3hDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELE1BQU0sVUFBVSxHQUFlO0lBQzNCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQ2pCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDO0lBQ3pCLFFBQVEsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDO0lBQ3ZCLFFBQVEsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDO0lBQ3JCLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDO0lBQ3RCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUM7Q0FDaEMsQ0FBQztBQUVGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0FBRWpDLFNBQVMsT0FBTyxDQUFDLEtBQW9CLEVBQUUsR0FBVztJQUM5QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDN0IsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsRUFBRTtRQUNuQixPQUFPLEdBQUcsQ0FBQztLQUNkO0lBQ0QsTUFBTSxXQUFXLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDckMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUN6QyxDQUFDO0FBRUQscUJBQXFCO0FBQ3JCLFNBQWdCLGdCQUFnQixDQUFDLEdBQVE7SUFDckMsSUFBSTtRQUNBLE9BQU8sR0FBRyxDQUFDLFNBQVMs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