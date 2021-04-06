"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.debugGenerator = exports.timeoutExecute = exports.formatDuration = exports.formatDateTime = exports.getDomainFromURL = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFPN0IsU0FBUyxRQUFRLENBQUMsSUFBWSxFQUFFLElBQVk7SUFDeEMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRUQsTUFBTSxVQUFVLEdBQWU7SUFDM0IsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7SUFDakIsUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUM7SUFDekIsUUFBUSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUM7SUFDdkIsUUFBUSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUM7SUFDckIsUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUM7SUFDcEIsUUFBUSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUM7SUFDdEIsUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztDQUNoQyxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUM7QUFFakMsU0FBUyxPQUFPLENBQUMsS0FBb0IsRUFBRSxHQUFXO0lBQzlDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUM3QixJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxFQUFFO1FBQ25CLE9BQU8sR0FBRyxDQUFDO0tBQ2Q7SUFDRCxNQUFNLFdBQVcsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUNyQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxxQkFBcUI7QUFDckIsU0FBZ0IsZ0JBQWdCLENBQUMsR0FBUTtJQUNyQyxJQUFJO1FBQ0EsT0FBTyxHQUFHLENBQUMsU0FB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