export default class SetTTL<T> {
    private duplicateCheckUrls;
    add(key: string, ttl: number): void;
    delete(key: string): void;
    isExists(key: string): boolean;
    size(): number;
    logSetElements(value1: any, value2: any, set: any): void;
    print(): void;
}
