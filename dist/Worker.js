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
const util_1 = require("./util");
const util_2 = require("util");
const debug = util_1.debugGenerator('Worker');
const DEFAULT_OPTIONS = {
    args: [],
};
const BROWSER_INSTANCE_TRIES = 10;
class Worker {
    constructor({ cluster, args, id, browser }) {
        this.activeTarget = null;
        this.cluster = cluster;
        this.args = args;
        this.id = id;
        this.browser = browser;
        this.times = 0;
        debug(`Starting #${this.id}`);
    }
    handle(task, job, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            this.activeTarget = job;
            let jobInstance = null;
            let page = null;
            let tries = 0;
            while (jobInstance === null) {
                try {
                    jobInstance = yield this.browser.jobInstance();
                    page = jobInstance.resources.page;
                }
                catch (err) {
                    debug(`Error getting browser page (try: ${tries}), message: ${err.message}`);
                    yield this.browser.repair();
                    tries += 1;
                    if (tries >= BROWSER_INSTANCE_TRIES) {
                        throw new Error('Unable to get browser page');
                    }
                }
            }
            // We can be sure that page is set now, otherwise an exception would've been thrown
            page = page; // this is just for TypeScript
            let errorState = null;
            page.on('error', (err) => {
                errorState = err;
                util_1.log(`Error (page error) crawling ${util_2.inspect(job.data)} // message: ${err.message}`);
            });
            debug(`Executing task on worker #${this.id} with data: ${util_2.inspect(job.data)}`);
            let result;
            try {
                result = yield util_1.timeoutExecute(timeout, task({
                    page,
                    // data might be undefined if queue is only called with a function
                    // we ignore that case, as the user should use Cluster<undefined> in that case
                    // to get correct typings
                    data: job.data,
                    worker: {
                        id: this.id,
                    },
                }));
            }
            catch (err) {
                errorState = err;
                util_1.log(`Error crawling ${util_2.inspect(job.data)} // message: ${err.message}`);
            }
            debug(`Finished executing task on worker #${this.id}`);
            try {
                yield jobInstance.close();
            }
            catch (e) {
                debug(`Error closing browser instance for ${util_2.inspect(job.data)}: ${e.message}`);
                yield this.browser.repair();
            }
            this.activeTarget = null;
            if (errorState) {
                return {
                    type: 'error',
                    error: errorState || new Error('asf'),
                };
            }
            return {
                data: result,
                type: 'success',
            };
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.browser.close();
            }
            catch (err) {
                debug(`Unable to close worker browser. Error message: ${err.message}`);
            }
            debug(`Closed #${this.id}`);
        });
    }
}
exports.default = Worker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBSUEsaUNBQTZEO0FBQzdELCtCQUErQjtBQUcvQixNQUFNLEtBQUssR0FBRyxxQkFBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRXZDLE1BQU0sZUFBZSxHQUFHO0lBQ3BCLElBQUksRUFBRSxFQUFFO0NBQ1gsQ0FBQztBQVNGLE1BQU0sc0JBQXNCLEdBQUcsRUFBRSxDQUFDO0FBY2xDLE1BQXFCLE1BQU07SUFVdkIsWUFBbUIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQWlCO1FBRmhFLGlCQUFZLEdBQW9DLElBQUksQ0FBQztRQUdqRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBRWYsS0FBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVZLE1BQU0sQ0FDWCxJQUF1QyxFQUN2QyxHQUE2QixFQUM3QixPQUFlOztZQUVuQixJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQztZQUV4QixJQUFJLFdBQVcsR0FBdUIsSUFBSSxDQUFDO1lBQzNDLElBQUksSUFBSSxHQUFnQixJQUFJLENBQUM7WUFFN0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBRWQsT0FBTyxXQUFXLEtBQUssSUFBSSxFQUFFO2dCQUN6QixJQUFJO29CQUNBLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQy9DLElBQUksR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztpQkFDckM7Z0JBQUMsT0FBTyxHQUFHLEVBQUU7b0JBQ1YsS0FBSyxDQUFDLG9DQUFvQyxLQUFLLGVBQWUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQzdFLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDNUIsS0FBSyxJQUFJLENBQUMsQ0FBQztvQkFDWCxJQUFJLEtBQUssSUFBSSxzQkFBc0IsRUFBRTt3QkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO3FCQUNqRDtpQkFDSjthQUNKO1lBRUEsbUZBQW1GO1lBQ3BGLElBQUksR0FBRyxJQUFZLENBQUMsQ0FBQyw4QkFBOEI7WUFFbkQsSUFBSSxVQUFVLEdBQWlCLElBQUksQ0FBQztZQUVwQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNyQixVQUFVLEdBQUcsR0FBRyxDQUFDO2dCQUNqQixVQUFHLENBQUMsK0JBQStCLGNBQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUN2RixDQUFDLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyw2QkFBNkIsSUFBSSxDQUFDLEVBQUUsZUFBZSxjQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUU5RSxJQUFJLE1BQVcsQ0FBQztZQUNoQixJQUFJO2dCQUNBLE1BQU0sR0FBRyxNQUFNLHFCQUFjLENBQ3pCLE9BQU8sRUFDUCxJQUFJLENBQUM7b0JBQ0QsSUFBSTtvQkFDSixrRUFBa0U7b0JBQ2xFLDhFQUE4RTtvQkFDOUUseUJBQXlCO29CQUN6QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQWU7b0JBQ3pCLE1BQU0sRUFBRTt3QkFDSixFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7cUJBQ2Q7aUJBQ0osQ0FBQyxDQUNMLENBQUM7YUFDTDtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNWLFVBQVUsR0FBRyxHQUFHLENBQUM7Z0JBQ2pCLFVBQUcsQ0FBQyxrQkFBa0IsY0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2FBQ3pFO1lBRUQsS0FBSyxDQUFDLHNDQUFzQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUV2RCxJQUFJO2dCQUNBLE1BQU0sV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQzdCO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1IsS0FBSyxDQUFDLHNDQUFzQyxjQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRSxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDL0I7WUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztZQUV6QixJQUFJLFVBQVUsRUFBRTtnQkFDWixPQUFPO29CQUNILElBQUksRUFBRSxPQUFPO29CQUNiLEtBQUssRUFBRSxVQUFVLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDO2lCQUN4QyxDQUFDO2FBQ0w7WUFDRCxPQUFPO2dCQUNILElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxTQUFTO2FBQ2xCLENBQUM7UUFDTixDQUFDO0tBQUE7SUFFWSxLQUFLOztZQUNkLElBQUk7Z0JBQ0EsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQzlCO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1YsS0FBSyxDQUFDLGtEQUFrRCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUMxRTtZQUNELEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7S0FBQTtDQUVKO0FBOUdELHlCQThHQyJ9