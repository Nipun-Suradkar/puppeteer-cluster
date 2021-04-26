"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Cluster_1 = require("./Cluster");
class Queue extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.list = [];
        this.delayedItems = 0;
    }
    size() {
        return this.list.length + this.delayedItems;
    }
    currentJobsToBePicked() {
        return this.list.length;
    }
    delayedItemSize() {
        return this.delayedItems;
    }
    push(item, options = {}) {
        if (options && options.delayUntil && options.delayUntil > Date.now()) {
            this.delayedItems += 1;
            // @ts-ignore
            const domain = item.getDomain();
            if (domain !== undefined) {
                const count = Cluster_1.domainDelayMap.get(domain);
                Cluster_1.domainDelayMap.set(domain, count === undefined ? 1 : count + 1);
            }
            setTimeout(() => {
                this.delayedItems -= 1;
                this.list.push(item);
                // @ts-ignore
                const domain = item.getDomain();
                if (domain !== undefined) {
                    const count = Cluster_1.domainDelayMap.get(domain);
                    Cluster_1.domainDelayMap.set(domain, count === undefined ? 0 : count - 1);
                    // tslint:disable-next-line:brace-style
                }
            }, (options.delayUntil - Date.now()));
        }
        else {
            this.list.push(item);
        }
    }
    // Care, this function might actually return undefined even though size() returns a value > 0
    // Reason is, that there might be delayedItems (checkout QueueOptions.delayUntil)
    shift() {
        return this.list.shift();
    }
}
exports.default = Queue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVldWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvUXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBc0M7QUFDdEMsdUNBQTJDO0FBTTNDLE1BQXFCLEtBQVMsU0FBUSxxQkFBWTtJQUFsRDs7UUFFWSxTQUFJLEdBQVEsRUFBRSxDQUFDO1FBQ2YsaUJBQVksR0FBVyxDQUFDLENBQUM7SUErQ3JDLENBQUM7SUE3Q1UsSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUNoRCxDQUFDO0lBRU0scUJBQXFCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVNLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFFTSxJQUFJLENBQUMsSUFBTyxFQUFFLFVBQXdCLEVBQUU7UUFDM0MsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNsRSxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQztZQUN2QixhQUFhO1lBQ2IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtnQkFDdEIsTUFBTSxLQUFLLEdBQUcsd0JBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pDLHdCQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzthQUNuRTtZQUNELFVBQVUsQ0FDTixHQUFHLEVBQUU7Z0JBQ0QsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixhQUFhO2dCQUNiLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO29CQUN0QixNQUFNLEtBQUssR0FBRyx3QkFBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDekMsd0JBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNoRSx1Q0FBdUM7aUJBQzFDO1lBQUEsQ0FBQyxFQUNOLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FDcEMsQ0FBQztTQUNMO2FBQU07WUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN4QjtJQUNMLENBQUM7SUFFRCw2RkFBNkY7SUFDN0YsaUZBQWlGO0lBQzFFLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDN0IsQ0FBQztDQUVKO0FBbERELHdCQWtEQyJ9