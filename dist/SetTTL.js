"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// options : setOptions
class SetTTL {
    constructor() {
        this.duplicateCheckUrls = new Set();
    }
    add(key, ttl) {
        this.duplicateCheckUrls.add(key);
        setTimeout(() => {
            this.duplicateCheckUrls.delete(key);
        }, ttl);
    }
    delete(key) {
        this.duplicateCheckUrls.delete(key);
    }
    isExists(key) {
        return this.duplicateCheckUrls.has(key);
    }
    size() {
        return this.duplicateCheckUrls.size;
    }
    logSetElements(value1, value2, set) {
        console.log(`s[${value1}] = ${value2}`);
    }
    print() {
        this.duplicateCheckUrls.forEach(this.logSetElements);
        console.log(this.duplicateCheckUrls.size);
    }
}
exports.default = SetTTL;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0VFRMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NldFRUTC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLHVCQUF1QjtBQUN2QixNQUFxQixNQUFNO0lBQTNCO1FBQ2EsdUJBQWtCLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7SUE4QnpELENBQUM7SUE1QlUsR0FBRyxDQUFDLEdBQVcsRUFBRyxHQUFXO1FBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxFQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFTSxNQUFNLENBQUMsR0FBWTtRQUN0QixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFTSxRQUFRLENBQUMsR0FBVztRQUN2QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVNLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7SUFDeEMsQ0FBQztJQUVNLGNBQWMsQ0FBQyxNQUFVLEVBQUUsTUFBVSxFQUFFLEdBQU87UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE1BQU0sT0FBTyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTSxLQUFLO1FBQ1IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUVKO0FBL0JELHlCQStCQyJ9