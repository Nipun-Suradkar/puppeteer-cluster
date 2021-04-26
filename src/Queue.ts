import { EventEmitter } from 'events';
import { domainDelayMap } from './Cluster';

interface QueueOptions {
    delayUntil?: number;
}

export default class Queue<T> extends EventEmitter{

    private list: T[] = [];
    private delayedItems: number = 0;

    public size(): number {
        return this.list.length + this.delayedItems;
    }

    public currentJobsToBePicked():number {
        return this.list.length;
    }

    public delayedItemSize(): number {
        return this.delayedItems;
    }

    public push(item: T, options: QueueOptions = {}): void {
        if (options && options.delayUntil && options.delayUntil > Date.now()) {
            this.delayedItems += 1;
            // @ts-ignore
            const domain = item.getDomain();
            if (domain !== undefined) {
                const count = domainDelayMap.get(domain);
                domainDelayMap.set(domain, count === undefined ? 1 : count + 1);
            }
            setTimeout(
                () => {
                    this.delayedItems -= 1;
                    this.list.push(item);
                    // @ts-ignore
                    const domain = item.getDomain();
                    if (domain !== undefined) {
                        const count = domainDelayMap.get(domain);
                        domainDelayMap.set(domain, count === undefined ? 0 : count - 1);
                        // tslint:disable-next-line:brace-style
                    }},
                (options.delayUntil - Date.now()),
            );
        } else {
            this.list.push(item);
        }
    }

    // Care, this function might actually return undefined even though size() returns a value > 0
    // Reason is, that there might be delayedItems (checkout QueueOptions.delayUntil)
    public shift(): T | undefined {
        return this.list.shift();
    }

}
