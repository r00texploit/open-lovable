"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSandboxRoutes = addSandboxRoutes;
exports.removeSandboxRoutes = removeSandboxRoutes;
exports.addDeploymentRoutes = addDeploymentRoutes;
exports.removeDeploymentRoutes = removeDeploymentRoutes;
exports.getRoutes = getRoutes;
exports.addDomainRoute = addDomainRoute;
exports.isRouteAuthorized = isRouteAuthorized;
exports.refreshDomainRouteAuthorization = refreshDomainRouteAuthorization;
exports.removeDomainRoute = removeDomainRoute;
const security_1 = require("./security");
const DOMAIN_AUTHORIZATION_TTL_MS = 15 * 60 * 1000;
function addSandboxRoutes(store, info, baseDomain, subdomain, _customDomain) {
    const hosts = [];
    if (subdomain)
        hosts.push((0, security_1.normalizeHostname)(`${subdomain}.${baseDomain}`));
    removeSandboxRoutes(store, info.sandboxId);
    for (const host of hosts) {
        store.routes.push({
            host,
            target: { type: 'container', value: `${info.host}:${info.port}` },
            sandboxId: info.sandboxId,
        });
    }
    store.save().catch((err) => console.error('Failed to save routes:', err));
}
function removeSandboxRoutes(store, sandboxId) {
    store.routes = store.routes.filter((r) => r.sandboxId !== sandboxId);
    store.save().catch((err) => console.error('Failed to save routes:', err));
}
function addDeploymentRoutes(store, siteId, subdomain, _customDomain, siteDir, baseDomain) {
    removeDeploymentRoutes(store, siteId);
    const hosts = [];
    if (subdomain)
        hosts.push((0, security_1.normalizeHostname)(`${subdomain}.${baseDomain}`));
    for (const host of hosts) {
        store.routes.push({
            host,
            target: { type: 'static', value: siteDir },
            siteId,
        });
    }
    store.save().catch((err) => console.error('Failed to save routes:', err));
}
function removeDeploymentRoutes(store, siteId) {
    store.routes = store.routes.filter((r) => r.siteId !== siteId);
    store.save().catch((err) => console.error('Failed to save routes:', err));
}
function getRoutes(store) {
    return store.routes;
}
function addDomainRoute(store, siteId, domain, verificationToken) {
    const host = (0, security_1.normalizeHostname)(domain);
    const existing = store.routes.find((route) => route.siteId === siteId);
    if (!existing)
        return false;
    if (store.routes.some((route) => route.host === host && route.siteId !== siteId)) {
        throw new Error('Domain is already assigned');
    }
    store.routes = store.routes.filter((route) => route.host !== host);
    store.routes.push({
        ...existing,
        host,
        domainAuthorizationVersion: 1,
        domainVerificationToken: verificationToken,
        domainAuthorizationExpiresAt: new Date(Date.now() + DOMAIN_AUTHORIZATION_TTL_MS).toISOString(),
    });
    void store.save();
    return true;
}
function isRouteAuthorized(route, baseDomain) {
    if (route.host.endsWith(`.${(0, security_1.normalizeHostname)(baseDomain)}`))
        return true;
    return route.domainAuthorizationVersion === 1
        && Boolean(route.domainVerificationToken)
        && Boolean(route.domainAuthorizationExpiresAt)
        && new Date(route.domainAuthorizationExpiresAt).getTime() > Date.now();
}
function refreshDomainRouteAuthorization(route) {
    route.domainAuthorizationExpiresAt = new Date(Date.now() + DOMAIN_AUTHORIZATION_TTL_MS).toISOString();
}
function removeDomainRoute(store, domain) {
    const host = (0, security_1.normalizeHostname)(domain);
    const before = store.routes.length;
    store.routes = store.routes.filter((route) => route.host !== host);
    if (store.routes.length !== before)
        void store.save();
    return store.routes.length !== before;
}
//# sourceMappingURL=routes.js.map