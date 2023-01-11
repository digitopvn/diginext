"use strict";
// import { ObjectId } from "mongodb"
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidObjectId = void 0;
const PlatformTools_1 = require("../platform/PlatformTools");
function isValidObjectId(id) {
    const ObjectId = PlatformTools_1.PlatformTools.load("mongodb").ObjectId;
    try {
        return new ObjectId(id).toString() === id;
    }
    catch (e) {
        return false;
    }
}
exports.isValidObjectId = isValidObjectId;

//# sourceMappingURL=MongoUtils.js.map
