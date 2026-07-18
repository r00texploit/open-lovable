"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertSafeId = assertSafeId;
exports.normalizeHostname = normalizeHostname;
exports.resolveContainedPath = resolveContainedPath;
exports.resolvePosixContainedPath = resolvePosixContainedPath;
const path_1 = __importDefault(require("path"));
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
function assertSafeId(value, label) {
    if (!ID_PATTERN.test(value))
        throw new Error(`Invalid ${label}`);
    return value;
}
function normalizeHostname(value) {
    const host = value.trim().toLowerCase().replace(/\.$/, '');
    if (!HOST_PATTERN.test(host))
        throw new Error('Invalid hostname');
    return host;
}
function resolveContainedPath(root, requestedPath) {
    if (requestedPath.includes('\0'))
        throw new Error('Invalid path');
    const normalizedRoot = path_1.default.resolve(root);
    const relative = requestedPath.replace(/^[/\\]+/, '');
    const resolved = path_1.default.resolve(normalizedRoot, relative);
    if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path_1.default.sep}`)) {
        throw new Error('Path escapes the allowed root');
    }
    return resolved;
}
function resolvePosixContainedPath(root, requestedPath) {
    if (requestedPath.includes('\0'))
        throw new Error('Invalid path');
    const normalizedRoot = path_1.default.posix.resolve('/', root);
    const resolved = requestedPath.startsWith('/')
        ? path_1.default.posix.resolve('/', requestedPath)
        : path_1.default.posix.resolve(normalizedRoot, requestedPath);
    if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}/`)) {
        throw new Error('Path escapes the sandbox workspace');
    }
    return resolved;
}
//# sourceMappingURL=security.js.map