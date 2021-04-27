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
exports.domainDelayMap = exports.constants = void 0;
const Job_1 = require("./Job");
const Display_1 = require("./Display");
const util = require("./util");
const Worker_1 = require("./Worker");
const builtInConcurrency = require("./concurrency/builtInConcurrency");
const Queue_1 = require("./Queue");
const SetTTL_1 = require("./SetTTL");
const SystemMonitor_1 = require("./SystemMonitor");
const events_1 = require("events");
const async_mutex_1 = require("async-mutex");
const debug = util.debugGenerator('Cluster');
const workerStartingMutex = new async_mutex_1.Mutex();
const workerIdMutex = new async_mutex_1.Mutex();
exports.constants = {
    addingDelayedItemEvent: 'Adding Delayed Item',
    removingDelayedItemEvent: 'Removing Delayed Item',
};
const DEFAULT_OPTIONS = {
    concurrency: 2,
    maxConcurrency: 1,
    workerCreationDelay: 0,
    puppeteerOptions: {
    // headless: false, // just for testing...
    },
    perBrowserOptions: [],
    monitor: false,
    timeout: 30 * 1000,
    retryLimit: 0,
    retryDelay: 0,
    skipDuplicateUrls: false,
    sameDomainDelay: 0,
    puppeteer: undefined,
    urlsPerBrowser: 10000,
};
const MONITORING_DISPLAY_INTERVAL = 5000;
const CHECK_FOR_WORK_INTERVAL = 100;
const WORK_CALL_INTERVAL_LIMIT = 10;
exports.domainDelayMap = new Map();
class Cluster extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.workers = [];
        this.workersAvail = [];
        this.workersBusy = [];
        this.workersStarting = 0;
        this.usePerBrowserOptions = false;
        this.urlsPerBrowser = 10000;
        this.allTargetCount = 0;
        this.jobQueue = new Queue_1.default();
        this.duplicateUrlsSetTTL = new SetTTL_1.default();
        this.errorCount = 0;
        this.taskFunction = null;
        this.idleResolvers = [];
        this.waitForOneResolvers = [];
        this.browser = null;
        this.isClosed = false;
        this.startTime = Date.now();
        this.nextWorkerId = -1;
        this.monitoringInterval = null;
        this.display = null;
        this.duplicateCheckUrls = new Set();
        this.lastDomainAccesses = new Map();
        this.systemMonitor = new SystemMonitor_1.default();
        this.checkForWorkInterval = null;
        this.nextWorkCall = 0;
        this.workCallTimeout = null;
        this.lastLaunchedWorkerTime = 0;
        // this.domainDelayMapInit();
        this.options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        if (this.options.monitor) {
            this.monitoringInterval = setInterval(() => this.monitor(), MONITORING_DISPLAY_INTERVAL);
        }
    }
    static launch(options) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Launching');
            const cluster = new Cluster(options);
            yield cluster.init();
            return cluster;
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const browserOptions = this.options.puppeteerOptions;
            let puppeteer = this.options.puppeteer;
            if (this.options.puppeteer == null) { // check for null or undefined
                puppeteer = require('puppeteer');
            }
            else {
                debug('Using provided (custom) puppteer object.');
            }
            if (this.options.concurrency === Cluster.CONCURRENCY_PAGE) {
                this.browser = new builtInConcurrency.Page(browserOptions, puppeteer);
            }
            else if (this.options.concurrency === Cluster.CONCURRENCY_CONTEXT) {
                this.browser = new builtInConcurrency.Context(browserOptions, puppeteer);
            }
            else if (this.options.concurrency === Cluster.CONCURRENCY_BROWSER) {
                this.perBrowserOptions = this.options.perBrowserOptions;
                if (this.perBrowserOptions.length > 0) {
                    this.usePerBrowserOptions = true;
                }
                this.urlsPerBrowser = this.options.urlsPerBrowser;
                this.browser = new builtInConcurrency.Browser(browserOptions, puppeteer);
            }
            else if (typeof this.options.concurrency === 'function') {
                this.browser = new this.options.concurrency(browserOptions, puppeteer);
            }
            else {
                throw new Error(`Unknown concurrency option: ${this.options.concurrency}`);
            }
            try {
                yield this.browser.init();
            }
            catch (err) {
                throw new Error(`Unable to launch browser, error message: ${err.message}`);
            }
            if (this.options.monitor) {
                yield this.systemMonitor.init();
            }
            // needed in case resources are getting free (like CPU/memory) to check if
            // can launch workers
            this.checkForWorkInterval = setInterval(() => this.work(), CHECK_FOR_WORK_INTERVAL);
        });
    }
    launchWorker() {
        return __awaiter(this, void 0, void 0, function* () {
            // signal, that we are starting a worker
            yield workerStartingMutex.runExclusive(() => {
                this.workersStarting += 1;
            });
            yield workerIdMutex.runExclusive(() => {
                this.nextWorkerId += 1;
            });
            this.lastLaunchedWorkerTime = Date.now();
            let nextBrowserOption = {};
            if (this.usePerBrowserOptions && this.perBrowserOptions.length > 0) {
                // tslint:disable-next-line:max-line-length
                nextBrowserOption = this.perBrowserOptions[Math.floor(Math.random() * this.perBrowserOptions.length)];
            }
            const workerId = this.nextWorkerId;
            let workerBrowserInstance;
            try {
                workerBrowserInstance = yield this.browser
                    .workerInstance(nextBrowserOption);
            }
            catch (err) {
                throw new Error(`Unable to launch browser for worker, error message: ${err.message}`);
            }
            const worker = new Worker_1.default({
                cluster: this,
                args: [''],
                browser: workerBrowserInstance,
                id: workerId,
            });
            yield workerStartingMutex.runExclusive(() => {
                this.workersStarting -= 1;
            });
            if (this.isClosed) {
                // cluster was closed while we created a new worker (should rarely happen)
                worker.close();
            }
            else {
                this.workersAvail.push(worker);
                this.workers.push(worker);
            }
        });
    }
    task(taskFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            this.taskFunction = taskFunction;
        });
    }
    // check for new work soon (wait if there will be put more data into the queue, first)
    work() {
        return __awaiter(this, void 0, void 0, function* () {
            // make sure, we only call work once every WORK_CALL_INTERVAL_LIMIT (currently: 10ms)
            if (this.workCallTimeout === null) {
                const now = Date.now();
                // calculate when the next work call should happen
                this.nextWorkCall = Math.max(this.nextWorkCall + WORK_CALL_INTERVAL_LIMIT, now);
                const timeUntilNextWorkCall = this.nextWorkCall - now;
                this.workCallTimeout = setTimeout(() => {
                    this.workCallTimeout = null;
                    this.doWork();
                }, timeUntilNextWorkCall);
            }
        });
    }
    doWork() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.jobQueue.size() === 0) { // no jobs available
                if (this.workersBusy.length === 0) {
                    this.idleResolvers.forEach(resolve => resolve());
                }
                return;
            }
            if (this.workersAvail.length === 0) { // no workers available
                if (this.allowedToStartWorker()) {
                    yield this.launchWorker();
                    this.work();
                }
                return;
            }
            const job = this.jobQueue.shift();
            if (typeof job === 'undefined' || job === null) {
                // skip, there are items in the queue but they are all delayed
                return;
            }
            // @ts-ignore
            const ugd = job && job.data && job.data.ugd ? job.data.ugd : undefined;
            const currentDomains = this.workersBusy.map((working) => {
                try {
                    if (working.activeTarget) {
                        // TODO: improve the logic, hardcoding to get things working
                        const data = working.activeTarget.data || { url: '' };
                        return util.getDomainFromURL(data.url || '');
                    }
                }
                catch (e) {
                }
                return undefined;
            });
            const url = job.getUrl();
            const domain = job.getDomain();
            const currentTLDDomain = util.getDomainFromURL(url);
            if (currentDomains.includes(currentTLDDomain)) {
                this.jobQueue.push(job);
                this.work();
                return;
            }
            // Check if URL was already crawled (on skipDuplicateUrls)
            if (this.options.skipDuplicateUrls
                && url !== undefined && this.duplicateCheckUrls.has(url)) {
                // already crawled, just ignore
                debug(`Skipping duplicate URL: ${job.getUrl()}`);
                console.log(`Skipping duplicate URL: ${job.getUrl()}`);
                this.work();
                return;
            }
            if (this.options.skipDuplicateUrlsTTL
                && url !== undefined && this.duplicateUrlsSetTTL.isExists(url + ugd)) {
                debug(`Skipping duplicate URL: ${job.getUrl()}`);
                console.log(`Skipping duplicate URLs TTL: ${job.getUrl()}`);
                this.work();
                return;
            }
            // Check if the job needs to be delayed due to sameDomainDelay
            if (this.options.sameDomainDelay !== 0 && domain !== undefined) {
                const lastDomainAccess = this.lastDomainAccesses.get(domain);
                if (lastDomainAccess !== undefined
                    && lastDomainAccess + this.options.sameDomainDelay > Date.now()) {
                    this.jobQueue.push(job, {
                        delayUntil: lastDomainAccess + this.options.sameDomainDelay,
                    });
                    console.log('Same Domain Delay: ', domain);
                    this.work();
                    return;
                }
            }
            // Check are all positive, let's actually run the job
            if (this.options.skipDuplicateUrls && url !== undefined) {
                this.duplicateCheckUrls.add(url);
            }
            if (this.options.skipDuplicateUrlsTTL && url !== undefined && ugd !== undefined) {
                this.duplicateUrlsSetTTL.add(url + ugd, this.options.skipDuplicateUrlsTTL);
            }
            if (this.options.sameDomainDelay !== 0 && domain !== undefined) {
                this.lastDomainAccesses.set(domain, Date.now());
            }
            const worker = this.workersAvail.shift();
            this.workersBusy.push(worker);
            if (this.workersAvail.length !== 0 || this.allowedToStartWorker()) {
                // we can execute more work in parallel
                this.work();
            }
            let jobFunction;
            if (job.taskFunction !== undefined) {
                jobFunction = job.taskFunction;
            }
            else if (this.taskFunction !== null) {
                jobFunction = this.taskFunction;
            }
            else {
                throw new Error('No task function defined!');
            }
            // tslint:disable-next-line:no-increment-decrement
            worker.times++;
            let result;
            try {
                result = yield worker.handle(jobFunction, job, this.options.timeout);
            }
            catch (e) {
                console.log('Worker Handle Error', e);
                this.workersBusy.splice(this.workersBusy.indexOf(worker), 1);
                this.workers.splice(this.workers.indexOf(worker), 1);
                yield worker.close();
                yield this.launchWorker();
                this.work();
                if (job.executeCallbacks) {
                    (_a = job.executeCallbacks) === null || _a === void 0 ? void 0 : _a.reject(`Worker Handle Error ${e}`);
                    this.errorCount += 1;
                }
                return;
            }
            if (result.type === 'error') {
                if (job.executeCallbacks) {
                    job.executeCallbacks.reject(result.error);
                    this.errorCount += 1;
                }
                else { // ignore retryLimits in case of executeCallbacks
                    job.addError(result.error);
                    const jobWillRetry = job.tries <= this.options.retryLimit;
                    this.emit('taskerror', result.error, job.data, jobWillRetry);
                    if (jobWillRetry) {
                        let delayUntil = undefined;
                        if (this.options.retryDelay !== 0) {
                            delayUntil = Date.now() + this.options.retryDelay;
                        }
                        this.jobQueue.push(job, {
                            delayUntil,
                        });
                    }
                    else {
                        this.errorCount += 1;
                    }
                }
            }
            else if (result.type === 'success' && job.executeCallbacks) {
                job.executeCallbacks.resolve(result.data);
            }
            this.waitForOneResolvers.forEach(resolve => resolve(job.data));
            this.waitForOneResolvers = [];
            // add worker to available workers again
            const busyWorkerIndex = this.workersBusy.indexOf(worker);
            this.workersBusy.splice(busyWorkerIndex, 1);
            if (worker.times > this.urlsPerBrowser) {
                console.log('Reached Maximum URLs Per Browser');
                const workerIndex = this.workers.indexOf(worker);
                this.workers.splice(workerIndex, 1);
                yield worker.close();
                yield this.launchWorker();
                this.work();
                return;
            }
            this.workersAvail.push(worker);
            this.work();
        });
    }
    allowedToStartWorker() {
        const workerCount = this.workers.length + this.workersStarting;
        return (
        // option: maxConcurrency
        (this.options.maxConcurrency === 0
            || workerCount < this.options.maxConcurrency)
            // just allow worker creaton every few milliseconds
            && (this.options.workerCreationDelay === 0
                || this.lastLaunchedWorkerTime + this.options.workerCreationDelay < Date.now()));
    }
    // Type Guard for TypeScript
    isTaskFunction(data) {
        return (typeof data === 'function');
    }
    queueJob(data, taskFunction, callbacks) {
        let realData;
        let realFunction;
        if (this.isTaskFunction(data)) {
            realFunction = data;
        }
        else {
            realData = data;
            realFunction = taskFunction;
        }
        const job = new Job_1.default(realData, realFunction, callbacks);
        this.allTargetCount += 1;
        this.jobQueue.push(job);
        this.emit('queue', realData, realFunction);
        this.work();
    }
    queue(data, taskFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            this.queueJob(data, taskFunction);
        });
    }
    execute(data, taskFunction) {
        return new Promise((resolve, reject) => {
            const callbacks = { resolve, reject };
            this.queueJob(data, taskFunction, callbacks);
        });
    }
    idle() {
        return new Promise(resolve => this.idleResolvers.push(resolve));
    }
    waitForOne() {
        return new Promise(resolve => this.waitForOneResolvers.push(resolve));
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            this.isClosed = true;
            clearInterval(this.checkForWorkInterval);
            clearTimeout(this.workCallTimeout);
            // close workers
            yield Promise.all(this.workers.map(worker => worker.close()));
            try {
                yield this.browser.close();
            }
            catch (err) {
                debug(`Error: Unable to close browser, message: ${err.message}`);
            }
            if (this.monitoringInterval) {
                this.monitor();
                clearInterval(this.monitoringInterval);
            }
            if (this.display) {
                this.display.close();
            }
            this.systemMonitor.close();
            debug('Closed');
        });
    }
    monitor() {
        if (!this.display) {
            this.display = new Display_1.default();
        }
        const display = this.display;
        const now = Date.now();
        const timeDiff = now - this.startTime;
        const doneTargets = this.allTargetCount - this.jobQueue.size() - this.workersBusy.length;
        const donePercentage = this.allTargetCount === 0
            ? 1 : (doneTargets / this.allTargetCount);
        const donePercStr = (100 * donePercentage).toFixed(2);
        const errorPerc = doneTargets === 0 ?
            '0.00' : (100 * this.errorCount / doneTargets).toFixed(2);
        const timeRunning = util.formatDuration(timeDiff);
        let timeRemainingMillis = -1;
        if (donePercentage !== 0) {
            timeRemainingMillis = ((timeDiff) / donePercentage) - timeDiff;
        }
        const timeRemining = util.formatDuration(timeRemainingMillis);
        const cpuUsage = this.systemMonitor.getCpuUsage().toFixed(1);
        const memoryUsage = this.systemMonitor.getMemoryUsage().toFixed(1);
        const pagesPerSecond = doneTargets === 0 ?
            '0' : (doneTargets * 1000 / timeDiff).toFixed(2);
        display.log(`== Start:     ${util.formatDateTime(this.startTime)}`);
        display.log(`== Now:       ${util.formatDateTime(now)} (running for ${timeRunning})`);
        display.log(`== Progress:  ${doneTargets} / ${this.allTargetCount} (${donePercStr}%)`
            + `, errors: ${this.errorCount} (${errorPerc}%)`);
        display.log(`== Remaining: ${timeRemining} (@ ${pagesPerSecond} pages/second)`);
        display.log(`== Sys. load: ${cpuUsage}% CPU / ${memoryUsage}% memory`);
        display.log(`== Workers:   ${this.workers.length + this.workersStarting}`);
        display.log(`== Job Queue Length:   ${this.jobQueue.size()}`);
        display.log(`== Job Queue Delay Items Length:   ${this.jobQueue.delayedItemSize()}`);
        display.log(`== Job Queue Items to be picked:   ${this.jobQueue.currentJobsToBePicked()}`);
        display.log(`== Avail Workers Length:   ${this.workersAvail.length}`);
        display.log(`== Busy Workers Length:   ${this.workersBusy.length}`);
        this.workers.forEach((worker, i) => {
            // @ts-ignore
            const isIdle = this.workersAvail.indexOf(worker) !== -1;
            let workOrIdle;
            let workerUrl = '';
            if (isIdle) {
                workOrIdle = 'IDLE';
            }
            else {
                workOrIdle = 'WORK';
                if (worker.activeTarget) {
                    workerUrl = worker.activeTarget.getUrl() || 'UNKNOWN TARGET';
                }
                else {
                    workerUrl = 'NO TARGET (should not be happening)';
                }
            }
            display.log(`   #${i} ${workOrIdle} ${workerUrl}`);
        });
        for (let i = 0; i < this.workersStarting; i += 1) {
            display.log(`   #${this.workers.length + i} STARTING...`);
        }
        let i = 0;
        display.log('== Domain Delay Map :');
        exports.domainDelayMap.forEach((val, key) => {
            if (val > 0) {
                i += 1;
                display.log(` #${i} ${key} : ${val}`);
            }
        });
        display.resetCursor();
    }
}
exports.default = Cluster;
Cluster.CONCURRENCY_PAGE = 1; // shares cookies, etc.
Cluster.CONCURRENCY_CONTEXT = 2; // no cookie sharing (uses contexts)
Cluster.CONCURRENCY_BROWSER = 3; // no cookie sharing and individual processes (uses contexts)
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2x1c3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9DbHVzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLCtCQUE2RTtBQUM3RSx1Q0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHFDQUE4QztBQUU5Qyx1RUFBdUU7QUFHdkUsbUNBQTRCO0FBQzVCLHFDQUE4QjtBQUM5QixtREFBNEM7QUFDNUMsbUNBQXNDO0FBR3RDLDZDQUFvQztBQUVwQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sbUJBQW1CLEdBQVUsSUFBSSxtQkFBSyxFQUFFLENBQUM7QUFDL0MsTUFBTSxhQUFhLEdBQVUsSUFBSSxtQkFBSyxFQUFFLENBQUM7QUFDNUIsUUFBQSxTQUFTLEdBQUc7SUFDckIsc0JBQXNCLEVBQUUscUJBQXFCO0lBQzdDLHdCQUF3QixFQUFFLHVCQUF1QjtDQUNwRCxDQUFDO0FBeUJGLE1BQU0sZUFBZSxHQUFtQjtJQUNwQyxXQUFXLEVBQUUsQ0FBQztJQUNkLGNBQWMsRUFBRSxDQUFDO0lBQ2pCLG1CQUFtQixFQUFFLENBQUM7SUFDdEIsZ0JBQWdCLEVBQUU7SUFDZCwwQ0FBMEM7S0FDN0M7SUFDRCxpQkFBaUIsRUFBRSxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxLQUFLO0lBQ2QsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJO0lBQ2xCLFVBQVUsRUFBRSxDQUFDO0lBQ2IsVUFBVSxFQUFFLENBQUM7SUFDYixpQkFBaUIsRUFBRSxLQUFLO0lBQ3hCLGVBQWUsRUFBRSxDQUFDO0lBQ2xCLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLGNBQWMsRUFBRSxLQUFLO0NBQ3hCLENBQUM7QUFjRixNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQztBQUN6QyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQztBQUNwQyxNQUFNLHdCQUF3QixHQUFHLEVBQUUsQ0FBQztB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