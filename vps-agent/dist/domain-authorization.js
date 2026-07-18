"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revalidateCustomDomainRoutes = revalidateCustomDomainRoutes;
const promises_1 = require("node:dns/promises");
const routes_1 = require("./routes");
const LOOKUP_TIMEOUT_MS = 5000;
async function withTimeout(operation) {
    let timer;
    try {
        return await Promise.race([
            operation,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('DNS lookup timed out')), LOOKUP_TIMEOUT_MS);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
async function stillOwnsDomain(domain, token, expectedIp) {
    try {
        const [addresses, records] = await Promise.all([
            withTimeout((0, promises_1.resolve4)(domain)),
            withTimeout((0, promises_1.resolveTxt)(`_noeron-verification.${domain}`)),
        ]);
        return addresses.includes(expectedIp) && records.some((parts) => parts.join('') === token);
    }
    catch {
        return false;
    }
}
async function revalidateCustomDomainRoutes(store, expectedIp) {
    const customRoutes = store.routes.filter((route) => route.domainAuthorizationVersion === 1);
    const validity = await Promise.all(customRoutes.map(async (route) => ({
        route,
        valid: Boolean(route.domainVerificationToken)
            && await stillOwnsDomain(route.host, route.domainVerificationToken, expectedIp),
    })));
    const invalidHosts = new Set(validity.filter(({ valid }) => !valid).map(({ route }) => route.host));
    for (const { route, valid } of validity) {
        if (valid)
            (0, routes_1.refreshDomainRouteAuthorization)(route);
    }
    if (invalidHosts.size) {
        store.routes = store.routes.filter((route) => !invalidHosts.has(route.host));
    }
    if (customRoutes.length)
        await store.save();
}
//# sourceMappingURL=domain-authorization.js.map