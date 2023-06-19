#!/usr/bin/env node
// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const banner = `--[[
    generated with jspicl,
    a javascript to pico-8 lua
    transpiler.
    
    please report any bugs to:
    https://github.com/agronkabashi/jspicl/issues
    ]]--
    `;
const defaultOptions = {
    cartridgePath: "",
    spritesheetImagePath: "",
    includeBanner: true,
    jsOutput: undefined,
    luaOutput: undefined,
    polyfillTransform: undefined,
    showStats: true,
    customPicoPath: undefined,
    pipeOutputToConsole: false,
    reloadOnSave: true,
    watch: false
};
const pico8Palette = [
    {
        r: 0,
        g: 0,
        b: 0
    },
    {
        r: 29,
        g: 43,
        b: 83
    },
    {
        r: 126,
        g: 37,
        b: 83
    },
    {
        r: 0,
        g: 135,
        b: 81
    },
    {
        r: 171,
        g: 82,
        b: 54
    },
    {
        r: 95,
        g: 87,
        b: 79
    },
    {
        r: 194,
        g: 195,
        b: 199
    },
    {
        r: 255,
        g: 241,
        b: 232
    },
    {
        r: 255,
        g: 0,
        b: 77
    },
    {
        r: 255,
        g: 163,
        b: 0
    },
    {
        r: 255,
        g: 236,
        b: 39
    },
    {
        r: 0,
        g: 228,
        b: 54
    },
    {
        r: 41,
        g: 173,
        b: 255
    },
    {
        r: 131,
        g: 118,
        b: 156
    },
    {
        r: 255,
        g: 119,
        b: 168
    },
    {
        r: 255,
        g: 204,
        b: 170
    }
];
const osType = (()=>{
    const { Deno: Deno1  } = globalThis;
    if (typeof Deno1?.build?.os === "string") {
        return Deno1.build.os;
    }
    const { navigator  } = globalThis;
    if (navigator?.appVersion?.includes?.("Win")) {
        return "windows";
    }
    return "linux";
})();
const isWindows = osType === "windows";
const CHAR_FORWARD_SLASH = 47;
function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
    }
}
function isPosixPathSeparator(code) {
    return code === 47;
}
function isPathSeparator(code) {
    return isPosixPathSeparator(code) || code === 92;
}
function isWindowsDeviceRoot(code) {
    return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for(let i = 0, len = path.length; i <= len; ++i){
        if (i < len) code = path.charCodeAt(i);
        else if (isPathSeparator(code)) break;
        else code = CHAR_FORWARD_SLASH;
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {} else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === 46 && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir) return base;
    if (base === sep) return dir;
    if (dir === pathObject.root) return dir + base;
    return dir + sep + base;
}
const WHITESPACE_ENCODINGS = {
    "\u0009": "%09",
    "\u000A": "%0A",
    "\u000B": "%0B",
    "\u000C": "%0C",
    "\u000D": "%0D",
    "\u0020": "%20"
};
function encodeWhitespace(string) {
    return string.replaceAll(/[\s]/g, (c)=>{
        return WHITESPACE_ENCODINGS[c] ?? c;
    });
}
function lastPathSegment(path, isSep, start = 0) {
    let matchedNonSeparator = false;
    let end = path.length;
    for(let i = path.length - 1; i >= start; --i){
        if (isSep(path.charCodeAt(i))) {
            if (matchedNonSeparator) {
                start = i + 1;
                break;
            }
        } else if (!matchedNonSeparator) {
            matchedNonSeparator = true;
            end = i + 1;
        }
    }
    return path.slice(start, end);
}
function stripTrailingSeparators(segment, isSep) {
    if (segment.length <= 1) {
        return segment;
    }
    let end = segment.length;
    for(let i = segment.length - 1; i > 0; i--){
        if (isSep(segment.charCodeAt(i))) {
            end = i;
        } else {
            break;
        }
    }
    return segment.slice(0, end);
}
function stripSuffix(name, suffix) {
    if (suffix.length >= name.length) {
        return name;
    }
    const lenDiff = name.length - suffix.length;
    for(let i = suffix.length - 1; i >= 0; --i){
        if (name.charCodeAt(lenDiff + i) !== suffix.charCodeAt(i)) {
            return name;
        }
    }
    return name.slice(0, -suffix.length);
}
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
const sep = "\\";
const delimiter = ";";
function resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        const { Deno: Deno1  } = globalThis;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (typeof Deno1?.cwd !== "function") {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno1.cwd();
        } else {
            if (typeof Deno1?.env?.get !== "function" || typeof Deno1?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno1.cwd();
            if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
                path = `${resolvedDevice}\\`;
            }
        }
        assertPath(path);
        const len = path.length;
        if (len === 0) continue;
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        if (len > 1) {
            if (isPathSeparator(code)) {
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    let j = 2;
                    let last = j;
                    for(; j < len; ++j){
                        if (isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        last = j;
                        for(; j < len; ++j){
                            if (!isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j < len && j !== last) {
                            last = j;
                            for(; j < len; ++j){
                                if (isPathSeparator(path.charCodeAt(j))) break;
                            }
                            if (j === len) {
                                device = `\\\\${firstPart}\\${path.slice(last)}`;
                                rootEnd = j;
                            } else if (j !== last) {
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                } else {
                    rootEnd = 1;
                }
            } else if (isWindowsDeviceRoot(code)) {
                if (path.charCodeAt(1) === 58) {
                    device = path.slice(0, 2);
                    rootEnd = 2;
                    if (len > 2) {
                        if (isPathSeparator(path.charCodeAt(2))) {
                            isAbsolute = true;
                            rootEnd = 3;
                        }
                    }
                }
            }
        } else if (isPathSeparator(code)) {
            rootEnd = 1;
            isAbsolute = true;
        }
        if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
            resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) break;
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
function normalize(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        } else if (tail.length > 0) {
            return tail;
        } else {
            return "";
        }
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    } else if (tail.length > 0) {
        return device + tail;
    } else {
        return device;
    }
}
function isAbsolute(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return false;
    const code = path.charCodeAt(0);
    if (isPathSeparator(code)) {
        return true;
    } else if (isWindowsDeviceRoot(code)) {
        if (len > 2 && path.charCodeAt(1) === 58) {
            if (isPathSeparator(path.charCodeAt(2))) return true;
        }
    }
    return false;
}
function join(...paths) {
    const pathsCount = paths.length;
    if (pathsCount === 0) return ".";
    let joined;
    let firstPart = null;
    for(let i = 0; i < pathsCount; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (joined === undefined) joined = firstPart = path;
            else joined += `\\${path}`;
        }
    }
    if (joined === undefined) return ".";
    let needsReplace = true;
    let slashCount = 0;
    assert(firstPart != null);
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        needsReplace = false;
                    }
                }
            }
        }
    }
    if (needsReplace) {
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize(joined);
}
function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    const fromOrig = resolve(from);
    const toOrig = resolve(to);
    if (fromOrig === toOrig) return "";
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) return "";
    let fromStart = 0;
    let fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 92) break;
    }
    for(; fromEnd - 1 > fromStart; --fromEnd){
        if (from.charCodeAt(fromEnd - 1) !== 92) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    let toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 92) break;
    }
    for(; toEnd - 1 > toStart; --toEnd){
        if (to.charCodeAt(toEnd - 1) !== 92) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 92) {
                    return toOrig.slice(toStart + i + 1);
                } else if (i === 2) {
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 92) {
                    lastCommonSep = i;
                } else if (i === 2) {
                    lastCommonSep = 3;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 92) lastCommonSep = i;
    }
    if (i !== length && lastCommonSep === -1) {
        return toOrig;
    }
    let out = "";
    if (lastCommonSep === -1) lastCommonSep = 0;
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 92) {
            if (out.length === 0) out += "..";
            else out += "\\..";
        }
    }
    if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
    } else {
        toStart += lastCommonSep;
        if (toOrig.charCodeAt(toStart) === 92) ++toStart;
        return toOrig.slice(toStart, toEnd);
    }
}
function toNamespacedPath(path) {
    if (typeof path !== "string") return path;
    if (path.length === 0) return "";
    const resolvedPath = resolve(path);
    if (resolvedPath.length >= 3) {
        if (resolvedPath.charCodeAt(0) === 92) {
            if (resolvedPath.charCodeAt(1) === 92) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== 63 && code !== 46) {
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
            if (resolvedPath.charCodeAt(1) === 58 && resolvedPath.charCodeAt(2) === 92) {
                return `\\\\?\\${resolvedPath}`;
            }
        }
    }
    return path;
}
function dirname(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return path;
                        }
                        if (j !== last) {
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
    return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator);
}
function basename(path, suffix = "") {
    assertPath(path);
    if (path.length === 0) return path;
    if (typeof suffix !== "string") {
        throw new TypeError(`Suffix must be a string. Received ${JSON.stringify(suffix)}`);
    }
    let start = 0;
    if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (isWindowsDeviceRoot(drive)) {
            if (path.charCodeAt(1) === 58) start = 2;
        }
    }
    const lastSegment = lastPathSegment(path, isPathSeparator, start);
    const strippedSegment = stripTrailingSeparators(lastSegment, isPathSeparator);
    return suffix ? stripSuffix(strippedSegment, suffix) : strippedSegment;
}
function extname(path) {
    assertPath(path);
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === 58 && isWindowsDeviceRoot(path.charCodeAt(0))) {
        start = startPart = 2;
    }
    for(let i = path.length - 1; i >= start; --i){
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("\\", pathObject);
}
function parse(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    const len = path.length;
    if (len === 0) return ret;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            rootEnd = j;
                        } else if (j !== last) {
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        if (len === 3) {
                            ret.root = ret.dir = path;
                            ret.base = "\\";
                            return ret;
                        }
                        rootEnd = 3;
                    }
                } else {
                    ret.root = ret.dir = path;
                    return ret;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        ret.base = "\\";
        return ret;
    }
    if (rootEnd > 0) ret.root = path.slice(0, rootEnd);
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= rootEnd; --i){
        code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            ret.base = ret.name = path.slice(startPart, end);
        }
    } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
    }
    ret.base = ret.base || "\\";
    if (startPart > 0 && startPart !== rootEnd) {
        ret.dir = path.slice(0, startPart - 1);
    } else ret.dir = ret.root;
    return ret;
}
function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
    if (url.hostname != "") {
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
function toFileUrl(path) {
    if (!isAbsolute(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const [, hostname, pathname] = path.match(/^(?:[/\\]{2}([^/\\]+)(?=[/\\](?:[^/\\]|$)))?(.*)/);
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(pathname.replace(/%/g, "%25"));
    if (hostname != null && hostname != "localhost") {
        url.hostname = hostname;
        if (!url.hostname) {
            throw new TypeError("Invalid hostname.");
        }
    }
    return url;
}
const mod = {
    sep: sep,
    delimiter: delimiter,
    resolve: resolve,
    normalize: normalize,
    isAbsolute: isAbsolute,
    join: join,
    relative: relative,
    toNamespacedPath: toNamespacedPath,
    dirname: dirname,
    basename: basename,
    extname: extname,
    format: format,
    parse: parse,
    fromFileUrl: fromFileUrl,
    toFileUrl: toFileUrl
};
const sep1 = "/";
const delimiter1 = ":";
function resolve1(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--){
        let path;
        if (i >= 0) path = pathSegments[i];
        else {
            const { Deno: Deno1  } = globalThis;
            if (typeof Deno1?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno1.cwd();
        }
        assertPath(path);
        if (path.length === 0) {
            continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = isPosixPathSeparator(path.charCodeAt(0));
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
        if (resolvedPath.length > 0) return `/${resolvedPath}`;
        else return "/";
    } else if (resolvedPath.length > 0) return resolvedPath;
    else return ".";
}
function normalize1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const isAbsolute = isPosixPathSeparator(path.charCodeAt(0));
    const trailingSeparator = isPosixPathSeparator(path.charCodeAt(path.length - 1));
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute) return `/${path}`;
    return path;
}
function isAbsolute1(path) {
    assertPath(path);
    return path.length > 0 && isPosixPathSeparator(path.charCodeAt(0));
}
function join1(...paths) {
    if (paths.length === 0) return ".";
    let joined;
    for(let i = 0, len = paths.length; i < len; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `/${path}`;
        }
    }
    if (!joined) return ".";
    return normalize1(joined);
}
function relative1(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    from = resolve1(from);
    to = resolve1(to);
    if (from === to) return "";
    let fromStart = 1;
    const fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (!isPosixPathSeparator(from.charCodeAt(fromStart))) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 1;
    const toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (!isPosixPathSeparator(to.charCodeAt(toStart))) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (isPosixPathSeparator(to.charCodeAt(toStart + i))) {
                    return to.slice(toStart + i + 1);
                } else if (i === 0) {
                    return to.slice(toStart + i);
                }
            } else if (fromLen > length) {
                if (isPosixPathSeparator(from.charCodeAt(fromStart + i))) {
                    lastCommonSep = i;
                } else if (i === 0) {
                    lastCommonSep = 0;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (isPosixPathSeparator(fromCode)) lastCommonSep = i;
    }
    let out = "";
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || isPosixPathSeparator(from.charCodeAt(i))) {
            if (out.length === 0) out += "..";
            else out += "/..";
        }
    }
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
    else {
        toStart += lastCommonSep;
        if (isPosixPathSeparator(to.charCodeAt(toStart))) ++toStart;
        return to.slice(toStart);
    }
}
function toNamespacedPath1(path) {
    return path;
}
function dirname1(path) {
    if (path.length === 0) return ".";
    let end = -1;
    let matchedNonSeparator = false;
    for(let i = path.length - 1; i >= 1; --i){
        if (isPosixPathSeparator(path.charCodeAt(i))) {
            if (matchedNonSeparator) {
                end = i;
                break;
            }
        } else {
            matchedNonSeparator = true;
        }
    }
    if (end === -1) {
        return isPosixPathSeparator(path.charCodeAt(0)) ? "/" : ".";
    }
    return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator);
}
function basename1(path, suffix = "") {
    assertPath(path);
    if (path.length === 0) return path;
    if (typeof suffix !== "string") {
        throw new TypeError(`Suffix must be a string. Received ${JSON.stringify(suffix)}`);
    }
    const lastSegment = lastPathSegment(path, isPosixPathSeparator);
    const strippedSegment = stripTrailingSeparators(lastSegment, isPosixPathSeparator);
    return suffix ? stripSuffix(strippedSegment, suffix) : strippedSegment;
}
function extname1(path) {
    assertPath(path);
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for(let i = path.length - 1; i >= 0; --i){
        const code = path.charCodeAt(i);
        if (isPosixPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format1(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("/", pathObject);
}
function parse1(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    if (path.length === 0) return ret;
    const isAbsolute = isPosixPathSeparator(path.charCodeAt(0));
    let start;
    if (isAbsolute) {
        ret.root = "/";
        start = 1;
    } else {
        start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= start; --i){
        const code = path.charCodeAt(i);
        if (isPosixPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            if (startPart === 0 && isAbsolute) {
                ret.base = ret.name = path.slice(1, end);
            } else {
                ret.base = ret.name = path.slice(startPart, end);
            }
        }
        ret.base = ret.base || "/";
    } else {
        if (startPart === 0 && isAbsolute) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
        } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0) {
        ret.dir = stripTrailingSeparators(path.slice(0, startPart - 1), isPosixPathSeparator);
    } else if (isAbsolute) ret.dir = "/";
    return ret;
}
function fromFileUrl1(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
function toFileUrl1(path) {
    if (!isAbsolute1(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(path.replace(/%/g, "%25").replace(/\\/g, "%5C"));
    return url;
}
const mod1 = {
    sep: sep1,
    delimiter: delimiter1,
    resolve: resolve1,
    normalize: normalize1,
    isAbsolute: isAbsolute1,
    join: join1,
    relative: relative1,
    toNamespacedPath: toNamespacedPath1,
    dirname: dirname1,
    basename: basename1,
    extname: extname1,
    format: format1,
    parse: parse1,
    fromFileUrl: fromFileUrl1,
    toFileUrl: toFileUrl1
};
const path = isWindows ? mod : mod1;
const { join: join2 , normalize: normalize2  } = path;
const path1 = isWindows ? mod : mod1;
const { basename: basename2 , delimiter: delimiter2 , dirname: dirname2 , extname: extname2 , format: format2 , fromFileUrl: fromFileUrl2 , isAbsolute: isAbsolute2 , join: join3 , normalize: normalize3 , parse: parse2 , relative: relative2 , resolve: resolve2 , toFileUrl: toFileUrl2 , toNamespacedPath: toNamespacedPath2  } = path1;
path1.sep;
function generateCartridgeContent({ lua ="" , gff , gfx , music , map , sfx  }) {
    return [
        "pico-8 cartridge // http://www.pico-8.com",
        "version 38",
        `__lua__\n${lua}`,
        gfx && `__gfx__\n${gfx}`,
        gff && `__gff__\n${gff}`,
        map && `__map__\n${map}`,
        sfx && `__sfx__\n${sfx}`,
        music && `__music__\n${music}`,
        "\n"
    ].join("\n");
}
const decoder = new TextDecoder("utf-8");
function getCartridgeSections(cartridgePath) {
    const contents = decoder.decode(Deno.readFileSync(resolve2(cartridgePath)));
    const cartridgeSections = {};
    let content, section;
    const regex = /__([a-z]+)__\n([\s\S]*?)(?=\n__\w+__\n|\n(\n|$))/g;
    while([, section, content] = regex.exec(contents) || ""){
        cartridgeSections[section] = content;
    }
    return cartridgeSections;
}
const tokens = [
    "\"[^\"]*\"",
    "\\d+\\.\\d+",
    "\\w+",
    "\\d+",
    "!=",
    "==",
    "\\+=",
    "-=",
    "<=",
    ">=",
    "\\.\\.",
    "<",
    ">",
    "\\+",
    "-",
    "\\/",
    "\\*",
    "=",
    "\\%",
    "\\(",
    "\\[",
    "\\{"
].join("|");
new RegExp(`(${tokens})`, "gi");
const ICONS = {
    info: "\x1b[34mΓä╣",
    success: "\x1b[32mΓ£ö",
    warning: "\x1b[33mΓÜá",
    error: "\x1b[31mΓ£û"
};
function logToFile(content, filePath) {
    Deno.writeTextFile(resolve2(filePath), content);
}
function logSuccess(content) {
    logToConsole(ICONS.success, content);
}
function logWarning(content) {
    logToConsole(ICONS.warning, content);
}
function logToConsole(icon, content) {
    console.log(`${icon} ${content}\x1b[0m`);
}
const importMeta = {
    url: "https://deno.land/x/lz4@v0.1.2/wasm.js",
    main: false
};
const source = Uint8Array.from(atob("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QcCjwAAgAjYCAEHIo8AAIAMgBmoiADYCACAAIAJBAXI2AgQgASADaiACNgIAIANBBGohACAGQQNyCyEGIAAgBjYCAAwHC0Hso8AAKAIAIgBBACAAIANNG0UEQEHso8AAIAM2AgALQfCjwABB/x82AgBB3KPAACAFNgIAQdijwAAgAzYCAEHEoMAAQbigwAA2AgBBzKDAAEHAoMAANgIAQcCgwABBuKDAADYCAEHUoMAAQcigwAA2AgBByKDAAEHAoMAANgIAQdygwABB0KDAADYCAEHQoMAAQcigwAA2AgBB5KDAAEHYoMAANgIAQdigwABB0KDAADYCAEHsoMAAQeCgwAA2AgBB4KDAAEHYoMAANgIAQfSgwABB6KDAADYCAEHooMAAQeCgwAA2AgBB/KDAAEHwoMAANgIAQfCgwABB6KDAADYCAEHko8AAQQA2AgBBhKHAAEH4oMAANgIAQfigwABB8KDAADYCAEGAocAAQfigwAA2AgBBjKHAAEGAocAANgIAQYihwABBgKHAADYCAEGUocAAQYihwAA2AgBBkKHAAEGIocAANgIAQZyhwABBkKHAADYCAEGYocAAQZChwAA2AgBBpKHAAEGYocAANgIAQaChwABBmKHAADYCAEGsocAAQaChwAA2AgBBqKHAAEGgocAANgIAQbShwABBqKHAADYCAEGwocAAQaihwAA2AgBBvKHAAEGwocAANgIAQbihwABBsKHAADYCAEHEocAAQbihwAA2AgBBzKHAAEHAocAANgIAQcChwABBuKHAADYCAEHUocAAQcihwAA2AgBByKHAAEHAocAANgIAQdyhwABB0KHAADYCAEHQocAAQcihwAA2AgBB5KHAAEHYocAANgIAQdihwABB0KHAADYCAEHsocAAQeChwAA2AgBB4KHAAEHYocAANgIAQfShwABB6KHAADYCAEHoocAAQeChwAA2AgBB/KHAAEHwocAANgIAQfChwABB6KHAADYCAEGEosAAQfihwAA2AgBB+KHAAEHwocAANgIAQYyiwABBgKLAADYCAEGAosAAQfihwAA2AgBBlKLAAEGIosAANgIAQYiiwABBgKLAADYCAEGcosAAQZCiwAA2AgBBkKLAAEGIosAANgIAQaSiwABBmKLAADYCAEGYosAAQZCiwAA2AgBBrKLAAEGgosAANgIAQaCiwABBmKLAADYCAEG0osAAQaiiwAA2AgBBqKLAAEGgosAANgIAQbyiwABBsKLAADYCAEGwosAAQaiiwAA2AgBBzKPAACADNgIAQbiiwABBsKLAADYCAEHEo8AAIAVBWGoiADYCACADIABBAXI2AgQgACADakEoNgIEQeijwABBgICAATYCAAwCCyAAQQxqKAIAIAMgBE1yIAEgBEtyDQAgACACIAVqNgIEQcyjwABBzKPAACgCACIDQQ9qQXhxIgFBeGo2AgBBxKPAAEHEo8AAKAIAIAVqIgIgAyABa2pBCGoiADYCACABQXxqIABBAXI2AgAgAiADakEoNgIEQeijwABBgICAATYCAAwBC0Hso8AAQeyjwAAoAgAiACADIAAgA0kbNgIAIAMgBWohAUHYo8AAIQACQANAIAEgACgCAEcEQCAAKAIIIgANAQwCCwsgAEEMaigCAA0AIAAgAzYCACAAIAAoAgQgBWo2AgQgAyAGQQNyNgIEIAMgBmohBCABIANrIAZrIQYCQAJAIAFBzKPAACgCAEcEQEHIo8AAKAIAIAFGDQEgAUEEaigCACIAQQNxQQFGBEAgASAAQXhxIgAQDiAAIAZqIQYgACABaiEBCyABIAEoAgRBfnE2AgQgBCAGQQFyNgIEIAQgBmogBjYCACAGQYACTwRAIARCADcCECAEAn9BACAGQQh2IgBFDQAaQR8gBkH///8HSw0AGiAGQQYgAGciAGtBH3F2QQFxIABBAXRrQT5qCyIFNgIcIAVBAnRBwKLAAGohAQJAAkACQAJAQbSgwAAoAgAiAkEBIAVBH3F0IgBxBEAgASgCACICQQRqKAIAQXhxIAZHDQEgAiEFDAILQbSgwAAgACACcjYCACABIAQ2AgAgBCABNgIYDAMLIAZBAEEZIAVBAXZrQR9xIAVBH0YbdCEBA0AgAiABQR12QQRxakEQaiIAKAIAIgVFDQIgAUEBdCEBIAUiAkEEaigCAEF4cSAGRw0ACwsgBSgCCCIAIAQ2AgwgBSAENgIIIARBADYCGCAEIAU2AgwgBCAANgIIDAULIAAgBDYCACAEIAI2AhgLIAQgBDYCDCAEIAQ2AggMAwsgBkEDdiICQQN0QbigwABqIQACf0GwoMAAKAIAIgFBASACQR9xdCICcQRAIAAoAggMAQtBsKDAACABIAJyNgIAIAALIQUgACAENgIIIAUgBDYCDCAEIAA2AgwgBCAFNgIIDAILQcyjwAAgBDYCAEHEo8AAQcSjwAAoAgAgBmoiADYCACAEIABBAXI2AgQMAQtByKPAACAENgIAQcCjwABBwKPAACgCACAGaiIANgIAIAQgAEEBcjYCBCAAIARqIAA2AgALDAULQdijwAAhAANAAkAgACgCACICIARNBEAgAiAAKAIEaiICIARLDQELIAAoAgghAAwBCwtBzKPAACADNgIAQcSjwAAgBUFYaiIANgIAIAMgAEEBcjYCBCAAIANqQSg2AgRB6KPAAEGAgIABNgIAIAQgAkFgakF4cUF4aiIAIAAgBEEQakkbIgFBGzYCBEHYo8AAKQIAIQkgAUEQakHgo8AAKQIANwIAIAEgCTcCCEHco8AAIAU2AgBB2KPAACADNgIAQeCjwAAgAUEIajYCAEHko8AAQQA2AgAgAUEcaiEAA0AgAEEHNgIAIAIgAEEEaiIASw0ACyABIARGDQAgASABKAIEQX5xNgIEIAQgASAEayIFQQFyNgIEIAEgBTYCACAFQYACTwRAIARCADcCECAEQRxqAn9BACAFQQh2IgJFDQAaQR8gBUH///8HSw0AGiAFQQYgAmciAGtBH3F2QQFxIABBAXRrQT5qCyIANgIAIABBAnRBwKLAAGohAwJAAkACQAJAQbSgwAAoAgAiAUEBIABBH3F0IgJxBEAgAygCACICQQRqKAIAQXhxIAVHDQEgAiEADAILQbSgwAAgASACcjYCACADIAQ2AgAgBEEYaiADNgIADAMLIAVBAEEZIABBAXZrQR9xIABBH0YbdCEBA0AgAiABQR12QQRxakEQaiIDKAIAIgBFDQIgAUEBdCEBIAAhAiAAQQRqKAIAQXhxIAVHDQALCyAAKAIIIgIgBDYCDCAAIAQ2AgggBEEYakEANgIAIAQgADYCDCAEIAI2AggMAwsgAyAENgIAIARBGGogAjYCAAsgBCAENgIMIAQgBDYCCAwBCyAFQQN2IgJBA3RBuKDAAGohAAJ/QbCgwAAoAgAiAUEBIAJBH3F0IgJxBEAgACgCCAwBC0GwoMAAIAEgAnI2AgAgAAshASAAIAQ2AgggASAENgIMIAQgADYCDCAEIAE2AggLQQAhBUHEo8AAKAIAIgAgBk0NAgwECyABIAc2AhggAygCECIABEAgASAANgIQIAAgATYCGAsgA0EUaigCACIARQ0AIAFBFGogADYCACAAIAE2AhgLAkAgBUEQTwRAIAMgBkEDcjYCBCADIAZqIgQgBUEBcjYCBCAEIAVqIAU2AgBBwKPAACgCACIABEAgAEEDdiICQQN0QbigwABqIQBByKPAACgCACEHAn9BsKDAACgCACIBQQEgAkEfcXQiAnEEQCAAKAIIDAELQbCgwAAgASACcjYCACAACyECIAAgBzYCCCACIAc2AgwgByAANgIMIAcgAjYCCAtByKPAACAENgIAQcCjwAAgBTYCAAwBCyADIAUgBmoiAEEDcjYCBCAAIANqIgAgACgCBEEBcjYCBAsMAQsgBQ8LIANBCGoPC0HEo8AAIAAgBmsiAjYCAEHMo8AAQcyjwAAoAgAiASAGaiIANgIAIAAgAkEBcjYCBCABIAZBA3I2AgQgAUEIaguTCAEGfyMAQfAAayIFJAAgBSADNgIMIAUgAjYCCEEBIQkgASEHAkAgAUGBAkkNAEEAIAFrIQhBgAIhBgNAAkAgBiABTw0AIAAgBmosAABBv39MDQBBACEJIAYhBwwCCyAGQX9qIQdBACEJIAZBAUYNASAGIAhqIAchBkEBRw0ACwsgBSAHNgIUIAUgADYCECAFQQBBBSAJGzYCHCAFQeSewABBgITAACAJGzYCGAJAAkACQAJAIAIgAUsiBiADIAFLckUEQCACIANLDQECQCACRSABIAJGckUEQCABIAJNDQEgACACaiwAAEFASA0BCyADIQILIAUgAjYCICACRSABIAJGcg0CIAFBAWohAwNAIAIgAUkEQCAAIAJqLAAAQUBODQQLIAJBf2ohBiACQQFGDQQgAiADRiAGIQJFDQALDAMLIAUgAiADIAYbNgIoIAVBxABqQQM2AgAgBUHcAGpBBDYCACAFQdQAakEENgIAIAVCAzcCNCAFQYiEwAA2AjAgBUECNgJMIAUgBUHIAGo2AkAgBSAFQRhqNgJYIAUgBUEQajYCUCAFIAVBKGo2AkgMAwsgBUHkAGpBBDYCACAFQdwAakEENgIAIAVB1ABqQQI2AgAgBUHEAGpBBDYCACAFQgQ3AjQgBUGghMAANgIwIAVBAjYCTCAFIAVByABqNgJAIAUgBUEYajYCYCAFIAVBEGo2AlggBSAFQQxqNgJQIAUgBUEIajYCSAwCCyACIQYLAkAgASAGRg0AQQEhBwJAAkACQCAAIAZqIggsAAAiAkF/TARAQQAhCSAAIAFqIgMhASADIAhBAWpHBEAgCC0AAUE/cSEJIAhBAmohAQsgAkEfcSEIIAJB/wFxQd8BSw0BIAkgCEEGdHIhAQwCCyAFIAJB/wFxNgIkIAVBKGohAgwCC0EAIQAgAyEHIAEgA0cEfyABQQFqIQcgAS0AAEE/cQUgAAsgCUEGdHIhACACQf8BcUHwAUkEQCAAIAhBDHRyIQEMAQtBACECIAMgB0cEfyAHLQAAQT9xBSACCyAIQRJ0QYCA8ABxIABBBnRyciIBQYCAxABGDQILIAUgATYCJEEBIQcgBUEoaiECIAFBgAFJDQBBAiEHIAFBgBBJDQBBA0EEIAFBgIAESRshBwsgBSAGNgIoIAUgBiAHajYCLCAFQcQAakEFNgIAIAVB7ABqQQQ2AgAgBUHkAGpBBDYCACAFQdwAakEFNgIAIAVB1ABqQQY2AgAgBUIFNwI0IAVBwITAADYCMCAFIAI2AlggBUECNgJMIAUgBUHIAGo2AkAgBSAFQRhqNgJoIAUgBUEQajYCYCAFIAVBJGo2AlAgBSAFQSBqNgJIDAELQbeewABBKyAEECcACyAFQTBqIAQQMAAL2wgBBX8gAEF4aiIBIABBfGooAgAiA0F4cSIAaiECAkACQAJAAkAgA0EBcQ0AIANBA3FFDQEgASgCACIDIABqIQAgASADayIBQcijwAAoAgBGBEAgAigCBEEDcUEDRw0BQcCjwAAgADYCACACIAIoAgRBfnE2AgQgASAAQQFyNgIEIAAgAWogADYCAA8LIAEgAxAOCwJAIAJBBGoiBCgCACIDQQJxBEAgBCADQX5xNgIAIAEgAEEBcjYCBCAAIAFqIAA2AgAMAQsCQCACQcyjwAAoAgBHBEBByKPAACgCACACRg0BIAIgA0F4cSICEA4gASAAIAJqIgBBAXI2AgQgACABaiAANgIAIAFByKPAACgCAEcNAkHAo8AAIAA2AgAPC0HMo8AAIAE2AgBBxKPAAEHEo8AAKAIAIABqIgA2AgAgASAAQQFyNgIEQcijwAAoAgAgAUYEQEHAo8AAQQA2AgBByKPAAEEANgIAC0Hoo8AAKAIAIgIgAE8NAkHMo8AAKAIAIgBFDQICQEHEo8AAKAIAIgNBKUkNAEHYo8AAIQEDQCABKAIAIgQgAE0EQCAEIAEoAgRqIABLDQILIAEoAggiAQ0ACwtB8KPAAAJ/Qf8fQeCjwAAoAgAiAEUNABpBACEBA0AgAUEBaiEBIAAoAggiAA0ACyABQf8fIAFB/x9LGws2AgAgAyACTQ0CQeijwABBfzYCAA8LQcijwAAgATYCAEHAo8AAQcCjwAAoAgAgAGoiADYCACABIABBAXI2AgQgACABaiAANgIADwsgAEGAAkkNASABQgA3AhAgAUEcagJ/QQAgAEEIdiIDRQ0AGkEfIABB////B0sNABogAEEGIANnIgJrQR9xdkEBcSACQQF0a0E+agsiAjYCACACQQJ0QcCiwABqIQMCQAJAAkACQAJAQbSgwAAoAgAiBEEBIAJBH3F0IgVxBEAgAygCACIDQQRqKAIAQXhxIABHDQEgAyECDAILQbSgwAAgBCAFcjYCACADIAE2AgAMAwsgAEEAQRkgAkEBdmtBH3EgAkEfRht0IQQDQCADIARBHXZBBHFqQRBqIgUoAgAiAkUNAiAEQQF0IQQgAiEDIAJBBGooAgBBeHEgAEcNAAsLIAIoAggiACABNgIMIAIgATYCCCABQRhqQQA2AgAgASACNgIMIAEgADYCCAwCCyAFIAE2AgALIAFBGGogAzYCACABIAE2AgwgASABNgIIC0Hwo8AAQfCjwAAoAgBBf2oiADYCACAARQ0CCw8LIABBA3YiAkEDdEG4oMAAaiEAAn9BsKDAACgCACIDQQEgAkEfcXQiAnEEQCAAKAIIDAELQbCgwAAgAiADcjYCACAACyECIAAgATYCCCACIAE2AgwgASAANgIMIAEgAjYCCA8LQfCjwAACf0H/H0Hgo8AAKAIAIgBFDQAaQQAhAQNAIAFBAWohASAAKAIIIgANAAsgAUH/HyABQf8fSxsLNgIAC9QIAgV/AX5BASEFIAEoAhhBJyABQRxqKAIAKAIQEQAARQRAQQIhBAJAAkACQCAAKAIAIgNBd2oiAEEeSwRAIANB3ABHDQEMAgtB9AAhAgJAAkAgAEEBaw4eAQICAAICAgICAgICAgICAgICAgICAgICAwICAgIDBAtB8gAhAgwDC0HuACECDAILAkACfgJAAkACQAJAAkACQEEAQQ8gA0GkmgRJGyIAIABBCGoiACAAQQJ0QZiRwABqKAIAQQt0IANBC3QiAEsbIgIgAkEEaiICIAJBAnRBmJHAAGooAgBBC3QgAEsbIgIgAkECaiICIAJBAnRBmJHAAGooAgBBC3QgAEsbIgIgAkEBaiICIAJBAnRBmJHAAGooAgBBC3QgAEsbIgJBAnRBmJHAAGooAgBBC3QiBCAARiAEIABJaiACaiIEQR5NBEAgBEECdCEGQbEFIQACQCAEQR5GDQAgBkGckcAAaiICRQ0AIAIoAgBBFXYhAAtBACECIARBf2oiBSAETQRAIAVBH08NBiAFQQJ0QZiRwABqKAIAQf///wBxIQILAkAgACAGQZiRwABqKAIAQRV2IgRBAWpGDQAgAyACayECIABBf2ohBUEAIQADQCAEQbAFSw0DIAAgBEGkksAAai0AAGoiACACSw0BIAUgBEEBaiIERw0ACwsgBEEBcQ0GIANBgIAESQ0CIANBgIAISQ0DIANBkPxHakGQ/AtJIANBtdlzakG12ytJciADQeKLdGpB4gtJIANBn6h0akGfGElyciADQf7//wBxQZ7wCkYgA0He4nRqQQ5JciADQaKydWpBIklycg0EIANBy5F1akEKSw0IDAQLIARBH0HYl8AAEBwACyAEQbEFQeiXwAAQHAALIANBkIbAAEEpQeKGwABBogJBhInAAEG1AhAPRQ0BDAULIANBuYvAAEEmQYWMwABBrwFBtI3AAEGjAxAPDQQLIANBAXJnQQJ2QQdzrUKAgICA0ACEDAILIAVBH0GUksAAEBwACyADQQFyZ0ECdkEHc61CgICAgNAAhAshB0EDIQQMAQtBASEECyADIQILA0AgBCEDQdwAIQBBASEFQQEhBAJAAn4CQAJAAkACQCADQQFrDgMBBQACCwJAAkACQAJAIAdCIIinQf8BcUEBaw4FAwIBAAYFC0H1ACEAIAdC/////49gg0KAgICAMIQMBgtB+wAhACAHQv////+PYINCgICAgCCEDAULIAIgB6ciA0ECdEEccXZBD3EiAEEwciAAQdcAaiAAQQpJGyEAIAdCf3xC/////w+DIAdCgICAgHCDhCADDQQaIAdC/////49gg0KAgICAEIQMBAtB/QAhACAHQv////+PYIMMAwtBACEEIAIhAAwDCyABKAIYQScgASgCHCgCEBEAAA8LIAdC/////49gg0KAgICAwACECyEHQQMhBAsgASgCGCAAIAEoAhwo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dCADakHQAGooAgAiB0F/Rg0BIANBQGsgBxAjIANBQGsQPEcNASABIAdrIgZBgIAETw0BIANBGGogAygCQCIFIAQgCkHMnMAAEC0gAygCGCEJIAMoAhwhASADQRBqIAUgBCAHQQRqQdycwAAQLSADKAIUIgUgASABIAVLGyEFQQAhASADKAIQIQQDQCABIAVPDQQgASAJai0AACABIARqLQAARw0EIAFBAWohAQwACwALIAZBgCBB7JzAABAcAAsgA0FAa0EBEBsEQCACQQFqIQIgAygCRCEEIAMoAkwhAQwBCwsgAkEEdEFwIAJBD0kbIQpBACEBIAUhBkEAIQUMAQsgA0FAayABQQRqEBsaIAJBBHRBcCACQQ9JGyEKIAZBgP4DcUEIdiEJQQEhBUEPIAFBDksNARoLIAELIQQgAygCSCIHIAQgCnIQKiACQQ9PBEAgA0FAayACQXFqEC8LIANBCGogCCACIAhqIAMoAkAgAygCRCIEQfycwAAQKCAHIAMoAgggAygCDBAxIAUEQCAHIAYQKiAHIAkQKiABQQ9PBEAgA0FAayABQXFqEC8LIAMoAkwhCCAGIQUMAQsLIANB2IABaiIBIANBOGooAgA2AgAgAyADKQMwNwPQgAEgA0EoahA0IANByABqIAEoAgA2AgAgAyADKQPQgAE3A0AgAyADQUBrECYgACADKQMANwIAIANB0IACaiQAC+MFAgN/AX4jAEHgAGsiAyQAIANBEGogASACECkgAyADKAIUIgE2AhwgAyADKAIQIgI2AhggA0EwakGAIBAhIANBADoATCADIAE2AkQgAyACNgJAIAMgA0EwajYCSANAAkACQAJAAkACQAJAAkACQAJAIAFFDQAgA0HQAGogA0FAa0EBEBggAy0AUEEBRg0BIAMoAlgEQCADIAMoAlQtAAAiAToATCABQQR2IgFBD0YEQCADQdAAaiADQUBrEBYgAykDUCIGp0H/AXFBAUYNBCAGQiCIp0EPaiEBCyADKAJIIANB0ABqIANBQGsgARAYIAMtAFBBAUYEQCADLQBRQQBHIQEMCQsgA0EIaiADKAJUIAMoAlgiASABQbiawAAQLiADKAIIIAMoAgwQMSADKAJERQ0BIANB0ABqIANBQGtBAhAYIAMtAFBBAUYNBSADKAJYQQJHDQQgAygCVC8AACEBIAMtAExB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QQBBAEGcnMAAEBwAC30BAX8jAEEQayICJAACQCAALQAAQQFGBEAgAiABKAIYQZCewABBGiABQRxqKAIAKAIMEQEAIgA6AAgMAQsgAiABKAIYQaqewABBDSABQRxqKAIAKAIMEQEAIgA6AAgLIAIgATYCACACQQA6AAkgAkEANgIEIAJBEGokACAAC4EBAgJ/An4jAEEQayIDJAAgAAJ/IAEoAgQiBCACTwRAIANBCGogASgCACAEIAJBrJzAABAuIAMpAwghBSADIAEoAgAgASgCBCACQbycwAAQLSADKQMAIQYgAEEEaiAFNwIAIAEgBjcCAEEADAELIABBADoAAUEBCzoAACADQRBqJAALdwEDfyMAQSBrIgIkAAJAIAAoAgAgARARRQRAIAFBHGooAgAhAyABKAIYIAJBHGpBADYCACACQeSewAA2AhggAkIBNwIMIAJBqIXAADYCCCADIAJBCGoQBkUNAQsgAkEgaiQAQQEPCyAAKAIEIAEQESACQSBqJAALgAEBAX8jAEFAaiIDJAAgA0ErNgIMIANByJrAADYCCCADIAE2AhQgAyAANgIQIANBLGpBAjYCACADQTxqQQM2AgAgA0ICNwIcIANB7JjAADYCGCADQQQ2AjQgAyADQTBqNgIoIAMgA0EQajYCOCADIANBCGo2AjAgA0EYaiACEDAAC3ABAn8CQANAIAEEQCAAIAAoAgwiAkEEaiAAKAIESQR/IAAQMiIDQf8fSw0DIAAgA0ECdGpBEGogAjYCACAAKAIMBSACC0EBajYCDCABQX9qIQEMAQsLIAAoAgwgACgCBE0PCyADQYAgQfCdwAAQHAALbAEBfyMAQTBrIgMkACADIAE2AgQgAyAANgIAIANBHGpBAjYCACADQSxqQQI2AgAgA0ICNwIMIANB6IDAADYCCCADQQI2AiQgAyADQSBqNgIYIAMgAzYCKCADIANBBGo2AiAgA0EIaiACEDAAC2wBAX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQRxqQQI2AgAgA0EsakECNgIAIANCAjcCDCADQYSDwAA2AgggA0ECNgIkIAMgA0EgajYCGCADIANBBGo2AiggAyADNgIgIANBCGogAhAwAAtsAQF/IwBBMGsiAyQAIAMgATYCBCADIAA2AgAgA0EcakECNgIAIANBLGpBAjYCACADQgI3AgwgA0G8g8AANgIIIANBAjYCJCADIANBIGo2AhggAyADQQRqNgIoIAMgAzYCICADQQhqIAIQMAALWQEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakGImsAAIAJBCGoQBiACQSBqJAALVgEBfyMAQSBrIgIkACACIAA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakGImsAAIAJBCGoQBiACQSBqJAALaQECfyMAQRBrIgIkAAJAIAFBf0oEQCACQQhqIAEQMyACKAIIIgNFDQEgAigCDCEBIABBADYCCCAAIAM2AgAgACABNgIEIAJBEGokAA8LEDgACyABQQFBhKTAACgCACIAQQEgABsRAgAAC2oBAn9BASEAAkACQEH4o8AAKAIAQQFHBEBB+KPAAEKBgICAEDcDAAwBC0H8o8AAQfyjwAAoAgBBAWoiADYCACAAQQJLDQELQYCkwAAoAgAiAUF/TA0AQYCkwAAgATYCACAAQQFLDQAACwALUwEBfyMAQRBrIgIkACACIAEgAUEEaiAAKAIAIAAoAgRBgJ7AABAoIAIoAgRBBEcEQCACQQhqQfSawABBgJ7AABAaAAsgAigCACgAACACQRBqJAALQwEDfwJAIAJFDQADQCAALQAAIgQgAS0AACIFRgRAIABBAWohACABQQFqIQEgAkF/aiICDQEMAgsLIAQgBWshAwsgAwtKAAJ/IAFBgIDEAEcEQEEBIAAoAhggASAAQRxqKAIAKAIQEQAADQEaCyACRQRAQQAPCyAAKAIYIAIgAyAAQRxqKAIAKAIMEQEACwtEAQF/IwBBIGsiAiQAIAJBGGogAUEIaigCADYCACACIAEpAgA3AxAgAkEIaiACQRBqEBUgACACKQMINwIAIAJBIGokAAtHAQF/IwBBIGsiAyQAIANBFGpBADYCACADQeSewAA2AhAgA0IBNwIEIAMgATYCHCADIAA2AhggAyADQRhqNgIAIAMgAhAwAAs6AAJAIAIgAU8EQCAEIAJPDQEgAiAEIAUQHQALIAEgAiAFEB4ACyAAIAIgAWs2AgQgACABIANqNgIACz8BAX8jAEEgayIDJAAgAyACNgIYIAMg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XHNyY1xnaXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjNcbHo0LWNvbXByZXNzaW9uLTAuNy4wXHNyY1xjb21wcmVzcy5yc4wOEABkAAAAWAAAAA0AAACMDhAAZAAAAHYAAAAcAAAASW52YWxpZERlZHVwbGljYXRpb25PZmZzZXRVbmV4cGVjdGVkRW5kY2FsbGVkIGBPcHRpb246OnVud3JhcCgpYCBvbiBhIGBOb25lYCB2YWx1ZQAAdA8QABcAAACiAQAADwAAAHNyYy9saWJzdGQvcGFuaWNraW5nLnJzVHJpZWQgdG8gc2hyaW5rIHRvIGEgbGFyZ2VyIGNhcGFjaXR5AMAPEABuAAAAIgAAAAkAAABDOlxVc2Vyc1xlbGlhc1wucnVzdHVwXHRvb2xjaGFpbnNcc3RhYmxlLXg4Nl82NC1wYy13aW5kb3dzLW1zdmNcbGliL3J1c3RsaWIvc3JjL3J1c3Rcc3JjL2xpYmNvcmUvbWFjcm9zL21vZC5ycwB7CXByb2R1Y2VycwIIbGFuZ3VhZ2UBBFJ1c3QADHByb2Nlc3NlZC1ieQMFcnVzdGMdMS40NC4xIChjNzA4N2ZlMDAgMjAyMC0wNi0xNykGd2FscnVzBjAuMTcuMAx3YXNtLWJpbmRnZW4SMC4yLjY0ICgzMWMyZDZmYmUp"), (A)=>A.charCodeAt(0));
let A, I = null;
function g() {
    return null !== I && I.buffer === A.memory.buffer || (I = new Uint8Array(A.memory.buffer)), I;
}
let B = 0;
function Q(A, I) {
    const Q = I(1 * A.length);
    return g().set(A, Q / 1), B = A.length, Q;
}
let C = null;
function E() {
    return null !== C && C.buffer === A.memory.buffer || (C = new Int32Array(A.memory.buffer)), C;
}
function D(A, I) {
    return g().subarray(A / 1, A / 1 + I);
}
function lz4_decompress(I) {
    var g = Q(I, A.__wbindgen_malloc), C = B;
    A.lz4_decompress(8, g, C);
    var w = E()[2], o = E()[3], i = D(w, o).slice();
    return A.__wbindgen_free(w, 1 * o), i;
}
async function w(A, I) {
    if ("function" == typeof Response && A instanceof Response) {
        if ("function" == typeof WebAssembly.instantiateStreaming) try {
            return await WebAssembly.instantiateStreaming(A, I);
        } catch (I) {
            if ("application/wasm" == A.headers.get("Content-Type")) throw I;
            console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", I);
        }
        const g = await A.arrayBuffer();
        return await WebAssembly.instantiate(g, I);
    }
    {
        const g = await WebAssembly.instantiate(A, I);
        return g instanceof WebAssembly.Instance ? {
            instance: g,
            module: A
        } : g;
    }
}
async function o(I) {
    void 0 === I && (I = importMeta.url.replace(/\.js$/, "_bg.wasm"));
    ("string" == typeof I || "function" == typeof Request && I instanceof Request || "function" == typeof URL && I instanceof URL) && (I = fetch(I));
    const { instance: g , module: B  } = await w(await I, {});
    return A = g.exports, o.__wbindgen_wasm_module = B, A;
}
await o(source);
function decompress(input) {
    return lz4_decompress(input);
}
const importMeta1 = {
    url: "https://deno.land/x/pngs@0.1.1/wasm.js",
    main: false
};
const source1 = decompress(Uint8Array.from(atob("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AjoBgdCkAWokAA8LQgsAegIQQeMKAAkAYKlpAnt/B/MvY+AAayILJHcIBgIA8RYgAy0Aww0NACADQe8HaiE3IANB0AVqISggA0HWDGohOCADQZAFYy8wQdAAzi/xEQNBQGshFSADQcgAaiENIANB2AxqITUgA0GcCGohNiADIjCgECADQQhqISQgA5kQ8AMhCSADQaANaiExIANBlA1qITJWAPAmCGohGyADQTBqISwgA0E8aiEOIARB+wFxIjlBAUchOiADQThqIR8gA0GYCGohEiADQSJqISBBAGAIaiElIAQ9ASAiOysA8Ac8IANB8AdqIh1BGGohPSADQZINaiE+YwDwbQ1qIT8gA0GODWohQCADQYwNaiFBIANBig1qIUIgA0GIDWohQyADQYYNaiFEIANBhA1qIUUgA0GCDWohRiADQYANaiFHIANB/gxqIUggA0H8DGohSSADQfoMaiFKIANB+AxqIUsgA0H2DGohTCADQfQMaiFNIANB8gxqIU6VAPBdDGohTyADQe4MaiFQIANB7AxqIVEgA0HqDGohUiADQegMaiFTIANB5gxqIVQgA0HkDGohVSADQeIMaiFWIANB4AxqIVcgA0HeDGohWCADQdwMaiFZIANB2gxqIVogA0HRBWohWyADQY8IaiFc6ADACGohXSADQY0IaiFe8ADACGohXyADQYsIaiFg+ADACGohYSADQYkIaiFiAAHACGohYyADQYcIaiFkCAHwPQhqIWUgA0GFCGohZiADQYQIaiFnIANBgwhqIWggA0GCCGohaSADQYEIaiFqIANBgAhqIWsgA0H/B2ohbCADQf4HaiFtIANB/QdqIW4wAfANB2ohbyADQfsHaiFwIANB+gdqIXEgA0H5B2ohckABwAdqIXMgA0H3B2ohdEgBwAdqIXUgA0H1B2ohdlABwAdqIXcgA0HzB2oheFgB8AUHaiF5IANB8QdqIXogA0GkDWohMy4sCgIAcCAJKAIAIgYTLCFNBOECMCUNCgcA8AMnDQFBASEhDAgLIAMoAqwNRQ10DPABAygCuA0iAUkNAiADQawNahEAQDwgAWpgFCBrEN0JMAUgA38DILgNCAAwOgDDCAAQxF4pAJMD8gAuBEAgACAuNgIEDAwLQRXDDuIBRQ0DIAFBDWpB6ezBAJYOAc0FKEHkEAAV3A0AAbEDsJcBIgJF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DQZBrIPCFwJwQYCAfHEgBMYKABMAICgCtQAAMgEQsCEAAAUAAFoAACQEUAEgAEsbGgAUqBUAAJEIYrSDwgAhAGsDIQAiTgNgBCIDaiAHpwoAtwEBSwMiDASNAQDnAQCxBgMoAkEPTQRAGAABQwEB1wABCgAAbgAFXgIxAWoin2AD5wIABwIAKQABzgEBPQACggIQBDgAAFEHASYAATgAASMAAB4AAkwAAKIIAKgEIkHIigACGANAIAdNG3ILABUAAOsGQAALQcyIACD/H2AAELgWAABbAAHpAAEgACBBoKQBAL0CAA0AEKgNAABRAwANAAAIAAUaABCwDQATpA0AAAgAAR8AAA0AELgNABOsDQAACAABHwAADQAQwA0AE7QNAAAIAAEfAAANABDIDQATvA0AAAgAAR8AAA0AENANABPEDQAACAABHwAADQAQ2A0AE8wNAAAIAAEfAAANABDA4gABCgAQ4BcAE9QXAAAIAAEpAAANABDcDQAAEgAADQAQ6A0AABIAAA0AGOQNABDwDQAAEgAADQAY7A0AEPgNAAASAAANABj0DQAygIHCEgAADQAQ/BoABA0AEIgaAAASAAANABiEDQAQkA0AABIAAA0AGIwNABCYDQAAEgAADQAYlA0AEKANAAASAAANABCoDQATnA0AAAgABRoAELANABOkDQAACAABHwAADQAQuA0AE6wNAAAIAAEfAAANABDADQATtA0AAAgAAR8AAA0AEMgNABO8DQAACAABHwAADQAQ0A0AE8QNAAAIAAEfAAANABDYDQATzA0AAAgAAR8AAA0AEOANABPUDQAACAABHwAADQAQ6A0AE9wNAAAIAAEfAAANABDwDQAT5A0AAAgAAR8AAA0AEPgNABPsDQAACAABHwAADQBjgILCAEH0DQAACAABHwAADQAQiBoAE/wNAAAIAAEfAAANABCQGgAihIINAAAIAAEfAAANABCYDQATjBoAAAgAAR8AAA0AAD0EAkcDEJQXAAAcAAANAADDBEIgBEFYfQQgIAdnCQC0A8AgACAHakEoNgIEQcS0AjCAgIAsBQE2BQCWBxAFaAegBUEBS3IgByABTawIIEtyPokAwQkgBGo4AAByAAEFABEo8wMQD48IVCIBQXhqeAABBQAwKAIAsAcQAjkEIGtqGAcA9gMgIAHcRBEEjAAALAQfAowAASEC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"), (A)=>A.charCodeAt(0)));
let B1, Q1 = new TextDecoder("utf-8", {
    ignoreBOM: !0,
    fatal: !0
});
Q1.decode();
let E1 = null;
function g1() {
    return null !== E1 && E1.buffer === B1.memory.buffer || (E1 = new Uint8Array(B1.memory.buffer)), E1;
}
function I1(A, B) {
    return Q1.decode(g1().subarray(A, A + B));
}
const C1 = new Array(32).fill(void 0);
C1.push(void 0, null, !0, !1);
let w1 = C1.length;
function D1(A) {
    w1 === C1.length && C1.push(C1.length + 1);
    const B = w1;
    return w1 = C1[B], C1[B] = A, B;
}
function F(A) {
    return C1[A];
}
function M(A) {
    A < 36 || (C1[A] = w1, w1 = A);
}
function G(A) {
    const B = F(A);
    return M(A), B;
}
let R = 0;
function U(A, B) {
    const Q = B(1 * A.length);
    return g1().set(A, Q / 1), R = A.length, Q;
}
function decode(A) {
    var Q = U(A, B1.__wbindgen_malloc), E = R;
    return G(B1.decode(Q, E));
}
async function i(A, B) {
    if ("function" == typeof Response && A instanceof Response) {
        if ("function" == typeof WebAssembly.instantiateStreaming) try {
            return await WebAssembly.instantiateStreaming(A, B);
        } catch (B) {
            if ("application/wasm" == A.headers.get("Content-Type")) throw B;
            console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", B);
        }
        const Q = await A.arrayBuffer();
        return await WebAssembly.instantiate(Q, B);
    }
    {
        const Q = await WebAssembly.instantiate(A, B);
        return Q instanceof WebAssembly.Instance ? {
            instance: Q,
            module: A
        } : Q;
    }
}
async function o1(A) {
    void 0 === A && (A = importMeta1.url.replace(/\.js$/, "_bg.wasm"));
    const Q = {
        wbg: {}
    };
    Q.wbg.__wbindgen_string_new = function(A, B) {
        return D1(I1(A, B));
    }, Q.wbg.__wbindgen_json_parse = function(A, B) {
        return D1(JSON.parse(I1(A, B)));
    }, Q.wbg.__wbindgen_throw = function(A, B) {
        throw new Error(I1(A, B));
    }, Q.wbg.__wbindgen_rethrow = function(A) {
        throw G(A);
    }, ("string" == typeof A || "function" == typeof Request && A instanceof Request || "function" == typeof URL && A instanceof URL) && (A = fetch(A));
    const { instance: E , module: g  } = await i(await A, Q);
    return B1 = E.exports, o1.__wbindgen_wasm_module = g, B1;
}
await o1(source1);
function decode1(image) {
    const res = decode(image);
    return {
        image: new Uint8Array(res.image),
        width: res.width,
        height: res.height,
        colorType: res.colorType,
        bitDepth: res.bitDepth,
        lineSize: res.lineSize
    };
}
const toClosestColor = (pixels)=>(_, offset)=>{
        const pixelOffset = offset * 4;
        const pixel = {
            r: pixels[pixelOffset],
            g: pixels[pixelOffset + 1],
            b: pixels[pixelOffset + 2]
        };
        let minDistance = Number.MAX_VALUE;
        let closestPaletteColor = 0;
        pico8Palette.forEach((color, i)=>{
            const diff = (color.r - pixel.r) ** 2 + (color.g - pixel.g) ** 2 + (color.b - pixel.b) ** 2;
            if (diff < minDistance) {
                minDistance = diff;
                closestPaletteColor = i;
            }
        });
        return closestPaletteColor.toString(16);
    };
async function getSpritesheetFromImage(imagePath) {
    if (!imagePath) {
        throw new Error("Image path is missing");
    }
    const fileData = await Deno.readFile(imagePath);
    const png = decode1(fileData);
    logSuccess("Image parsed");
    if (png.width !== 128 || png.height !== 128) {
        throw new Error("The spritesheet must be a 128x128 png image");
    }
    const pixels = new Array(png.width * png.height).fill(0).map(toClosestColor(png.image));
    const pixelsAsString = new Array(png.height).fill(0).map((_, offset)=>pixels.slice(offset * 128, offset * 128 + 128).join("")).join("\n");
    return pixelsAsString;
}
const execSync = (executablePath, args)=>{
    return spawn(executablePath, {
        stdio: "ignore",
        args
    });
};
const spawn = (executablePath, opts)=>{
    const args = opts?.args;
    const stdio = opts?.stdio || 'ignore';
    const cmd = new Deno.Command(executablePath, {
        args
    });
    if (stdio === 'inherit') {
        return cmd.outputSync();
    }
    return cmd.spawn().output();
};
const pico8PathMap = {
    windows: `"C:\\Program Files (x86)\\PICO-8\\pico8.exe"`,
    darwin: "/Applications/PICO-8.app/Contents/MacOS/pico8",
    linux: "~/pico-8/pico8"
};
function createPico8Launcher({ watch , customPicoPath , reloadOnSave , pipeOutputToConsole  }) {
    let picoProcess = null;
    return (cartridgePath)=>{
        if (!watch || !cartridgePath) {
            return;
        }
        if (picoProcess) {
            if (!reloadOnSave) {
                return;
            }
            if (Deno.build.os === "darwin") {
                logSuccess("Reloading cartridge in PICO-8");
                execSync("osascript", [
                    `${join3(Deno.cwd(), "reload-pico8.applescript")}`
                ]);
            } else {
                logWarning("Autoreloading is currently only supported on MacOS. Please press Ctrl+R in PICO-8 to see new changes.");
            }
        } else {
            logSuccess("Running cartridge in PICO-8");
            const picoPath = customPicoPath || pico8PathMap[Deno.build.os];
            picoProcess = spawn(picoPath, {
                args: [
                    "-run",
                    `"${resolve2(cartridgePath)}"`
                ],
                shell: true,
                stdio: pipeOutputToConsole ? "inherit" : "pipe"
            });
            picoProcess.then(({ code  })=>{
                picoProcess = null;
                code && console.log(`Pico-8 process exited with code ${code}`);
            });
        }
    };
}
const Syntax = {
    AssignmentExpression: 'AssignmentExpression',
    AssignmentPattern: 'AssignmentPattern',
    ArrayExpression: 'ArrayExpression',
    ArrayPattern: 'ArrayPattern',
    ArrowFunctionExpression: 'ArrowFunctionExpression',
    AwaitExpression: 'AwaitExpression',
    BlockStatement: 'BlockStatement',
    BinaryExpression: 'BinaryExpression',
    BreakStatement: 'BreakStatement',
    CallExpression: 'CallExpression',
    CatchClause: 'CatchClause',
    ChainExpression: 'ChainExpression',
    ClassBody: 'ClassBody',
    ClassDeclaration: 'ClassDeclaration',
    ClassExpression: 'ClassExpression',
    ConditionalExpression: 'ConditionalExpression',
    ContinueStatement: 'ContinueStatement',
    DoWhileStatement: 'DoWhileStatement',
    DebuggerStatement: 'DebuggerStatement',
    EmptyStatement: 'EmptyStatement',
    ExportAllDeclaration: 'ExportAllDeclaration',
    ExportDefaultDeclaration: 'ExportDefaultDeclaration',
    ExportNamedDeclaration: 'ExportNamedDeclaration',
    ExportSpecifier: 'ExportSpecifier',
    ExpressionStatement: 'ExpressionStatement',
    ForStatement: 'ForStatement',
    ForOfStatement: 'ForOfStatement',
    ForInStatement: 'ForInStatement',
    FunctionDeclaration: 'FunctionDeclaration',
    FunctionExpression: 'FunctionExpression',
    Identifier: 'Identifier',
    IfStatement: 'IfStatement',
    Import: 'Import',
    ImportDeclaration: 'ImportDeclaration',
    ImportDefaultSpecifier: 'ImportDefaultSpecifier',
    ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
    ImportSpecifier: 'ImportSpecifier',
    Literal: 'Literal',
    LabeledStatement: 'LabeledStatement',
    LogicalExpression: 'LogicalExpression',
    MemberExpression: 'MemberExpression',
    MetaProperty: 'MetaProperty',
    MethodDefinition: 'MethodDefinition',
    NewExpression: 'NewExpression',
    ObjectExpression: 'ObjectExpression',
    ObjectPattern: 'ObjectPattern',
    Program: 'Program',
    Property: 'Property',
    RestElement: 'RestElement',
    ReturnStatement: 'ReturnStatement',
    SequenceExpression: 'SequenceExpression',
    SpreadElement: 'SpreadElement',
    Super: 'Super',
    SwitchCase: 'SwitchCase',
    SwitchStatement: 'SwitchStatement',
    TaggedTemplateExpression: 'TaggedTemplateExpression',
    TemplateElement: 'TemplateElement',
    TemplateLiteral: 'TemplateLiteral',
    ThisExpression: 'ThisExpression',
    ThrowStatement: 'ThrowStatement',
    TryStatement: 'TryStatement',
    UnaryExpression: 'UnaryExpression',
    UpdateExpression: 'UpdateExpression',
    VariableDeclaration: 'VariableDeclaration',
    VariableDeclarator: 'VariableDeclarator',
    WhileStatement: 'WhileStatement',
    WithStatement: 'WithStatement',
    YieldExpression: 'YieldExpression'
};
class CommentHandler {
    attach;
    comments;
    stack;
    leading;
    trailing;
    constructor(){
        this.attach = false;
        this.comments = [];
        this.stack = [];
        this.leading = [];
        this.trailing = [];
    }
    insertInnerComments(node, metadata) {
        if (node.type === Syntax.BlockStatement && node.body.length === 0) {
            const innerComments = [];
            for(let i = this.leading.length - 1; i >= 0; --i){
                const entry = this.leading[i];
                if (metadata.end.offset >= entry.start) {
                    innerComments.unshift(entry.comment);
                    this.leading.splice(i, 1);
                    this.trailing.splice(i, 1);
                }
            }
            if (innerComments.length) {
                node.innerComments = innerComments;
            }
        }
    }
    findTrailingComments(metadata) {
        let trailingComments = [];
        if (this.trailing.length > 0) {
            for(let i = this.trailing.length - 1; i >= 0; --i){
                const entry = this.trailing[i];
                if (entry.start >= metadata.end.offset) {
                    trailingComments.unshift(entry.comment);
                }
            }
            this.trailing.length = 0;
            return trailingComments;
        }
        const last = this.stack[this.stack.length - 1];
        if (last && last.node.trailingComments) {
            const firstComment = last.node.trailingComments[0];
            if (firstComment && firstComment.range[0] >= metadata.end.offset) {
                trailingComments = last.node.trailingComments;
                delete last.node.trailingComments;
            }
        }
        return trailingComments;
    }
    findLeadingComments(metadata) {
        const leadingComments = [];
        let target;
        while(this.stack.length > 0){
            const entry = this.stack[this.stack.length - 1];
            if (entry && entry.start >= metadata.start.offset) {
                target = entry.node;
                this.stack.pop();
            } else {
                break;
            }
        }
        if (target) {
            const count = target.leadingComments ? target.leadingComments.length : 0;
            for(let i = count - 1; i >= 0; --i){
                const comment = target.leadingComments[i];
                if (comment.range[1] <= metadata.start.offset) {
                    leadingComments.unshift(comment);
                    target.leadingComments.splice(i, 1);
                }
            }
            if (target.leadingComments && target.leadingComments.length === 0) {
                delete target.leadingComments;
            }
            return leadingComments;
        }
        for(let i = this.leading.length - 1; i >= 0; --i){
            const entry = this.leading[i];
            if (entry.start <= metadata.start.offset) {
                leadingComments.unshift(entry.comment);
                this.leading.splice(i, 1);
            }
        }
        return leadingComments;
    }
    visitNode(node, metadata) {
        if (node.type === Syntax.Program && node.body.length > 0) {
            return;
        }
        this.insertInnerComments(node, metadata);
        const trailingComments = this.findTrailingComments(metadata);
        const leadingComments = this.findLeadingComments(metadata);
        if (leadingComments.length > 0) {
            node.leadingComments = leadingComments;
        }
        if (trailingComments.length > 0) {
            node.trailingComments = trailingComments;
        }
        this.stack.push({
            node: node,
            start: metadata.start.offset
        });
    }
    visitComment(node, metadata) {
        const type = node.type[0] === 'L' ? 'Line' : 'Block';
        const comment = {
            type: type,
            value: node.value
        };
        if (node.range) {
            comment.range = node.range;
        }
        if (node.loc) {
            comment.loc = node.loc;
        }
        this.comments.push(comment);
        if (this.attach) {
            const entry = {
                comment: {
                    type: type,
                    value: node.value,
                    range: [
                        metadata.start.offset,
                        metadata.end.offset
                    ]
                },
                start: metadata.start.offset
            };
            if (node.loc) {
                entry.comment.loc = node.loc;
            }
            node.type = type;
            this.leading.push(entry);
            this.trailing.push(entry);
        }
    }
    visit(node, metadata) {
        if (node.type === 'LineComment') {
            this.visitComment(node, metadata);
        } else if (node.type === 'BlockComment') {
            this.visitComment(node, metadata);
        } else if (this.attach) {
            this.visitNode(node, metadata);
        }
    }
}
const Regex = {
    NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD23\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCDF\uDCFF\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDEE0-\uDEF2]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDEC0-\uDEEB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/,
    NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05EF-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u07FD\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D3-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u09FE\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1878\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CD0-\u1CD2\u1CD4-\u1CFA\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD27\uDD30-\uDD39\uDF00-\uDF1C\uDF27\uDF30-\uDF50\uDFE0-\uDFF6]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD44-\uDD46\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDC9-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3B-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC5E\uDC5F\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDC00-\uDC3A\uDCA0-\uDCE9\uDCFF\uDDA0-\uDDA7\uDDAA-\uDDD7\uDDDA-\uDDE1\uDDE3\uDDE4\uDE00-\uDE3E\uDE47\uDE50-\uDE99\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD8E\uDD90\uDD91\uDD93-\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF6]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF4F-\uDF87\uDF8F-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD00-\uDD2C\uDD30-\uDD3D\uDD40-\uDD49\uDD4E\uDEC0-\uDEF9]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4B\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
};
const Character = {
    fromCodePoint (cp) {
        return cp < 0x10000 ? String.fromCharCode(cp) : String.fromCharCode(0xD800 + (cp - 0x10000 >> 10)) + String.fromCharCode(0xDC00 + (cp - 0x10000 & 1023));
    },
    isWhiteSpace (cp) {
        return cp === 0x20 || cp === 0x09 || cp === 0x0B || cp === 0x0C || cp === 0xA0 || cp >= 0x1680 && [
            0x1680,
            0x2000,
            0x2001,
            0x2002,
            0x2003,
            0x2004,
            0x2005,
            0x2006,
            0x2007,
            0x2008,
            0x2009,
            0x200A,
            0x202F,
            0x205F,
            0x3000,
            0xFEFF
        ].indexOf(cp) >= 0;
    },
    isLineTerminator (cp) {
        return cp === 0x0A || cp === 0x0D || cp === 0x2028 || cp === 0x2029;
    },
    isIdentifierStart (cp) {
        return cp === 0x24 || cp === 0x5F || cp >= 0x41 && cp <= 0x5A || cp >= 0x61 && cp <= 0x7A || cp === 0x5C || cp >= 0x80 && Regex.NonAsciiIdentifierStart.test(Character.fromCodePoint(cp));
    },
    isIdentifierPart (cp) {
        return cp === 0x24 || cp === 0x5F || cp >= 0x41 && cp <= 0x5A || cp >= 0x61 && cp <= 0x7A || cp >= 0x30 && cp <= 0x39 || cp === 0x5C || cp >= 0x80 && Regex.NonAsciiIdentifierPart.test(Character.fromCodePoint(cp));
    },
    isDecimalDigit (cp) {
        return cp >= 0x30 && cp <= 0x39;
    },
    isDecimalDigitChar (ch) {
        return ch.length === 1 && Character.isDecimalDigit(ch.charCodeAt(0));
    },
    isHexDigit (cp) {
        return cp >= 0x30 && cp <= 0x39 || cp >= 0x41 && cp <= 0x46 || cp >= 0x61 && cp <= 0x66;
    },
    isOctalDigit (cp) {
        return cp >= 0x30 && cp <= 0x37;
    }
};
const JSXSyntax = {
    JSXAttribute: 'JSXAttribute',
    JSXClosingElement: 'JSXClosingElement',
    JSXClosingFragment: 'JSXClosingFragment',
    JSXElement: 'JSXElement',
    JSXEmptyExpression: 'JSXEmptyExpression',
    JSXExpressionContainer: 'JSXExpressionContainer',
    JSXIdentifier: 'JSXIdentifier',
    JSXMemberExpression: 'JSXMemberExpression',
    JSXNamespacedName: 'JSXNamespacedName',
    JSXOpeningElement: 'JSXOpeningElement',
    JSXOpeningFragment: 'JSXOpeningFragment',
    JSXSpreadAttribute: 'JSXSpreadAttribute',
    JSXText: 'JSXText'
};
class JSXClosingElement {
    type;
    name;
    constructor(name){
        this.type = JSXSyntax.JSXClosingElement;
        this.name = name;
    }
}
class JSXClosingFragment {
    type;
    constructor(){
        this.type = JSXSyntax.JSXClosingFragment;
    }
}
class JSXElement {
    type;
    openingElement;
    children;
    closingElement;
    constructor(openingElement, children, closingElement){
        this.type = JSXSyntax.JSXElement;
        this.openingElement = openingElement;
        this.children = children;
        this.closingElement = closingElement;
    }
}
class JSXEmptyExpression {
    type;
    constructor(){
        this.type = JSXSyntax.JSXEmptyExpression;
    }
}
class JSXExpressionContainer {
    type;
    expression;
    constructor(expression){
        this.type = JSXSyntax.JSXExpressionContainer;
        this.expression = expression;
    }
}
class JSXIdentifier {
    type;
    name;
    constructor(name){
        this.type = JSXSyntax.JSXIdentifier;
        this.name = name;
    }
}
class JSXMemberExpression {
    type;
    object;
    property;
    constructor(object, property){
        this.type = JSXSyntax.JSXMemberExpression;
        this.object = object;
        this.property = property;
    }
}
class JSXAttribute {
    type;
    name;
    value;
    constructor(name, value){
        this.type = JSXSyntax.JSXAttribute;
        this.name = name;
        this.value = value;
    }
}
class JSXNamespacedName {
    type;
    namespace;
    name;
    constructor(namespace, name){
        this.type = JSXSyntax.JSXNamespacedName;
        this.namespace = namespace;
        this.name = name;
    }
}
class JSXOpeningElement {
    type;
    name;
    selfClosing;
    attributes;
    constructor(name, selfClosing, attributes){
        this.type = JSXSyntax.JSXOpeningElement;
        this.name = name;
        this.selfClosing = selfClosing;
        this.attributes = attributes;
    }
}
class JSXOpeningFragment {
    type;
    selfClosing;
    constructor(selfClosing){
        this.type = JSXSyntax.JSXOpeningFragment;
        this.selfClosing = selfClosing;
    }
}
class JSXSpreadAttribute {
    type;
    argument;
    constructor(argument){
        this.type = JSXSyntax.JSXSpreadAttribute;
        this.argument = argument;
    }
}
class JSXText {
    type;
    value;
    raw;
    constructor(value, raw){
        this.type = JSXSyntax.JSXText;
        this.value = value;
        this.raw = raw;
    }
}
class ArrayExpression {
    type;
    elements;
    constructor(elements){
        this.type = Syntax.ArrayExpression;
        this.elements = elements;
    }
}
class ArrayPattern {
    type;
    elements;
    constructor(elements){
        this.type = Syntax.ArrayPattern;
        this.elements = elements;
    }
}
class ArrowFunctionExpression {
    type;
    id;
    params;
    body;
    generator;
    expression;
    async;
    constructor(params, body, expression){
        this.type = Syntax.ArrowFunctionExpression;
        this.id = null;
        this.params = params;
        this.body = body;
        this.generator = false;
        this.expression = expression;
        this.async = false;
    }
}
class AssignmentExpression {
    type;
    operator;
    left;
    right;
    constructor(operator, left, right){
        this.type = Syntax.AssignmentExpression;
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}
class AssignmentPattern {
    type;
    left;
    right;
    constructor(left, right){
        this.type = Syntax.AssignmentPattern;
        this.left = left;
        this.right = right;
    }
}
class AsyncArrowFunctionExpression {
    type;
    id;
    params;
    body;
    generator;
    expression;
    async;
    constructor(params, body, expression){
        this.type = Syntax.ArrowFunctionExpression;
        this.id = null;
        this.params = params;
        this.body = body;
        this.generator = false;
        this.expression = expression;
        this.async = true;
    }
}
class AsyncFunctionDeclaration {
    type;
    id;
    params;
    body;
    generator;
    expression;
    async;
    constructor(id, params, body, generator){
        this.type = Syntax.FunctionDeclaration;
        this.id = id;
        this.params = params;
        this.body = body;
        this.generator = generator;
        this.expression = false;
        this.async = true;
    }
}
class AsyncFunctionExpression {
    type;
    id;
    params;
    body;
    generator;
    expression;
    async;
    constructor(id, params, body, generator){
        this.type = Syntax.FunctionExpression;
        this.id = id;
        this.params = params;
        this.body = body;
        this.generator = generator;
        this.expression = false;
        this.async = true;
    }
}
class AwaitExpression {
    type;
    argument;
    constructor(argument){
        this.type = Syntax.AwaitExpression;
        this.argument = argument;
    }
}
class BinaryExpression {
    type;
    operator;
    left;
    right;
    constructor(operator, left, right){
        const logical = operator === '||' || operator === '&&' || operator === '??';
        this.type = logical ? Syntax.LogicalExpression : Syntax.BinaryExpression;
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}
class BlockStatement {
    type;
    body;
    constructor(body){
        this.type = Syntax.BlockStatement;
        this.body = body;
    }
}
class BreakStatement {
    type;
    label;
    constructor(label){
        this.type = Syntax.BreakStatement;
        this.label = label;
    }
}
class CallExpression {
    type;
    callee;
    arguments;
    optional;
    constructor(callee, args, optional){
        this.type = Syntax.CallExpression;
        this.callee = callee;
        this.arguments = args;
        this.optional = optional;
    }
}
class CatchClause {
    type;
    param;
    body;
    constructor(param, body){
        this.type = Syntax.CatchClause;
        this.param = param;
        this.body = body;
    }
}
class ChainExpression {
    type;
    expression;
    constructor(expression){
        this.type = Syntax.ChainExpression;
        this.expression = expression;
    }
}
class ClassBody {
    type;
    body;
    constructor(body){
        this.type = Syntax.ClassBody;
        this.body = body;
    }
}
class ClassDeclaration {
    type;
    id;
    superClass;
    body;
    constructor(id, superClass, body){
        this.type = Syntax.ClassDeclaration;
        this.id = id;
        this.superClass = superClass;
        this.body = body;
    }
}
class ClassExpression {
    type;
    id;
    superClass;
    body;
    constructor(id, superClass, body){
        this.type = Syntax.ClassExpression;
        this.id = id;
        this.superClass = superClass;
        this.body = body;
    }
}
class ComputedMemberExpression {
    type;
    computed;
    object;
    property;
    optional;
    constructor(object, property, optional){
        this.type = Syntax.MemberExpression;
        this.computed = true;
        this.object = object;
        this.property = property;
        this.optional = optional;
    }
}
class ConditionalExpression {
    type;
    test;
    consequent;
    alternate;
    constructor(test, consequent, alternate){
        this.type = Syntax.ConditionalExpression;
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}
class ContinueStatement {
    type;
    label;
    constructor(label){
        this.type = Syntax.ContinueStatement;
        this.label = label;
    }
}
class DebuggerStatement {
    type;
    constructor(){
        this.type = Syntax.DebuggerStatement;
    }
}
class Directive {
    type;
    expression;
    directive;
    constructor(expression, directive){
        this.type = Syntax.ExpressionStatement;
        this.expression = expression;
        this.directive = directive;
    }
}
class DoWhileStatement {
    type;
    body;
    test;
    constructor(body, test){
        this.type = Syntax.DoWhileStatement;
        this.body = body;
        this.test = test;
    }
}
class EmptyStatement {
    type;
    constructor(){
        this.type = Syntax.EmptyStatement;
    }
}
class ExportAllDeclaration {
    type;
    source;
    constructor(source){
        this.type = Syntax.ExportAllDeclaration;
        this.source = source;
    }
}
class ExportDefaultDeclaration {
    type;
    declaration;
    constructor(declaration){
        this.type = Syntax.ExportDefaultDeclaration;
        this.declaration = declaration;
    }
}
class ExportNamedDeclaration {
    type;
    declaration;
    specifiers;
    source;
    constructor(declaration, specifiers, source){
        this.type = Syntax.ExportNamedDeclaration;
        this.declaration = declaration;
        this.specifiers = specifiers;
        this.source = source;
    }
}
class ExportSpecifier {
    type;
    exported;
    local;
    constructor(local, exported){
        this.type = Syntax.ExportSpecifier;
        this.exported = exported;
        this.local = local;
    }
}
class ExpressionStatement {
    type;
    expression;
    constructor(expression){
        this.type = Syntax.ExpressionStatement;
        this.expression = expression;
    }
}
class ForInStatement {
    type;
    left;
    right;
    body;
    each;
    constructor(left, right, body){
        this.type = Syntax.ForInStatement;
        this.left = left;
        this.right = right;
        this.body = body;
        this.each = false;
    }
}
class ForOfStatement {
    type;
    await;
    left;
    right;
    body;
    constructor(left, right, body, _await){
        this.type = Syntax.ForOfStatement;
        this.await = _await;
        this.left = left;
        this.right = right;
        this.body = body;
    }
}
class ForStatement {
    type;
    init;
    test;
    update;
    body;
    constructor(init, test, update, body){
        this.type = Syntax.ForStatement;
        this.init = init;
        this.test = test;
        this.update = update;
        this.body = body;
    }
}
class FunctionDeclaration {
    type;
    id;
    params;
    body;
    generator;
    expression;
    async;
    constructor(id, params, body, generator){
        this.type = Syntax.FunctionDeclaration;
        this.id = id;
        this.params = params;
        this.body = body;
        this.generator = generator;
        this.expression = false;
        this.async = false;
    }
}
class FunctionExpression {
    type;
    id;
    params;
    body;
    generator;
    expression;
    async;
    constructor(id, params, body, generator){
        this.type = Syntax.FunctionExpression;
        this.id = id;
        this.params = params;
        this.body = body;
        this.generator = generator;
        this.expression = false;
        this.async = false;
    }
}
class Identifier {
    type;
    name;
    constructor(name){
        this.type = Syntax.Identifier;
        this.name = name;
    }
}
class IfStatement {
    type;
    test;
    consequent;
    alternate;
    constructor(test, consequent, alternate){
        this.type = Syntax.IfStatement;
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}
class Import {
    type;
    constructor(){
        this.type = Syntax.Import;
    }
}
class ImportDeclaration {
    type;
    specifiers;
    source;
    constructor(specifiers, source){
        this.type = Syntax.ImportDeclaration;
        this.specifiers = specifiers;
        this.source = source;
    }
}
class ImportDefaultSpecifier {
    type;
    local;
    constructor(local){
        this.type = Syntax.ImportDefaultSpecifier;
        this.local = local;
    }
}
class ImportNamespaceSpecifier {
    type;
    local;
    constructor(local){
        this.type = Syntax.ImportNamespaceSpecifier;
        this.local = local;
    }
}
class ImportSpecifier {
    type;
    local;
    imported;
    constructor(local, imported){
        this.type = Syntax.ImportSpecifier;
        this.local = local;
        this.imported = imported;
    }
}
class LabeledStatement {
    type;
    label;
    body;
    constructor(label, body){
        this.type = Syntax.LabeledStatement;
        this.label = label;
        this.body = body;
    }
}
class Literal {
    type;
    value;
    raw;
    constructor(value, raw){
        this.type = Syntax.Literal;
        this.value = value;
        this.raw = raw;
    }
}
class MetaProperty {
    type;
    meta;
    property;
    constructor(meta, property){
        this.type = Syntax.MetaProperty;
        this.meta = meta;
        this.property = property;
    }
}
class MethodDefinition {
    type;
    key;
    computed;
    value;
    kind;
    static;
    constructor(key, computed, value, kind, isStatic){
        this.type = Syntax.MethodDefinition;
        this.key = key;
        this.computed = computed;
        this.value = value;
        this.kind = kind;
        this.static = isStatic;
    }
}
class Module {
    type;
    body;
    sourceType;
    constructor(body){
        this.type = Syntax.Program;
        this.body = body;
        this.sourceType = 'module';
    }
}
class NewExpression {
    type;
    callee;
    arguments;
    constructor(callee, args){
        this.type = Syntax.NewExpression;
        this.callee = callee;
        this.arguments = args;
    }
}
class ObjectExpression {
    type;
    properties;
    constructor(properties){
        this.type = Syntax.ObjectExpression;
        this.properties = properties;
    }
}
class ObjectPattern {
    type;
    properties;
    constructor(properties){
        this.type = Syntax.ObjectPattern;
        this.properties = properties;
    }
}
class Property {
    type;
    key;
    computed;
    value;
    kind;
    method;
    shorthand;
    constructor(kind, key, computed, value, method, shorthand){
        this.type = Syntax.Property;
        this.key = key;
        this.computed = computed;
        this.value = value;
        this.kind = kind;
        this.method = method;
        this.shorthand = shorthand;
    }
}
class RegexLiteral {
    type;
    value;
    raw;
    regex;
    constructor(value, raw, pattern, flags){
        this.type = Syntax.Literal;
        this.value = value;
        this.raw = raw;
        this.regex = {
            pattern,
            flags
        };
    }
}
class RestElement {
    type;
    argument;
    constructor(argument){
        this.type = Syntax.RestElement;
        this.argument = argument;
    }
}
class ReturnStatement {
    type;
    argument;
    constructor(argument){
        this.type = Syntax.ReturnStatement;
        this.argument = argument;
    }
}
class Script {
    type;
    body;
    sourceType;
    constructor(body){
        this.type = Syntax.Program;
        this.body = body;
        this.sourceType = 'script';
    }
}
class SequenceExpression {
    type;
    expressions;
    constructor(expressions){
        this.type = Syntax.SequenceExpression;
        this.expressions = expressions;
    }
}
class SpreadElement {
    type;
    argument;
    constructor(argument){
        this.type = Syntax.SpreadElement;
        this.argument = argument;
    }
}
class StaticMemberExpression {
    type;
    computed;
    object;
    property;
    optional;
    constructor(object, property, optional){
        this.type = Syntax.MemberExpression;
        this.computed = false;
        this.object = object;
        this.property = property;
        this.optional = optional;
    }
}
class Super {
    type;
    constructor(){
        this.type = Syntax.Super;
    }
}
class SwitchCase {
    type;
    test;
    consequent;
    constructor(test, consequent){
        this.type = Syntax.SwitchCase;
        this.test = test;
        this.consequent = consequent;
    }
}
class SwitchStatement {
    type;
    discriminant;
    cases;
    constructor(discriminant, cases){
        this.type = Syntax.SwitchStatement;
        this.discriminant = discriminant;
        this.cases = cases;
    }
}
class TaggedTemplateExpression {
    type;
    tag;
    quasi;
    constructor(tag, quasi){
        this.type = Syntax.TaggedTemplateExpression;
        this.tag = tag;
        this.quasi = quasi;
    }
}
class TemplateElement {
    type;
    value;
    tail;
    constructor(value, tail){
        this.type = Syntax.TemplateElement;
        this.value = value;
        this.tail = tail;
    }
}
class TemplateLiteral {
    type;
    quasis;
    expressions;
    constructor(quasis, expressions){
        this.type = Syntax.TemplateLiteral;
        this.quasis = quasis;
        this.expressions = expressions;
    }
}
class ThisExpression {
    type;
    constructor(){
        this.type = Syntax.ThisExpression;
    }
}
class ThrowStatement {
    type;
    argument;
    constructor(argument){
        this.type = Syntax.ThrowStatement;
        this.argument = argument;
    }
}
class TryStatement {
    type;
    block;
    handler;
    finalizer;
    constructor(block, handler, finalizer){
        this.type = Syntax.TryStatement;
        this.block = block;
        this.handler = handler;
        this.finalizer = finalizer;
    }
}
class UnaryExpression {
    type;
    operator;
    argument;
    prefix;
    constructor(operator, argument){
        this.type = Syntax.UnaryExpression;
        this.operator = operator;
        this.argument = argument;
        this.prefix = true;
    }
}
class UpdateExpression {
    type;
    operator;
    argument;
    prefix;
    constructor(operator, argument, prefix){
        this.type = Syntax.UpdateExpression;
        this.operator = operator;
        this.argument = argument;
        this.prefix = prefix;
    }
}
class VariableDeclaration {
    type;
    declarations;
    kind;
    constructor(declarations, kind){
        this.type = Syntax.VariableDeclaration;
        this.declarations = declarations;
        this.kind = kind;
    }
}
class VariableDeclarator {
    type;
    id;
    init;
    constructor(id, init){
        this.type = Syntax.VariableDeclarator;
        this.id = id;
        this.init = init;
    }
}
class WhileStatement {
    type;
    test;
    body;
    constructor(test, body){
        this.type = Syntax.WhileStatement;
        this.test = test;
        this.body = body;
    }
}
class WithStatement {
    type;
    object;
    body;
    constructor(object, body){
        this.type = Syntax.WithStatement;
        this.object = object;
        this.body = body;
    }
}
class YieldExpression {
    type;
    argument;
    delegate;
    constructor(argument, delegate){
        this.type = Syntax.YieldExpression;
        this.argument = argument;
        this.delegate = delegate;
    }
}
function assert1(condition, message) {
    if (!condition) {
        throw new Error('ASSERT: ' + message);
    }
}
class ErrorHandler {
    errors;
    tolerant;
    constructor(){
        this.errors = [];
        this.tolerant = false;
    }
    recordError(error) {
        this.errors.push(error);
    }
    tolerate(error) {
        if (this.tolerant) {
            this.recordError(error);
        } else {
            throw error;
        }
    }
    constructError(msg, column) {
        const error = Object.create(new Error(msg));
        Object.defineProperty(error, 'column', {
            value: column
        });
        return error;
    }
    createError(index, line, col, description) {
        const msg = 'Line ' + line + ': ' + description;
        const error = this.constructError(msg, col);
        error.index = index;
        error.lineNumber = line;
        error.description = description;
        return error;
    }
    throwError(index, line, col, description) {
        throw this.createError(index, line, col, description);
    }
    tolerateError(index, line, col, description) {
        const error = this.createError(index, line, col, description);
        if (this.tolerant) {
            this.recordError(error);
        } else {
            throw error;
        }
    }
}
const Messages = {
    AsyncFunctionInSingleStatementContext: 'Async functions can only be declared at the top level or inside a block.',
    BadImportCallArity: 'Unexpected token',
    BadGetterArity: 'Getter must not have any formal parameters',
    BadSetterArity: 'Setter must have exactly one formal parameter',
    BadSetterRestParameter: 'Setter function argument must not be a rest parameter',
    CannotUseImportMetaOutsideAModule: 'Cannot use \'import.meta\' outside a module',
    ConstructorIsAsync: 'Class constructor may not be an async method',
    ConstructorSpecialMethod: 'Class constructor may not be an accessor',
    DeclarationMissingInitializer: 'Missing initializer in %0 declaration',
    DefaultRestParameter: 'Unexpected token =',
    DefaultRestProperty: 'Unexpected token =',
    DuplicateBinding: 'Duplicate binding %0',
    DuplicateConstructor: 'A class may only have one constructor',
    DuplicateParameter: 'Duplicate parameter name not allowed in this context',
    DuplicateProtoProperty: 'Duplicate __proto__ fields are not allowed in object literals',
    ForInOfLoopInitializer: '%0 loop variable declaration may not have an initializer',
    GeneratorInLegacyContext: 'Generator declarations are not allowed in legacy contexts',
    IllegalBreak: 'Illegal break statement',
    IllegalContinue: 'Illegal continue statement',
    IllegalExportDeclaration: 'Unexpected token',
    IllegalImportDeclaration: 'Unexpected token',
    IllegalLanguageModeDirective: 'Illegal \'use strict\' directive in function with non-simple parameter list',
    IllegalReturn: 'Illegal return statement',
    InvalidEscapedReservedWord: 'Keyword must not contain escaped characters',
    InvalidHexEscapeSequence: 'Invalid hexadecimal escape sequence',
    InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
    InvalidLHSInForIn: 'Invalid left-hand side in for-in',
    InvalidLHSInForLoop: 'Invalid left-hand side in for-loop',
    InvalidModuleSpecifier: 'Unexpected token',
    InvalidRegExp: 'Invalid regular expression',
    InvalidTaggedTemplateOnOptionalChain: 'Invalid tagged template on optional chain',
    InvalidUnicodeEscapeSequence: 'Invalid Unicode escape sequence',
    LetInLexicalBinding: 'let is disallowed as a lexically bound name',
    MissingFromClause: 'Unexpected token',
    MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
    NewlineAfterThrow: 'Illegal newline after throw',
    NoAsAfterImportNamespace: 'Unexpected token',
    NoCatchOrFinally: 'Missing catch or finally after try',
    ParameterAfterRestParameter: 'Rest parameter must be last formal parameter',
    PropertyAfterRestProperty: 'Unexpected token',
    Redeclaration: '%0 \'%1\' has already been declared',
    StaticPrototype: 'Classes may not have static property named prototype',
    StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
    StrictDelete: 'Delete of an unqualified identifier in strict mode.',
    StrictFunction: 'In strict mode code, functions can only be declared at top level or inside a block',
    StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
    StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
    StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
    StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
    StrictModeWith: 'Strict mode code may not include a with statement',
    StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
    StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
    StrictReservedWord: 'Use of future reserved word in strict mode',
    StrictVarName: 'Variable name may not be eval or arguments in strict mode',
    TemplateOctalLiteral: 'Octal literals are not allowed in template strings.',
    TemplateEscape89: '\\8 and \\9 are not allowed in template strings.',
    UnexpectedEOS: 'Unexpected end of input',
    UnexpectedIdentifier: 'Unexpected identifier',
    UnexpectedNumber: 'Unexpected number',
    UnexpectedReserved: 'Unexpected reserved word',
    UnexpectedString: 'Unexpected string',
    UnexpectedSuper: '\'super\' keyword unexpected here',
    UnexpectedTemplate: 'Unexpected quasi %0',
    UnexpectedToken: 'Unexpected token %0',
    UnexpectedTokenIllegal: 'Unexpected token ILLEGAL',
    UnknownLabel: 'Undefined label \'%0\'',
    UnterminatedRegExp: 'Invalid regular expression: missing /'
};
var Token;
(function(Token) {
    Token[Token["Unknown"] = 0] = "Unknown";
    Token[Token["BooleanLiteral"] = 1] = "BooleanLiteral";
    Token[Token["EOF"] = 2] = "EOF";
    Token[Token["Identifier"] = 3] = "Identifier";
    Token[Token["Keyword"] = 4] = "Keyword";
    Token[Token["NullLiteral"] = 5] = "NullLiteral";
    Token[Token["NumericLiteral"] = 6] = "NumericLiteral";
    Token[Token["Punctuator"] = 7] = "Punctuator";
    Token[Token["StringLiteral"] = 8] = "StringLiteral";
    Token[Token["RegularExpression"] = 9] = "RegularExpression";
    Token[Token["Template"] = 10] = "Template";
})(Token || (Token = {}));
const TokenName = [];
TokenName[Token.BooleanLiteral] = 'Boolean';
TokenName[Token.EOF] = '<end>';
TokenName[Token.Identifier] = 'Identifier';
TokenName[Token.Keyword] = 'Keyword';
TokenName[Token.NullLiteral] = 'Null';
TokenName[Token.NumericLiteral] = 'Numeric';
TokenName[Token.Punctuator] = 'Punctuator';
TokenName[Token.StringLiteral] = 'String';
TokenName[Token.RegularExpression] = 'RegularExpression';
TokenName[Token.Template] = 'Template';
function hexValue(ch) {
    return '0123456789abcdef'.indexOf(ch.toLowerCase());
}
function octalValue(ch) {
    return '01234567'.indexOf(ch);
}
class Scanner {
    source;
    errorHandler;
    trackComment;
    isModule;
    index;
    lineNumber;
    lineStart;
    curlyStack;
    length;
    constructor(code, handler){
        this.source = code;
        this.errorHandler = handler;
        this.trackComment = false;
        this.isModule = false;
        this.length = code.length;
        this.index = 0;
        this.lineNumber = code.length > 0 ? 1 : 0;
        this.lineStart = 0;
        this.curlyStack = [];
    }
    saveState() {
        return {
            index: this.index,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            curlyStack: this.curlyStack.slice()
        };
    }
    restoreState(state) {
        this.index = state.index;
        this.lineNumber = state.lineNumber;
        this.lineStart = state.lineStart;
        this.curlyStack = state.curlyStack;
    }
    eof() {
        return this.index >= this.length;
    }
    throwUnexpectedToken(message = Messages.UnexpectedTokenIllegal) {
        return this.errorHandler.throwError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
    }
    tolerateUnexpectedToken(message = Messages.UnexpectedTokenIllegal) {
        this.errorHandler.tolerateError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
    }
    skipSingleLineComment(offset) {
        let comments = [];
        let start = 0, loc;
        if (this.trackComment) {
            comments = [];
            start = this.index - offset;
            loc = {
                start: {
                    line: this.lineNumber,
                    column: this.index - this.lineStart - offset
                },
                end: {}
            };
        }
        while(!this.eof()){
            const ch = this.source.charCodeAt(this.index);
            ++this.index;
            if (Character.isLineTerminator(ch)) {
                if (this.trackComment) {
                    loc.end = {
                        line: this.lineNumber,
                        column: this.index - this.lineStart - 1
                    };
                    const entry = {
                        multiLine: false,
                        slice: [
                            start + offset,
                            this.index - 1
                        ],
                        range: [
                            start,
                            this.index - 1
                        ],
                        loc: loc
                    };
                    comments.push(entry);
                }
                if (ch === 13 && this.source.charCodeAt(this.index) === 10) {
                    ++this.index;
                }
                ++this.lineNumber;
                this.lineStart = this.index;
                return comments;
            }
        }
        if (this.trackComment) {
            loc.end = {
                line: this.lineNumber,
                column: this.index - this.lineStart
            };
            const entry = {
                multiLine: false,
                slice: [
                    start + offset,
                    this.index
                ],
                range: [
                    start,
                    this.index
                ],
                loc: loc
            };
            comments.push(entry);
        }
        return comments;
    }
    skipMultiLineComment() {
        let comments = [];
        let start = 0, loc;
        if (this.trackComment) {
            comments = [];
            start = this.index - 2;
            loc = {
                start: {
                    line: this.lineNumber,
                    column: this.index - this.lineStart - 2
                },
                end: {}
            };
        }
        while(!this.eof()){
            const ch = this.source.charCodeAt(this.index);
            if (Character.isLineTerminator(ch)) {
                if (ch === 0x0D && this.source.charCodeAt(this.index + 1) === 0x0A) {
                    ++this.index;
                }
                ++this.lineNumber;
                ++this.index;
                this.lineStart = this.index;
            } else if (ch === 0x2A) {
                if (this.source.charCodeAt(this.index + 1) === 0x2F) {
                    this.index += 2;
                    if (this.trackComment) {
                        loc.end = {
                            line: this.lineNumber,
                            column: this.index - this.lineStart
                        };
                        const entry = {
                            multiLine: true,
                            slice: [
                                start + 2,
                                this.index - 2
                            ],
                            range: [
                                start,
                                this.index
                            ],
                            loc: loc
                        };
                        comments.push(entry);
                    }
                    return comments;
                }
                ++this.index;
            } else {
                ++this.index;
            }
        }
        if (this.trackComment) {
            loc.end = {
                line: this.lineNumber,
                column: this.index - this.lineStart
            };
            const entry = {
                multiLine: true,
                slice: [
                    start + 2,
                    this.index
                ],
                range: [
                    start,
                    this.index
                ],
                loc: loc
            };
            comments.push(entry);
        }
        this.tolerateUnexpectedToken();
        return comments;
    }
    scanComments() {
        let comments;
        if (this.trackComment) {
            comments = [];
        }
        let start = this.index === 0;
        while(!this.eof()){
            let ch = this.source.charCodeAt(this.index);
            if (Character.isWhiteSpace(ch)) {
                ++this.index;
            } else if (Character.isLineTerminator(ch)) {
                ++this.index;
                if (ch === 0x0D && this.source.charCodeAt(this.index) === 0x0A) {
                    ++this.index;
                }
                ++this.lineNumber;
                this.lineStart = this.index;
                start = true;
            } else if (ch === 0x2F) {
                ch = this.source.charCodeAt(this.index + 1);
                if (ch === 0x2F) {
                    this.index += 2;
                    const comment = this.skipSingleLineComment(2);
                    if (this.trackComment) {
                        comments = comments?.concat(comment);
                    }
                    start = true;
                } else if (ch === 0x2A) {
                    this.index += 2;
                    const comment = this.skipMultiLineComment();
                    if (this.trackComment) {
                        comments = comments?.concat(comment);
                    }
                } else {
                    break;
                }
            } else if (start && ch === 0x2D) {
                if (this.source.charCodeAt(this.index + 1) === 0x2D && this.source.charCodeAt(this.index + 2) === 0x3E) {
                    this.index += 3;
                    const comment = this.skipSingleLineComment(3);
                    if (this.trackComment) {
                        comments = comments?.concat(comment);
                    }
                } else {
                    break;
                }
            } else if (ch === 0x3C && !this.isModule) {
                if (this.source.slice(this.index + 1, this.index + 4) === '!--') {
                    this.index += 4;
                    const comment = this.skipSingleLineComment(4);
                    if (this.trackComment) {
                        comments = comments?.concat(comment);
                    }
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return comments;
    }
    isFutureReservedWord(id) {
        switch(id){
            case 'enum':
            case 'export':
            case 'import':
            case 'super':
                return true;
            default:
                return false;
        }
    }
    isStrictModeReservedWord(id) {
        switch(id){
            case 'implements':
            case 'interface':
            case 'package':
            case 'private':
            case 'protected':
            case 'public':
            case 'static':
            case 'yield':
            case 'let':
                return true;
            default:
                return false;
        }
    }
    isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }
    isKeyword(id) {
        switch(id.length){
            case 2:
                return id === 'if' || id === 'in' || id === 'do';
            case 3:
                return id === 'var' || id === 'for' || id === 'new' || id === 'try' || id === 'let';
            case 4:
                return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
            case 5:
                return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || id === 'yield' || id === 'class' || id === 'super';
            case 6:
                return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
            case 7:
                return id === 'default' || id === 'finally' || id === 'extends';
            case 8:
                return id === 'function' || id === 'continue' || id === 'debugger';
            case 10:
                return id === 'instanceof';
            default:
                return false;
        }
    }
    codePointAt(i) {
        let cp = this.source.charCodeAt(i);
        if (cp >= 0xD800 && cp <= 0xDBFF) {
            const second = this.source.charCodeAt(i + 1);
            if (second >= 0xDC00 && second <= 0xDFFF) {
                const first = cp;
                cp = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
            }
        }
        return cp;
    }
    scanHexEscape(prefix) {
        const len = prefix === 'u' ? 4 : 2;
        let code = 0;
        for(let i = 0; i < len; ++i){
            if (!this.eof() && Character.isHexDigit(this.source.charCodeAt(this.index))) {
                code = code * 16 + hexValue(this.source[this.index++]);
            } else {
                return null;
            }
        }
        return String.fromCharCode(code);
    }
    tryToScanUnicodeCodePointEscape() {
        let ch = this.source[this.index];
        let code = 0;
        if (ch === '}') {
            return null;
        }
        while(!this.eof()){
            ch = this.source[this.index++];
            if (!Character.isHexDigit(ch.charCodeAt(0))) {
                break;
            }
            code = code * 16 + hexValue(ch);
        }
        if (code > 0x10FFFF || ch !== '}') {
            return null;
        }
        return Character.fromCodePoint(code);
    }
    scanUnicodeCodePointEscape() {
        const result = this.tryToScanUnicodeCodePointEscape();
        if (result === null) {
            return this.throwUnexpectedToken();
        }
        return result;
    }
    getIdentifier() {
        const start = this.index++;
        while(!this.eof()){
            const ch = this.source.charCodeAt(this.index);
            if (ch === 0x5C) {
                this.index = start;
                return this.getComplexIdentifier();
            } else if (ch >= 0xD800 && ch < 0xDFFF) {
                this.index = start;
                return this.getComplexIdentifier();
            }
            if (Character.isIdentifierPart(ch)) {
                ++this.index;
            } else {
                break;
            }
        }
        return this.source.slice(start, this.index);
    }
    getComplexIdentifier() {
        let cp = this.codePointAt(this.index);
        let id = Character.fromCodePoint(cp);
        this.index += id.length;
        let ch;
        if (cp === 0x5C) {
            if (this.source.charCodeAt(this.index) !== 0x75) {
                this.throwUnexpectedToken();
            }
            ++this.index;
            if (this.source[this.index] === '{') {
                ++this.index;
                ch = this.scanUnicodeCodePointEscape();
            } else {
                ch = this.scanHexEscape('u');
                if (ch === null || ch === '\\' || !Character.isIdentifierStart(ch.charCodeAt(0))) {
                    this.throwUnexpectedToken();
                }
            }
            id = ch;
        }
        while(!this.eof()){
            cp = this.codePointAt(this.index);
            if (!Character.isIdentifierPart(cp)) {
                break;
            }
            ch = Character.fromCodePoint(cp);
            id += ch;
            this.index += ch.length;
            if (cp === 0x5C) {
                id = id.substr(0, id.length - 1);
                if (this.source.charCodeAt(this.index) !== 0x75) {
                    this.throwUnexpectedToken();
                }
                ++this.index;
                if (this.source[this.index] === '{') {
                    ++this.index;
                    ch = this.scanUnicodeCodePointEscape();
                } else {
                    ch = this.scanHexEscape('u');
                    if (ch === null || ch === '\\' || !Character.isIdentifierPart(ch.charCodeAt(0))) {
                        this.throwUnexpectedToken();
                    }
                }
                id += ch;
            }
        }
        return id;
    }
    octalToDecimal(ch) {
        let octal = ch !== '0';
        let code = octalValue(ch);
        if (!this.eof() && Character.isOctalDigit(this.source.charCodeAt(this.index))) {
            octal = true;
            code = code * 8 + octalValue(this.source[this.index++]);
            if ('0123'.indexOf(ch) >= 0 && !this.eof() && Character.isOctalDigit(this.source.charCodeAt(this.index))) {
                code = code * 8 + octalValue(this.source[this.index++]);
            }
        }
        return {
            code: code,
            octal: octal
        };
    }
    scanIdentifier() {
        let type;
        const start = this.index;
        const id = this.source.charCodeAt(start) === 0x5C ? this.getComplexIdentifier() : this.getIdentifier();
        if (id.length === 1) {
            type = Token.Identifier;
        } else if (this.isKeyword(id)) {
            type = Token.Keyword;
        } else if (id === 'null') {
            type = Token.NullLiteral;
        } else if (id === 'true' || id === 'false') {
            type = Token.BooleanLiteral;
        } else {
            type = Token.Identifier;
        }
        if (type !== Token.Identifier && start + id.length !== this.index) {
            const restore = this.index;
            this.index = start;
            this.tolerateUnexpectedToken(Messages.InvalidEscapedReservedWord);
            this.index = restore;
        }
        return {
            type: type,
            value: id,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanPunctuator() {
        const start = this.index;
        let str = this.source[this.index];
        switch(str){
            case '(':
            case '{':
                if (str === '{') {
                    this.curlyStack.push('{');
                }
                ++this.index;
                break;
            case '.':
                ++this.index;
                if (this.source[this.index] === '.' && this.source[this.index + 1] === '.') {
                    this.index += 2;
                    str = '...';
                }
                break;
            case '}':
                ++this.index;
                this.curlyStack.pop();
                break;
            case '?':
                ++this.index;
                if (this.source[this.index] === '?') {
                    ++this.index;
                    str = '??';
                }
                if (this.source[this.index] === '.' && !/^\d$/.test(this.source[this.index + 1])) {
                    ++this.index;
                    str = '?.';
                }
                break;
            case ')':
            case ';':
            case ',':
            case '[':
            case ']':
            case ':':
            case '~':
                ++this.index;
                break;
            default:
                str = this.source.substr(this.index, 4);
                if (str === '>>>=') {
                    this.index += 4;
                } else {
                    str = str.substr(0, 3);
                    if (str === '===' || str === '!==' || str === '>>>' || str === '<<=' || str === '>>=' || str === '**=') {
                        this.index += 3;
                    } else {
                        str = str.substr(0, 2);
                        if (str === '&&' || str === '||' || str === '??' || str === '==' || str === '!=' || str === '+=' || str === '-=' || str === '*=' || str === '/=' || str === '++' || str === '--' || str === '<<' || str === '>>' || str === '&=' || str === '|=' || str === '^=' || str === '%=' || str === '<=' || str === '>=' || str === '=>' || str === '**') {
                            this.index += 2;
                        } else {
                            str = this.source[this.index];
                            if ('<>=!+-*%&|^/'.indexOf(str) >= 0) {
                                ++this.index;
                            }
                        }
                    }
                }
        }
        if (this.index === start) {
            this.throwUnexpectedToken();
        }
        return {
            type: Token.Punctuator,
            value: str,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanHexLiteral(start) {
        let num = '';
        while(!this.eof()){
            if (!Character.isHexDigit(this.source.charCodeAt(this.index))) {
                break;
            }
            num += this.source[this.index++];
        }
        if (num.length === 0) {
            this.throwUnexpectedToken();
        }
        if (Character.isIdentifierStart(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }
        return {
            type: Token.NumericLiteral,
            value: parseInt('0x' + num, 16),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanBinaryLiteral(start) {
        let num = '';
        let ch;
        while(!this.eof()){
            ch = this.source[this.index];
            if (ch !== '0' && ch !== '1') {
                break;
            }
            num += this.source[this.index++];
        }
        if (num.length === 0) {
            this.throwUnexpectedToken();
        }
        if (!this.eof()) {
            ch = this.source.charCodeAt(this.index);
            if (Character.isIdentifierStart(ch) || Character.isDecimalDigit(ch)) {
                this.throwUnexpectedToken();
            }
        }
        return {
            type: Token.NumericLiteral,
            value: parseInt(num, 2),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanOctalLiteral(prefix, start) {
        let num = '';
        let octal = false;
        if (Character.isOctalDigit(prefix.charCodeAt(0))) {
            octal = true;
            num = '0' + this.source[this.index++];
        } else {
            ++this.index;
        }
        while(!this.eof()){
            if (!Character.isOctalDigit(this.source.charCodeAt(this.index))) {
                break;
            }
            num += this.source[this.index++];
        }
        if (!octal && num.length === 0) {
            this.throwUnexpectedToken();
        }
        if (Character.isIdentifierStart(this.source.charCodeAt(this.index)) || Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }
        return {
            type: Token.NumericLiteral,
            value: parseInt(num, 8),
            octal: octal,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    isImplicitOctalLiteral() {
        for(let i = this.index + 1; i < this.length; ++i){
            const ch = this.source[i];
            if (ch === '8' || ch === '9') {
                return false;
            }
            if (!Character.isOctalDigit(ch.charCodeAt(0))) {
                return true;
            }
        }
        return true;
    }
    scanNumericLiteral() {
        const start = this.index;
        let ch = this.source[start];
        assert1(Character.isDecimalDigit(ch.charCodeAt(0)) || ch === '.', 'Numeric literal must start with a decimal digit or a decimal point');
        let num = '';
        if (ch !== '.') {
            num = this.source[this.index++];
            ch = this.source[this.index];
            if (num === '0') {
                if (ch === 'x' || ch === 'X') {
                    ++this.index;
                    return this.scanHexLiteral(start);
                }
                if (ch === 'b' || ch === 'B') {
                    ++this.index;
                    return this.scanBinaryLiteral(start);
                }
                if (ch === 'o' || ch === 'O') {
                    return this.scanOctalLiteral(ch, start);
                }
                if (ch && Character.isOctalDigit(ch.charCodeAt(0))) {
                    if (this.isImplicitOctalLiteral()) {
                        return this.scanOctalLiteral(ch, start);
                    }
                }
            }
            while(Character.isDecimalDigit(this.source.charCodeAt(this.index))){
                num += this.source[this.index++];
            }
            ch = this.source[this.index];
        }
        if (ch === '.') {
            num += this.source[this.index++];
            while(Character.isDecimalDigit(this.source.charCodeAt(this.index))){
                num += this.source[this.index++];
            }
            ch = this.source[this.index];
        }
        if (ch === 'e' || ch === 'E') {
            num += this.source[this.index++];
            ch = this.source[this.index];
            if (ch === '+' || ch === '-') {
                num += this.source[this.index++];
            }
            if (Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                while(Character.isDecimalDigit(this.source.charCodeAt(this.index))){
                    num += this.source[this.index++];
                }
            } else {
                this.throwUnexpectedToken();
            }
        }
        if (Character.isIdentifierStart(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }
        return {
            type: Token.NumericLiteral,
            value: parseFloat(num),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanStringLiteral() {
        const start = this.index;
        let quote = this.source[start];
        assert1(quote === '\'' || quote === '"', 'String literal must starts with a quote');
        ++this.index;
        let octal = false;
        let str = '';
        while(!this.eof()){
            let ch = this.source[this.index++];
            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = this.source[this.index++];
                if (!ch || !Character.isLineTerminator(ch.charCodeAt(0))) {
                    switch(ch){
                        case 'u':
                            if (this.source[this.index] === '{') {
                                ++this.index;
                                str += this.scanUnicodeCodePointEscape();
                            } else {
                                const unescapedChar = this.scanHexEscape(ch);
                                if (unescapedChar === null) {
                                    this.throwUnexpectedToken();
                                }
                                str += unescapedChar;
                            }
                            break;
                        case 'x':
                            const unescaped = this.scanHexEscape(ch);
                            if (unescaped === null) {
                                this.throwUnexpectedToken(Messages.InvalidHexEscapeSequence);
                            }
                            str += unescaped;
                            break;
                        case 'n':
                            str += '\n';
                            break;
                        case 'r':
                            str += '\r';
                            break;
                        case 't':
                            str += '\t';
                            break;
                        case 'b':
                            str += '\b';
                            break;
                        case 'f':
                            str += '\f';
                            break;
                        case 'v':
                            str += '\x0B';
                            break;
                        case '8':
                        case '9':
                            str += ch;
                            this.tolerateUnexpectedToken();
                            break;
                        default:
                            if (ch && Character.isOctalDigit(ch.charCodeAt(0))) {
                                const octToDec = this.octalToDecimal(ch);
                                octal = octToDec.octal || octal;
                                str += String.fromCharCode(octToDec.code);
                            } else {
                                str += ch;
                            }
                            break;
                    }
                } else {
                    ++this.lineNumber;
                    if (ch === '\r' && this.source[this.index] === '\n') {
                        ++this.index;
                    }
                    this.lineStart = this.index;
                }
            } else if (Character.isLineTerminator(ch.charCodeAt(0))) {
                break;
            } else {
                str += ch;
            }
        }
        if (quote !== '') {
            this.index = start;
            this.throwUnexpectedToken();
        }
        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanTemplate() {
        let cooked = '';
        let terminated = false;
        const start = this.index;
        const head = this.source[start] === '`';
        let tail = false;
        let notEscapeSequenceHead = null;
        let rawOffset = 2;
        ++this.index;
        while(!this.eof()){
            let ch = this.source[this.index++];
            if (ch === '`') {
                rawOffset = 1;
                tail = true;
                terminated = true;
                break;
            } else if (ch === '$') {
                if (this.source[this.index] === '{') {
                    this.curlyStack.push('${');
                    ++this.index;
                    terminated = true;
                    break;
                }
                cooked += ch;
            } else if (notEscapeSequenceHead !== null) {
                continue;
            } else if (ch === '\\') {
                ch = this.source[this.index++];
                if (!Character.isLineTerminator(ch.charCodeAt(0))) {
                    switch(ch){
                        case 'n':
                            cooked += '\n';
                            break;
                        case 'r':
                            cooked += '\r';
                            break;
                        case 't':
                            cooked += '\t';
                            break;
                        case 'u':
                            if (this.source[this.index] === '{') {
                                ++this.index;
                                const unicodeCodePointEscape = this.tryToScanUnicodeCodePointEscape();
                                if (unicodeCodePointEscape === null) {
                                    notEscapeSequenceHead = 'u';
                                } else {
                                    cooked += unicodeCodePointEscape;
                                }
                            } else {
                                const unescapedChar = this.scanHexEscape(ch);
                                if (unescapedChar === null) {
                                    notEscapeSequenceHead = 'u';
                                } else {
                                    cooked += unescapedChar;
                                }
                            }
                            break;
                        case 'x':
                            const unescaped = this.scanHexEscape(ch);
                            if (unescaped === null) {
                                notEscapeSequenceHead = 'x';
                            } else {
                                cooked += unescaped;
                            }
                            break;
                        case 'b':
                            cooked += '\b';
                            break;
                        case 'f':
                            cooked += '\f';
                            break;
                        case 'v':
                            cooked += '\v';
                            break;
                        default:
                            if (ch === '0') {
                                if (Character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                                    notEscapeSequenceHead = '0';
                                } else {
                                    cooked += '\0';
                                }
                            } else if (Character.isDecimalDigitChar(ch)) {
                                notEscapeSequenceHead = ch;
                            } else {
                                cooked += ch;
                            }
                            break;
                    }
                } else {
                    ++this.lineNumber;
                    if (ch === '\r' && this.source[this.index] === '\n') {
                        ++this.index;
                    }
                    this.lineStart = this.index;
                }
            } else if (Character.isLineTerminator(ch.charCodeAt(0))) {
                ++this.lineNumber;
                if (ch === '\r' && this.source[this.index] === '\n') {
                    ++this.index;
                }
                this.lineStart = this.index;
                cooked += '\n';
            } else {
                cooked += ch;
            }
        }
        if (!terminated) {
            this.throwUnexpectedToken();
        }
        if (!head) {
            this.curlyStack.pop();
        }
        return {
            type: Token.Template,
            value: this.source.slice(start + 1, this.index - rawOffset),
            cooked: notEscapeSequenceHead === null ? cooked : null,
            head: head,
            tail: tail,
            notEscapeSequenceHead: notEscapeSequenceHead,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    testRegExp(pattern, flags) {
        const astralSubstitute = '\uFFFF';
        let tmp = pattern;
        if (flags.indexOf('u') >= 0) {
            tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, ($0, $1, $2)=>{
                const codePoint = parseInt($1 || $2, 16);
                if (codePoint > 0x10FFFF) {
                    this.throwUnexpectedToken(Messages.InvalidRegExp);
                }
                if (codePoint <= 0xFFFF) {
                    return String.fromCharCode(codePoint);
                }
                return astralSubstitute;
            }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute);
        }
        try {
            RegExp(tmp);
        } catch (e) {
            this.throwUnexpectedToken(Messages.InvalidRegExp);
        }
        try {
            return new RegExp(pattern, flags);
        } catch (exception) {
            return null;
        }
    }
    scanRegExpBody() {
        let ch = this.source[this.index];
        assert1(ch === '/', 'Regular expression literal must start with a slash');
        let str = this.source[this.index++];
        let classMarker = false;
        let terminated = false;
        while(!this.eof()){
            ch = this.source[this.index++];
            str += ch;
            if (ch === '\\') {
                ch = this.source[this.index++];
                if (Character.isLineTerminator(ch.charCodeAt(0))) {
                    this.throwUnexpectedToken(Messages.UnterminatedRegExp);
                }
                str += ch;
            } else if (Character.isLineTerminator(ch.charCodeAt(0))) {
                this.throwUnexpectedToken(Messages.UnterminatedRegExp);
            } else if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                }
            }
        }
        if (!terminated) {
            this.throwUnexpectedToken(Messages.UnterminatedRegExp);
        }
        return str.substr(1, str.length - 2);
    }
    scanRegExpFlags() {
        let str = '';
        let flags = '';
        while(!this.eof()){
            let ch = this.source[this.index];
            if (!Character.isIdentifierPart(ch.charCodeAt(0))) {
                break;
            }
            ++this.index;
            if (ch === '\\' && !this.eof()) {
                ch = this.source[this.index];
                if (ch === 'u') {
                    ++this.index;
                    let restore = this.index;
                    const __char = this.scanHexEscape('u');
                    if (__char !== null) {
                        flags += __char;
                        for(str += '\\u'; restore < this.index; ++restore){
                            str += this.source[restore];
                        }
                    } else {
                        this.index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                    this.tolerateUnexpectedToken();
                } else {
                    str += '\\';
                    this.tolerateUnexpectedToken();
                }
            } else {
                flags += ch;
                str += ch;
            }
        }
        return flags;
    }
    scanRegExp() {
        const start = this.index;
        const pattern = this.scanRegExpBody();
        const flags = this.scanRegExpFlags();
        const value = this.testRegExp(pattern, flags);
        return {
            type: Token.RegularExpression,
            value: '',
            pattern: pattern,
            flags: flags,
            regex: value,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    lex() {
        if (this.eof()) {
            return {
                type: Token.EOF,
                value: '',
                lineNumber: this.lineNumber,
                lineStart: this.lineStart,
                start: this.index,
                end: this.index
            };
        }
        const cp = this.source.charCodeAt(this.index);
        if (Character.isIdentifierStart(cp)) {
            return this.scanIdentifier();
        }
        if (cp === 0x28 || cp === 0x29 || cp === 0x3B) {
            return this.scanPunctuator();
        }
        if (cp === 0x27 || cp === 0x22) {
            return this.scanStringLiteral();
        }
        if (cp === 0x2E) {
            if (Character.isDecimalDigit(this.source.charCodeAt(this.index + 1))) {
                return this.scanNumericLiteral();
            }
            return this.scanPunctuator();
        }
        if (Character.isDecimalDigit(cp)) {
            return this.scanNumericLiteral();
        }
        if (cp === 0x60 || cp === 0x7D && this.curlyStack[this.curlyStack.length - 1] === '${') {
            return this.scanTemplate();
        }
        if (cp >= 0xD800 && cp < 0xDFFF) {
            if (Character.isIdentifierStart(this.codePointAt(this.index))) {
                return this.scanIdentifier();
            }
        }
        return this.scanPunctuator();
    }
}
const ArrowParameterPlaceHolder = 'ArrowParameterPlaceHolder';
class Parser {
    config;
    delegate;
    errorHandler;
    scanner;
    operatorPrecedence;
    lookahead;
    hasLineTerminator;
    context;
    tokens;
    startMarker;
    lastMarker;
    constructor(code, options = {}, delegate){
        this.config = {
            range: typeof options.range === 'boolean' && options.range,
            loc: typeof options.loc === 'boolean' && options.loc,
            source: null,
            tokens: typeof options.tokens === 'boolean' && options.tokens,
            comment: typeof options.comment === 'boolean' && options.comment,
            tolerant: typeof options.tolerant === 'boolean' && options.tolerant
        };
        if (this.config.loc && options.source && options.source !== null) {
            this.config.source = String(options.source);
        }
        this.delegate = delegate;
        this.errorHandler = new ErrorHandler();
        this.errorHandler.tolerant = this.config.tolerant;
        this.scanner = new Scanner(code, this.errorHandler);
        this.scanner.trackComment = this.config.comment;
        this.operatorPrecedence = {
            ')': 0,
            ';': 0,
            ',': 0,
            '=': 0,
            ']': 0,
            '??': 5,
            '||': 6,
            '&&': 7,
            '|': 8,
            '^': 9,
            '&': 10,
            '==': 11,
            '!=': 11,
            '===': 11,
            '!==': 11,
            '<': 12,
            '>': 12,
            '<=': 12,
            '>=': 12,
            '<<': 13,
            '>>': 13,
            '>>>': 13,
            '+': 14,
            '-': 14,
            '*': 15,
            '/': 15,
            '%': 15
        };
        this.lookahead = {
            type: Token.EOF,
            value: '',
            lineNumber: this.scanner.lineNumber,
            lineStart: 0,
            start: 0,
            end: 0
        };
        this.hasLineTerminator = false;
        this.context = {
            isModule: false,
            isAsync: false,
            allowIn: true,
            allowStrictDirective: true,
            allowYield: true,
            firstCoverInitializedNameError: null,
            isAssignmentTarget: false,
            isBindingElement: false,
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            inClassConstructor: false,
            labelSet: {},
            strict: false
        };
        this.tokens = [];
        this.startMarker = {
            index: 0,
            line: this.scanner.lineNumber,
            column: 0
        };
        this.lastMarker = {
            index: 0,
            line: this.scanner.lineNumber,
            column: 0
        };
        this.nextToken();
        this.lastMarker = {
            index: this.scanner.index,
            line: this.scanner.lineNumber,
            column: this.scanner.index - this.scanner.lineStart
        };
    }
    throwError(messageFormat, ...values) {
        const args = values.slice();
        const msg = messageFormat.replace(/%(\d)/g, (whole, idx)=>{
            assert1(idx < args.length, 'Message reference must be in range');
            return args[idx];
        });
        const index = this.lastMarker.index;
        const line = this.lastMarker.line;
        const column = this.lastMarker.column + 1;
        throw this.errorHandler.createError(index, line, column, msg);
    }
    tolerateError(messageFormat, ...values) {
        const args = values.slice();
        const msg = messageFormat.replace(/%(\d)/g, (whole, idx)=>{
            assert1(idx < args.length, 'Message reference must be in range');
            return args[idx];
        });
        const index = this.lastMarker.index;
        const line = this.scanner.lineNumber;
        const column = this.lastMarker.column + 1;
        this.errorHandler.tolerateError(index, line, column, msg);
    }
    unexpectedTokenError(token, message) {
        let msg = message || Messages.UnexpectedToken;
        let value;
        if (token) {
            if (!message) {
                msg = token.type === Token.EOF ? Messages.UnexpectedEOS : token.type === Token.Identifier ? Messages.UnexpectedIdentifier : token.type === Token.NumericLiteral ? Messages.UnexpectedNumber : token.type === Token.StringLiteral ? Messages.UnexpectedString : token.type === Token.Template ? Messages.UnexpectedTemplate : Messages.UnexpectedToken;
                if (token.type === Token.Keyword) {
                    if (this.scanner.isFutureReservedWord(token.value)) {
                        msg = Messages.UnexpectedReserved;
                    } else if (this.context.strict && this.scanner.isStrictModeReservedWord(token.value)) {
                        msg = Messages.StrictReservedWord;
                    }
                }
            }
            value = token.value;
        } else {
            value = 'ILLEGAL';
        }
        msg = msg.replace('%0', value);
        if (token && typeof token.lineNumber === 'number') {
            const index = token.start;
            const line = token.lineNumber;
            const lastMarkerLineStart = this.lastMarker.index - this.lastMarker.column;
            const column = token.start - lastMarkerLineStart + 1;
            return this.errorHandler.createError(index, line, column, msg);
        } else {
            const index = this.lastMarker.index;
            const line = this.lastMarker.line;
            const column = this.lastMarker.column + 1;
            return this.errorHandler.createError(index, line, column, msg);
        }
    }
    throwUnexpectedToken(token, message) {
        throw this.unexpectedTokenError(token, message);
    }
    tolerateUnexpectedToken(token, message) {
        this.errorHandler.tolerate(this.unexpectedTokenError(token, message));
    }
    tolerateInvalidLoopStatement() {
        if (this.matchKeyword("class") || this.matchKeyword("function")) {
            this.tolerateError(Messages.UnexpectedToken, this.lookahead);
        }
    }
    collectComments() {
        if (!this.config.comment) {
            this.scanner.scanComments();
        } else {
            const comments = this.scanner.scanComments();
            if (comments.length > 0 && this.delegate) {
                for(let i = 0; i < comments.length; ++i){
                    const e = comments[i];
                    const node = {
                        type: e.multiLine ? 'BlockComment' : 'LineComment',
                        value: this.scanner.source.slice(e.slice[0], e.slice[1])
                    };
                    if (this.config.range) {
                        node.range = e.range;
                    }
                    if (this.config.loc) {
                        node.loc = e.loc;
                    }
                    const metadata = {
                        start: {
                            line: e.loc.start.line,
                            column: e.loc.start.column,
                            offset: e.range[0]
                        },
                        end: {
                            line: e.loc.end.line,
                            column: e.loc.end.column,
                            offset: e.range[1]
                        }
                    };
                    this.delegate(node, metadata);
                }
            }
        }
    }
    getTokenRaw(token) {
        return this.scanner.source.slice(token.start, token.end);
    }
    convertToken(token) {
        const t = {
            type: TokenName[token.type],
            value: this.getTokenRaw(token)
        };
        if (this.config.range) {
            t.range = [
                token.start,
                token.end
            ];
        }
        if (this.config.loc) {
            t.loc = {
                start: {
                    line: this.startMarker.line,
                    column: this.startMarker.column
                },
                end: {
                    line: this.scanner.lineNumber,
                    column: this.scanner.index - this.scanner.lineStart
                }
            };
        }
        if (token.type === Token.RegularExpression) {
            const pattern = token.pattern;
            const flags = token.flags;
            t.regex = {
                pattern,
                flags
            };
        }
        return t;
    }
    nextToken() {
        const token = this.lookahead;
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        this.collectComments();
        if (this.scanner.index !== this.startMarker.index) {
            this.startMarker.index = this.scanner.index;
            this.startMarker.line = this.scanner.lineNumber;
            this.startMarker.column = this.scanner.index - this.scanner.lineStart;
        }
        const next = this.scanner.lex();
        this.hasLineTerminator = token.lineNumber !== next.lineNumber;
        if (next && this.context.strict && next.type === Token.Identifier) {
            if (this.scanner.isStrictModeReservedWord(next.value)) {
                next.type = Token.Keyword;
            }
        }
        this.lookahead = next;
        if (this.config.tokens && next.type !== Token.EOF) {
            this.tokens.push(this.convertToken(next));
        }
        return token;
    }
    nextRegexToken() {
        this.collectComments();
        const token = this.scanner.scanRegExp();
        if (this.config.tokens) {
            this.tokens.pop();
            this.tokens.push(this.convertToken(token));
        }
        this.lookahead = token;
        this.nextToken();
        return token;
    }
    createNode() {
        return {
            index: this.startMarker.index,
            line: this.startMarker.line,
            column: this.startMarker.column
        };
    }
    startNode(token, lastLineStart = 0) {
        let column = token.start - token.lineStart;
        let line = token.lineNumber;
        if (column < 0) {
            column += lastLineStart;
            line--;
        }
        return {
            index: token.start,
            line: line,
            column: column
        };
    }
    finalize(marker, node) {
        if (this.config.range) {
            node.range = [
                marker.index,
                this.lastMarker.index
            ];
        }
        if (this.config.loc) {
            node.loc = {
                start: {
                    line: marker.line,
                    column: marker.column
                },
                end: {
                    line: this.lastMarker.line,
                    column: this.lastMarker.column
                }
            };
            if (this.config.source) {
                node.loc.source = this.config.source;
            }
        }
        if (this.delegate) {
            const metadata = {
                start: {
                    line: marker.line,
                    column: marker.column,
                    offset: marker.index
                },
                end: {
                    line: this.lastMarker.line,
                    column: this.lastMarker.column,
                    offset: this.lastMarker.index
                }
            };
            this.delegate(node, metadata);
        }
        return node;
    }
    expect(value) {
        const token = this.nextToken();
        if (token.type !== Token.Punctuator || token.value !== value) {
            this.throwUnexpectedToken(token);
        }
    }
    expectCommaSeparator() {
        if (this.config.tolerant) {
            const token = this.lookahead;
            if (token.type === Token.Punctuator && token.value === ',') {
                this.nextToken();
            } else if (token.type === Token.Punctuator && token.value === ';') {
                this.nextToken();
                this.tolerateUnexpectedToken(token);
            } else {
                this.tolerateUnexpectedToken(token, Messages.UnexpectedToken);
            }
        } else {
            this.expect(',');
        }
    }
    expectKeyword(keyword) {
        const token = this.nextToken();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            this.throwUnexpectedToken(token);
        }
    }
    match(value) {
        return this.lookahead.type === Token.Punctuator && this.lookahead.value === value;
    }
    matchKeyword(keyword) {
        return this.lookahead.type === Token.Keyword && this.lookahead.value === keyword;
    }
    matchContextualKeyword(keyword) {
        return this.lookahead.type === Token.Identifier && this.lookahead.value === keyword;
    }
    matchAssign() {
        if (this.lookahead.type !== Token.Punctuator) {
            return false;
        }
        const op = this.lookahead.value;
        return op === '=' || op === '*=' || op === '**=' || op === '/=' || op === '%=' || op === '+=' || op === '-=' || op === '<<=' || op === '>>=' || op === '>>>=' || op === '&=' || op === '^=' || op === '|=';
    }
    isolateCoverGrammar(parseFunction) {
        const previousIsBindingElement = this.context.isBindingElement;
        const previousIsAssignmentTarget = this.context.isAssignmentTarget;
        const previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
        this.context.isBindingElement = true;
        this.context.isAssignmentTarget = true;
        this.context.firstCoverInitializedNameError = null;
        const result = parseFunction.call(this);
        if (this.context.firstCoverInitializedNameError !== null) {
            this.throwUnexpectedToken(this.context.firstCoverInitializedNameError);
        }
        this.context.isBindingElement = previousIsBindingElement;
        this.context.isAssignmentTarget = previousIsAssignmentTarget;
        this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError;
        return result;
    }
    inheritCoverGrammar(parseFunction) {
        const previousIsBindingElement = this.context.isBindingElement;
        const previousIsAssignmentTarget = this.context.isAssignmentTarget;
        const previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
        this.context.isBindingElement = true;
        this.context.isAssignmentTarget = true;
        this.context.firstCoverInitializedNameError = null;
        const result = parseFunction.call(this);
        this.context.isBindingElement = this.context.isBindingElement && previousIsBindingElement;
        this.context.isAssignmentTarget = this.context.isAssignmentTarget && previousIsAssignmentTarget;
        this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError || this.context.firstCoverInitializedNameError;
        return result;
    }
    consumeSemicolon() {
        if (this.match(';')) {
            this.nextToken();
        } else if (!this.hasLineTerminator) {
            if (this.lookahead.type !== Token.EOF && !this.match('}')) {
                this.throwUnexpectedToken(this.lookahead);
            }
            this.lastMarker.index = this.startMarker.index;
            this.lastMarker.line = this.startMarker.line;
            this.lastMarker.column = this.startMarker.column;
        }
    }
    parsePrimaryExpression() {
        const node = this.createNode();
        let expr;
        let token, raw;
        switch(this.lookahead.type){
            case Token.Identifier:
                if ((this.context.isModule || this.context.isAsync) && this.lookahead.value === 'await') {
                    this.tolerateUnexpectedToken(this.lookahead);
                }
                expr = this.matchAsyncFunction() ? this.parseFunctionExpression() : this.finalize(node, new Identifier(this.nextToken().value));
                break;
            case Token.NumericLiteral:
            case Token.StringLiteral:
                if (this.context.strict && this.lookahead.octal) {
                    this.tolerateUnexpectedToken(this.lookahead, Messages.StrictOctalLiteral);
                }
                this.context.isAssignmentTarget = false;
                this.context.isBindingElement = false;
                token = this.nextToken();
                raw = this.getTokenRaw(token);
                expr = this.finalize(node, new Literal(token.value, raw));
                break;
            case Token.BooleanLiteral:
                this.context.isAssignmentTarget = false;
                this.context.isBindingElement = false;
                token = this.nextToken();
                raw = this.getTokenRaw(token);
                expr = this.finalize(node, new Literal(token.value === 'true', raw));
                break;
            case Token.NullLiteral:
                this.context.isAssignmentTarget = false;
                this.context.isBindingElement = false;
                token = this.nextToken();
                raw = this.getTokenRaw(token);
                expr = this.finalize(node, new Literal(null, raw));
                break;
            case Token.Template:
                expr = this.parseTemplateLiteral({
                    isTagged: false
                });
                break;
            case Token.Punctuator:
                switch(this.lookahead.value){
                    case '(':
                        this.context.isBindingElement = false;
                        expr = this.inheritCoverGrammar(this.parseGroupExpression);
                        break;
                    case '[':
                        expr = this.inheritCoverGrammar(this.parseArrayInitializer);
                        break;
                    case '{':
                        expr = this.inheritCoverGrammar(this.parseObjectInitializer);
                        break;
                    case '/':
                    case '/=':
                        this.context.isAssignmentTarget = false;
                        this.context.isBindingElement = false;
                        this.scanner.index = this.startMarker.index;
                        token = this.nextRegexToken();
                        raw = this.getTokenRaw(token);
                        expr = this.finalize(node, new RegexLiteral(token.regex, raw, token.pattern, token.flags));
                        break;
                    default:
                        expr = this.throwUnexpectedToken(this.nextToken());
                }
                break;
            case Token.Keyword:
                if (!this.context.strict && this.context.allowYield && this.matchKeyword('yield')) {
                    expr = this.parseIdentifierName();
                } else if (!this.context.strict && this.matchKeyword('let')) {
                    expr = this.finalize(node, new Identifier(this.nextToken().value));
                } else {
                    this.context.isAssignmentTarget = false;
                    this.context.isBindingElement = false;
                    if (this.matchKeyword('function')) {
                        expr = this.parseFunctionExpression();
                    } else if (this.matchKeyword('this')) {
                        this.nextToken();
                        expr = this.finalize(node, new ThisExpression());
                    } else if (this.matchKeyword('class')) {
                        expr = this.parseClassExpression();
                    } else if (this.matchImportCall()) {
                        expr = this.parseImportCall();
                    } else if (this.matchImportMeta()) {
                        if (!this.context.isModule) {
                            this.tolerateUnexpectedToken(this.lookahead, Messages.CannotUseImportMetaOutsideAModule);
                        }
                        expr = this.parseImportMeta();
                    } else {
                        expr = this.throwUnexpectedToken(this.nextToken());
                    }
                }
                break;
            default:
                expr = this.throwUnexpectedToken(this.nextToken());
        }
        return expr;
    }
    parseSpreadElement() {
        const node = this.createNode();
        this.expect('...');
        const arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
        return this.finalize(node, new SpreadElement(arg));
    }
    parseArrayInitializer() {
        const node = this.createNode();
        const elements = [];
        this.expect('[');
        while(!this.match(']')){
            if (this.match(',')) {
                this.nextToken();
                elements.push(null);
            } else if (this.match('...')) {
                const element = this.parseSpreadElement();
                if (!this.match(']')) {
                    this.context.isAssignmentTarget = false;
                    this.context.isBindingElement = false;
                    this.expect(',');
                }
                elements.push(element);
            } else {
                elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
                if (!this.match(']')) {
                    this.expect(',');
                }
            }
        }
        this.expect(']');
        return this.finalize(node, new ArrayExpression(elements));
    }
    parsePropertyMethod(params) {
        this.context.isAssignmentTarget = false;
        this.context.isBindingElement = false;
        const previousStrict = this.context.strict;
        const previousAllowStrictDirective = this.context.allowStrictDirective;
        this.context.allowStrictDirective = params.simple;
        const body = this.isolateCoverGrammar(this.parseFunctionSourceElements);
        if (this.context.strict && params.firstRestricted) {
            this.tolerateUnexpectedToken(params.firstRestricted, params.message);
        }
        if (this.context.strict && params.stricted) {
            this.tolerateUnexpectedToken(params.stricted, params.message);
        }
        this.context.strict = previousStrict;
        this.context.allowStrictDirective = previousAllowStrictDirective;
        return body;
    }
    parsePropertyMethodFunction(isGenerator) {
        const node = this.createNode();
        const previousAllowYield = this.context.allowYield;
        this.context.allowYield = true;
        const params = this.parseFormalParameters();
        const method = this.parsePropertyMethod(params);
        this.context.allowYield = previousAllowYield;
        return this.finalize(node, new FunctionExpression(null, params.params, method, isGenerator));
    }
    parsePropertyMethodAsyncFunction(isGenerator) {
        const node = this.createNode();
        const previousAllowYield = this.context.allowYield;
        const previousIsAsync = this.context.isAsync;
        this.context.allowYield = false;
        this.context.isAsync = true;
        const params = this.parseFormalParameters();
        const method = this.parsePropertyMethod(params);
        this.context.allowYield = previousAllowYield;
        this.context.isAsync = previousIsAsync;
        return this.finalize(node, new AsyncFunctionExpression(null, params.params, method, isGenerator));
    }
    parseObjectPropertyKey() {
        const node = this.createNode();
        const token = this.nextToken();
        let key;
        switch(token.type){
            case Token.StringLiteral:
            case Token.NumericLiteral:
                if (this.context.strict && token.octal) {
                    this.tolerateUnexpectedToken(token, Messages.StrictOctalLiteral);
                }
                const raw = this.getTokenRaw(token);
                key = this.finalize(node, new Literal(token.value, raw));
                break;
            case Token.Identifier:
            case Token.BooleanLiteral:
            case Token.NullLiteral:
            case Token.Keyword:
                key = this.finalize(node, new Identifier(token.value));
                break;
            case Token.Punctuator:
                if (token.value === '[') {
                    key = this.isolateCoverGrammar(this.parseAssignmentExpression);
                    this.expect(']');
                } else {
                    key = this.throwUnexpectedToken(token);
                }
                break;
            default:
                key = this.throwUnexpectedToken(token);
        }
        return key;
    }
    isPropertyKey(key, value) {
        return key.type === Syntax.Identifier && key.name === value || key.type === Syntax.Literal && key.value === value;
    }
    parseObjectProperty(hasProto) {
        const node = this.createNode();
        const token = this.lookahead;
        let kind;
        let key = null;
        let value = null;
        let computed = false;
        let method = false;
        let shorthand = false;
        let isAsync = false;
        let isGenerator = false;
        if (token.type === Token.Identifier) {
            const id = token.value;
            this.nextToken();
            computed = this.match('[');
            isAsync = !this.hasLineTerminator && id === 'async' && !this.match(':') && !this.match('(') && !this.match(',');
            isGenerator = this.match('*');
            if (isGenerator) {
                this.nextToken();
            }
            key = isAsync ? this.parseObjectPropertyKey() : this.finalize(node, new Identifier(id));
        } else if (this.match('*')) {
            this.nextToken();
        } else {
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
        }
        const lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
        if (token.type === Token.Identifier && !isAsync && token.value === 'get' && lookaheadPropertyKey) {
            kind = 'get';
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
            this.context.allowYield = false;
            value = this.parseGetterMethod();
        } else if (token.type === Token.Identifier && !isAsync && token.value === 'set' && lookaheadPropertyKey) {
            kind = 'set';
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
            value = this.parseSetterMethod();
        } else if (token.type === Token.Punctuator && token.value === '*' && lookaheadPropertyKey) {
            kind = 'init';
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
            value = this.parseGeneratorMethod();
            method = true;
        } else {
            if (!key) {
                this.throwUnexpectedToken(this.lookahead);
            }
            kind = 'init';
            if (this.match(':') && !isAsync) {
                if (!computed && this.isPropertyKey(key, '__proto__')) {
                    if (hasProto.value) {
                        this.tolerateError(Messages.DuplicateProtoProperty);
                    }
                    hasProto.value = true;
                }
                this.nextToken();
                value = this.inheritCoverGrammar(this.parseAssignmentExpression);
            } else if (this.match('(')) {
                value = isAsync ? this.parsePropertyMethodAsyncFunction(isGenerator) : this.parsePropertyMethodFunction(isGenerator);
                method = true;
            } else if (token.type === Token.Identifier) {
                const id = this.finalize(node, new Identifier(token.value));
                if (this.match('=')) {
                    this.context.firstCoverInitializedNameError = this.lookahead;
                    this.nextToken();
                    shorthand = true;
                    const init = this.isolateCoverGrammar(this.parseAssignmentExpression);
                    value = this.finalize(node, new AssignmentPattern(id, init));
                } else {
                    shorthand = true;
                    value = id;
                }
            } else {
                this.throwUnexpectedToken(this.nextToken());
            }
        }
        return this.finalize(node, new Property(kind, key, computed, value, method, shorthand));
    }
    parseObjectInitializer() {
        const node = this.createNode();
        this.expect('{');
        const properties = [];
        const hasProto = {
            value: false
        };
        while(!this.match('}')){
            properties.push(this.match('...') ? this.parseSpreadElement() : this.parseObjectProperty(hasProto));
            if (!this.match('}')) {
                this.expectCommaSeparator();
            }
        }
        this.expect('}');
        return this.finalize(node, new ObjectExpression(properties));
    }
    throwTemplateLiteralEarlyErrors(token) {
        switch(token.notEscapeSequenceHead){
            case 'u':
                return this.throwUnexpectedToken(token, Messages.InvalidUnicodeEscapeSequence);
            case 'x':
                return this.throwUnexpectedToken(token, Messages.InvalidHexEscapeSequence);
            case '8':
            case '9':
                return this.throwUnexpectedToken(token, Messages.TemplateEscape89);
            default:
                return this.throwUnexpectedToken(token, Messages.TemplateOctalLiteral);
        }
    }
    parseTemplateHead(options) {
        assert1(this.lookahead.head, 'Template literal must start with a template head');
        const node = this.createNode();
        const token = this.nextToken();
        if (!options.isTagged && token.notEscapeSequenceHead !== null) {
            this.throwTemplateLiteralEarlyErrors(token);
        }
        const raw = token.value;
        const cooked = token.cooked;
        return this.finalize(node, new TemplateElement({
            raw,
            cooked
        }, token.tail));
    }
    parseTemplateElement(options) {
        if (this.lookahead.type !== Token.Template) {
            this.throwUnexpectedToken();
        }
        const node = this.createNode();
        const token = this.nextToken();
        if (!options.isTagged && token.notEscapeSequenceHead !== null) {
            this.throwTemplateLiteralEarlyErrors(token);
        }
        const raw = token.value;
        const cooked = token.cooked;
        return this.finalize(node, new TemplateElement({
            raw,
            cooked
        }, token.tail));
    }
    parseTemplateLiteral(options) {
        const node = this.createNode();
        const expressions = [];
        const quasis = [];
        let quasi = this.parseTemplateHead(options);
        quasis.push(quasi);
        while(!quasi.tail){
            expressions.push(this.parseExpression());
            quasi = this.parseTemplateElement(options);
            quasis.push(quasi);
        }
        return this.finalize(node, new TemplateLiteral(quasis, expressions));
    }
    reinterpretExpressionAsPattern(expr) {
        switch(expr.type){
            case Syntax.Identifier:
            case Syntax.MemberExpression:
            case Syntax.RestElement:
            case Syntax.AssignmentPattern:
                break;
            case Syntax.SpreadElement:
                expr.type = Syntax.RestElement;
                this.reinterpretExpressionAsPattern(expr.argument);
                break;
            case Syntax.ArrayExpression:
                expr.type = Syntax.ArrayPattern;
                for(let i = 0; i < expr.elements.length; i++){
                    if (expr.elements[i] !== null) {
                        this.reinterpretExpressionAsPattern(expr.elements[i]);
                    }
                }
                break;
            case Syntax.ObjectExpression:
                expr.type = Syntax.ObjectPattern;
                for(let i = 0; i < expr.properties.length; i++){
                    const property = expr.properties[i];
                    this.reinterpretExpressionAsPattern(property.type === Syntax.SpreadElement ? property : property.value);
                }
                break;
            case Syntax.AssignmentExpression:
                expr.type = Syntax.AssignmentPattern;
                delete expr.operator;
                this.reinterpretExpressionAsPattern(expr.left);
                break;
            default:
                break;
        }
    }
    parseGroupExpression() {
        let expr;
        this.expect('(');
        if (this.match(')')) {
            this.nextToken();
            if (!this.match('=>')) {
                this.expect('=>');
            }
            expr = {
                type: ArrowParameterPlaceHolder,
                params: [],
                async: false
            };
        } else {
            const startToken = this.lookahead;
            const params = [];
            if (this.match('...')) {
                expr = this.parseRestElement(params);
                this.expect(')');
                if (!this.match('=>')) {
                    this.expect('=>');
                }
                expr = {
                    type: ArrowParameterPlaceHolder,
                    params: [
                        expr
                    ],
                    async: false
                };
            } else {
                let arrow = false;
                this.context.isBindingElement = true;
                expr = this.inheritCoverGrammar(this.parseAssignmentExpression);
                if (this.match(',')) {
                    const expressions = [];
                    this.context.isAssignmentTarget = false;
                    expressions.push(expr);
                    while(this.lookahead.type !== Token.EOF){
                        if (!this.match(',')) {
                            break;
                        }
                        this.nextToken();
                        if (this.match(')')) {
                            this.nextToken();
                            for(let i = 0; i < expressions.length; i++){
                                this.reinterpretExpressionAsPattern(expressions[i]);
                            }
                            arrow = true;
                            expr = {
                                type: ArrowParameterPlaceHolder,
                                params: expressions,
                                async: false
                            };
                        } else if (this.match('...')) {
                            if (!this.context.isBindingElement) {
                                this.throwUnexpectedToken(this.lookahead);
                            }
                            expressions.push(this.parseRestElement(params));
                            this.expect(')');
                            if (!this.match('=>')) {
                                this.expect('=>');
                            }
                            this.context.isBindingElement = false;
                            for(let i = 0; i < expressions.length; i++){
                                this.reinterpretExpressionAsPattern(expressions[i]);
                            }
                            arrow = true;
                            expr = {
                                type: ArrowParameterPlaceHolder,
                                params: expressions,
                                async: false
                            };
                        } else {
                            expressions.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
                        }
                        if (arrow) {
                            break;
                        }
                    }
                    if (!arrow) {
                        expr = this.finalize(this.startNode(startToken), new SequenceExpression(expressions));
                    }
                }
                if (!arrow) {
                    this.expect(')');
                    if (this.match('=>')) {
                        if (expr.type === Syntax.Identifier && expr.name === 'yield') {
                            arrow = true;
                            expr = {
                                type: ArrowParameterPlaceHolder,
                                params: [
                                    expr
                                ],
                                async: false
                            };
                        }
                        if (!arrow) {
                            if (!this.context.isBindingElement) {
                                this.throwUnexpectedToken(this.lookahead);
                            }
                            if (expr.type === Syntax.SequenceExpression) {
                                for(let i = 0; i < expr.expressions.length; i++){
                                    this.reinterpretExpressionAsPattern(expr.expressions[i]);
                                }
                            } else {
                                this.reinterpretExpressionAsPattern(expr);
                            }
                            const parameters = expr.type === Syntax.SequenceExpression ? expr.expressions : [
                                expr
                            ];
                            expr = {
                                type: ArrowParameterPlaceHolder,
                                params: parameters,
                                async: false
                            };
                        }
                    }
                    this.context.isBindingElement = false;
                }
            }
        }
        return expr;
    }
    parseArguments() {
        this.expect('(');
        const args = [];
        if (!this.match(')')) {
            while(true){
                const expr = this.match('...') ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAssignmentExpression);
                args.push(expr);
                if (this.match(')')) {
                    break;
                }
                this.expectCommaSeparator();
                if (this.match(')')) {
                    break;
                }
            }
        }
        this.expect(')');
        return args;
    }
    isIdentifierName(token) {
        return token.type === Token.Identifier || token.type === Token.Keyword || token.type === Token.BooleanLiteral || token.type === Token.NullLiteral;
    }
    parseIdentifierName() {
        const node = this.createNode();
        const token = this.nextToken();
        if (!this.isIdentifierName(token)) {
            this.throwUnexpectedToken(token);
        }
        return this.finalize(node, new Identifier(token.value));
    }
    parseNewExpression() {
        const node = this.createNode();
        const id = this.parseIdentifierName();
        assert1(id.name === 'new', 'New expression must start with `new`');
        let expr;
        if (this.match('.')) {
            this.nextToken();
            if (this.lookahead.type === Token.Identifier && this.context.inFunctionBody && this.lookahead.value === 'target') {
                const property = this.parseIdentifierName();
                expr = new MetaProperty(id, property);
            } else {
                this.throwUnexpectedToken(this.lookahead);
            }
        } else if (this.matchKeyword('import')) {
            this.throwUnexpectedToken(this.lookahead);
        } else {
            const callee = this.isolateCoverGrammar(this.parseLeftHandSideExpression);
            const args = this.match('(') ? this.parseArguments() : [];
            expr = new NewExpression(callee, args);
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
        }
        return this.finalize(node, expr);
    }
    parseAsyncArgument() {
        const arg = this.parseAssignmentExpression();
        this.context.firstCoverInitializedNameError = null;
        return arg;
    }
    parseAsyncArguments() {
        this.expect('(');
        const args = [];
        if (!this.match(')')) {
            while(true){
                const expr = this.match('...') ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAsyncArgument);
                args.push(expr);
                if (this.match(')')) {
                    break;
                }
                this.expectCommaSeparator();
                if (this.match(')')) {
                    break;
                }
            }
        }
        this.expect(')');
        return args;
    }
    matchImportCall() {
        let match = this.matchKeyword('import');
        if (match) {
            const state = this.scanner.saveState();
            this.scanner.scanComments();
            const next = this.scanner.lex();
            this.scanner.restoreState(state);
            match = next.type === Token.Punctuator && next.value === '(';
        }
        return match;
    }
    parseImportCall() {
        const node = this.createNode();
        this.expectKeyword('import');
        return this.finalize(node, new Import());
    }
    matchImportMeta() {
        let match = this.matchKeyword('import');
        if (match) {
            const state = this.scanner.saveState();
            this.scanner.scanComments();
            const dot = this.scanner.lex();
            if (dot.type === Token.Punctuator && dot.value === '.') {
                this.scanner.scanComments();
                const meta = this.scanner.lex();
                match = meta.type === Token.Identifier && meta.value === 'meta';
                if (match) {
                    if (meta.end - meta.start !== 'meta'.length) {
                        this.tolerateUnexpectedToken(meta, Messages.InvalidEscapedReservedWord);
                    }
                }
            } else {
                match = false;
            }
            this.scanner.restoreState(state);
        }
        return match;
    }
    parseImportMeta() {
        const node = this.createNode();
        const id = this.parseIdentifierName();
        this.expect('.');
        const property = this.parseIdentifierName();
        this.context.isAssignmentTarget = false;
        return this.finalize(node, new MetaProperty(id, property));
    }
    parseLeftHandSideExpressionAllowCall() {
        const startToken = this.lookahead;
        const maybeAsync = this.matchContextualKeyword('async');
        const previousAllowIn = this.context.allowIn;
        this.context.allowIn = true;
        let expr;
        const isSuper = this.matchKeyword('super');
        if (isSuper && this.context.inFunctionBody) {
            expr = this.createNode();
            this.nextToken();
            expr = this.finalize(expr, new Super());
            if (!this.match('(') && !this.match('.') && !this.match('[')) {
                this.throwUnexpectedToken(this.lookahead);
            }
        } else {
            expr = this.inheritCoverGrammar(this.matchKeyword('new') ? this.parseNewExpression : this.parsePrimaryExpression);
        }
        if (isSuper && this.match('(') && !this.context.inClassConstructor) {
            this.tolerateError(Messages.UnexpectedSuper);
        }
        let hasOptional = false;
        while(true){
            let optional = false;
            if (this.match('?.')) {
                optional = true;
                hasOptional = true;
                this.expect('?.');
            }
            if (this.match('(')) {
                const asyncArrow = maybeAsync && startToken.lineNumber === this.lookahead.lineNumber;
                this.context.isBindingElement = false;
                this.context.isAssignmentTarget = false;
                const args = asyncArrow ? this.parseAsyncArguments() : this.parseArguments();
                if (expr.type === Syntax.Import && args.length !== 1) {
                    this.tolerateError(Messages.BadImportCallArity);
                }
                expr = this.finalize(this.startNode(startToken), new CallExpression(expr, args, optional));
                if (asyncArrow && this.match('=>')) {
                    for(let i = 0; i < args.length; ++i){
                        this.reinterpretExpressionAsPattern(args[i]);
                    }
                    expr = {
                        type: ArrowParameterPlaceHolder,
                        params: args,
                        async: true
                    };
                }
            } else if (this.match('[')) {
                this.context.isBindingElement = false;
                this.context.isAssignmentTarget = !optional;
                this.expect('[');
                const property = this.isolateCoverGrammar(this.parseExpression);
                this.expect(']');
                expr = this.finalize(this.startNode(startToken), new ComputedMemberExpression(expr, property, optional));
            } else if (this.lookahead.type === Token.Template && this.lookahead.head) {
                if (optional) {
                    this.throwUnexpectedToken(this.lookahead);
                }
                if (hasOptional) {
                    this.throwError(Messages.InvalidTaggedTemplateOnOptionalChain);
                }
                const quasi = this.parseTemplateLiteral({
                    isTagged: true
                });
                expr = this.finalize(this.startNode(startToken), new TaggedTemplateExpression(expr, quasi));
            } else if (this.match('.') || optional) {
                this.context.isBindingElement = false;
                this.context.isAssignmentTarget = !optional;
                if (!optional) {
                    this.expect('.');
                }
                const property = this.parseIdentifierName();
                expr = this.finalize(this.startNode(startToken), new StaticMemberExpression(expr, property, optional));
            } else {
                break;
            }
        }
        this.context.allowIn = previousAllowIn;
        if (hasOptional) {
            return new ChainExpression(expr);
        }
        return expr;
    }
    parseSuper() {
        const node = this.createNode();
        this.expectKeyword('super');
        if (!this.match('[') && !this.match('.')) {
            this.throwUnexpectedToken(this.lookahead);
        }
        return this.finalize(node, new Super());
    }
    parseLeftHandSideExpression() {
        assert1(this.context.allowIn, 'callee of new expression always allow in keyword.');
        const node = this.startNode(this.lookahead);
        let expr = this.matchKeyword('super') && this.context.inFunctionBody ? this.parseSuper() : this.inheritCoverGrammar(this.matchKeyword('new') ? this.parseNewExpression : this.parsePrimaryExpression);
        let hasOptional = false;
        while(true){
            let optional = false;
            if (this.match('?.')) {
                optional = true;
                hasOptional = true;
                this.expect('?.');
            }
            if (this.match('[')) {
                this.context.isBindingElement = false;
                this.context.isAssignmentTarget = !optional;
                this.expect('[');
                const property = this.isolateCoverGrammar(this.parseExpression);
                this.expect(']');
                expr = this.finalize(node, new ComputedMemberExpression(expr, property, optional));
            } else if (this.lookahead.type === Token.Template && this.lookahead.head) {
                if (optional) {
                    this.throwUnexpectedToken(this.lookahead);
                }
                if (hasOptional) {
                    this.throwError(Messages.InvalidTaggedTemplateOnOptionalChain);
                }
                const quasi = this.parseTemplateLiteral({
                    isTagged: true
                });
                expr = this.finalize(node, new TaggedTemplateExpression(expr, quasi));
            } else if (this.match('.') || optional) {
                this.context.isBindingElement = false;
                this.context.isAssignmentTarget = !optional;
                if (!optional) {
                    this.expect('.');
                }
                const property = this.parseIdentifierName();
                expr = this.finalize(node, new StaticMemberExpression(expr, property, optional));
            } else {
                break;
            }
        }
        if (hasOptional) {
            return new ChainExpression(expr);
        }
        return expr;
    }
    parseUpdateExpression() {
        let expr;
        const startToken = this.lookahead;
        if (this.match('++') || this.match('--')) {
            const node = this.startNode(startToken);
            const token = this.nextToken();
            expr = this.inheritCoverGrammar(this.parseUnaryExpression);
            if (this.context.strict && expr.type === Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) {
                this.tolerateError(Messages.StrictLHSPrefix);
            }
            if (!this.context.isAssignmentTarget) {
                this.tolerateError(Messages.InvalidLHSInAssignment);
            }
            const prefix = true;
            expr = this.finalize(node, new UpdateExpression(token.value, expr, prefix));
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
        } else {
            expr = this.inheritCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
            if (!this.hasLineTerminator && this.lookahead.type === Token.Punctuator) {
                if (this.match('++') || this.match('--')) {
                    if (this.context.strict && expr.type === Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) {
                        this.tolerateError(Messages.StrictLHSPostfix);
                    }
                    if (!this.context.isAssignmentTarget) {
                        this.tolerateError(Messages.InvalidLHSInAssignment);
                    }
                    this.context.isAssignmentTarget = false;
                    this.context.isBindingElement = false;
                    const operator = this.nextToken().value;
                    const prefix = false;
                    expr = this.finalize(this.startNode(startToken), new UpdateExpression(operator, expr, prefix));
                }
            }
        }
        return expr;
    }
    parseAwaitExpression() {
        const node = this.createNode();
        this.nextToken();
        const argument = this.parseUnaryExpression();
        return this.finalize(node, new AwaitExpression(argument));
    }
    parseUnaryExpression() {
        let expr;
        if (this.match('+') || this.match('-') || this.match('~') || this.match('!') || this.matchKeyword('delete') || this.matchKeyword('void') || this.matchKeyword('typeof')) {
            const node = this.startNode(this.lookahead);
            const token = this.nextToken();
            expr = this.inheritCoverGrammar(this.parseUnaryExpression);
            expr = this.finalize(node, new UnaryExpression(token.value, expr));
            if (this.context.strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                this.tolerateError(Messages.StrictDelete);
            }
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
        } else if (this.context.isAsync && this.matchContextualKeyword('await')) {
            expr = this.parseAwaitExpression();
        } else {
            expr = this.parseUpdateExpression();
        }
        return expr;
    }
    parseExponentiationExpression() {
        const startToken = this.lookahead;
        let expr = this.inheritCoverGrammar(this.parseUnaryExpression);
        if (expr.type !== Syntax.UnaryExpression && this.match('**')) {
            this.nextToken();
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
            const left = expr;
            const right = this.isolateCoverGrammar(this.parseExponentiationExpression);
            expr = this.finalize(this.startNode(startToken), new BinaryExpression('**', left, right));
        }
        return expr;
    }
    binaryPrecedence(token) {
        const op = token.value;
        let precedence;
        if (token.type === Token.Punctuator) {
            precedence = this.operatorPrecedence[op] || 0;
        } else if (token.type === Token.Keyword) {
            precedence = op === 'instanceof' || this.context.allowIn && op === 'in' ? 12 : 0;
        } else {
            precedence = 0;
        }
        return precedence;
    }
    parseBinaryExpression() {
        const startToken = this.lookahead;
        let expr = this.inheritCoverGrammar(this.parseExponentiationExpression);
        let allowAndOr = true;
        let allowNullishCoalescing = true;
        const updateNullishCoalescingRestrictions = (token)=>{
            if (token.value === '&&' || token.value === '||') {
                allowNullishCoalescing = false;
            }
            if (token.value === '??') {
                allowAndOr = false;
            }
        };
        const token = this.lookahead;
        let prec = this.binaryPrecedence(token);
        if (prec > 0) {
            updateNullishCoalescingRestrictions(token);
            this.nextToken();
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
            const markers = [
                startToken,
                this.lookahead
            ];
            let left = expr;
            let right = this.isolateCoverGrammar(this.parseExponentiationExpression);
            const stack = [
                left,
                token.value,
                right
            ];
            const precedences = [
                prec
            ];
            while(true){
                prec = this.binaryPrecedence(this.lookahead);
                if (prec <= 0) {
                    break;
                }
                if (!allowAndOr && (this.lookahead.value === '&&' || this.lookahead.value === '||') || !allowNullishCoalescing && this.lookahead.value === '??') {
                    this.throwUnexpectedToken(this.lookahead);
                }
                updateNullishCoalescingRestrictions(this.lookahead);
                while(stack.length > 2 && prec <= precedences[precedences.length - 1]){
                    right = stack.pop();
                    const operator = stack.pop();
                    precedences.pop();
                    left = stack.pop();
                    markers.pop();
                    const marker = markers[markers.length - 1];
                    const node = this.startNode(marker, marker.lineStart);
                    stack.push(this.finalize(node, new BinaryExpression(operator, left, right)));
                }
                stack.push(this.nextToken().value);
                precedences.push(prec);
                markers.push(this.lookahead);
                stack.push(this.isolateCoverGrammar(this.parseExponentiationExpression));
            }
            let i = stack.length - 1;
            expr = stack[i];
            let lastMarker = markers.pop();
            while(i > 1){
                const marker = markers.pop();
                const lastLineStart = lastMarker && lastMarker.lineStart;
                const node = this.startNode(marker, lastLineStart);
                const operator = stack[i - 1];
                expr = this.finalize(node, new BinaryExpression(operator, stack[i - 2], expr));
                i -= 2;
                lastMarker = marker;
            }
        }
        return expr;
    }
    parseConditionalExpression() {
        const startToken = this.lookahead;
        let expr = this.inheritCoverGrammar(this.parseBinaryExpression);
        if (this.match('?')) {
            this.nextToken();
            const previousAllowIn = this.context.allowIn;
            this.context.allowIn = true;
            const consequent = this.isolateCoverGrammar(this.parseAssignmentExpression);
            this.context.allowIn = previousAllowIn;
            this.expect(':');
            const alternate = this.isolateCoverGrammar(this.parseAssignmentExpression);
            expr = this.finalize(this.startNode(startToken), new ConditionalExpression(expr, consequent, alternate));
            this.context.isAssignmentTarget = false;
            this.context.isBindingElement = false;
        }
        return expr;
    }
    checkPatternParam(options, param) {
        switch(param.type){
            case Syntax.Identifier:
                this.validateParam(options, param, param.name);
                break;
            case Syntax.RestElement:
                this.checkPatternParam(options, param.argument);
                break;
            case Syntax.AssignmentPattern:
                this.checkPatternParam(options, param.left);
                break;
            case Syntax.ArrayPattern:
                for(let i = 0; i < param.elements.length; i++){
                    if (param.elements[i] !== null) {
                        this.checkPatternParam(options, param.elements[i]);
                    }
                }
                break;
            case Syntax.ObjectPattern:
                for(let i = 0; i < param.properties.length; i++){
                    const property = param.properties[i];
                    this.checkPatternParam(options, property.type === Syntax.RestElement ? property : property.value);
                }
                break;
            default:
                break;
        }
        options.simple = options.simple && param instanceof Identifier;
    }
    reinterpretAsCoverFormalsList(expr) {
        let params = [
            expr
        ];
        const options = {
            simple: true,
            paramSet: {}
        };
        let asyncArrow = false;
        switch(expr.type){
            case Syntax.Identifier:
                break;
            case ArrowParameterPlaceHolder:
                params = expr.params;
                asyncArrow = expr.async;
                break;
            default:
                return null;
        }
        for(let i = 0; i < params.length; ++i){
            const param = params[i];
            if (param.type === Syntax.AssignmentPattern) {
                if (param.right.type === Syntax.YieldExpression) {
                    if (param.right.argument) {
                        this.throwUnexpectedToken(this.lookahead);
                    }
                    param.right.type = Syntax.Identifier;
                    param.right.name = 'yield';
                    delete param.right.argument;
                    delete param.right.delegate;
                }
            } else if (asyncArrow && param.type === Syntax.Identifier && param.name === 'await') {
                this.throwUnexpectedToken(this.lookahead);
            }
            this.checkPatternParam(options, param);
            params[i] = param;
        }
        if (this.context.strict || !this.context.allowYield) {
            for(let i = 0; i < params.length; ++i){
                const param = params[i];
                if (param.type === Syntax.YieldExpression) {
                    this.throwUnexpectedToken(this.lookahead);
                }
            }
        }
        if (options.hasDuplicateParameterNames) {
            const token = this.context.strict ? options.stricted : options.firstRestricted;
            this.throwUnexpectedToken(token, Messages.DuplicateParameter);
        }
        return {
            simple: options.simple,
            params: params,
            stricted: options.stricted,
            firstRestricted: options.firstRestricted,
            message: options.message
        };
    }
    parseAssignmentExpression() {
        let expr;
        if (!this.context.allowYield && this.matchKeyword('yield')) {
            expr = this.parseYieldExpression();
        } else {
            const startToken = this.lookahead;
            let token = startToken;
            expr = this.parseConditionalExpression();
            if (token.type === Token.Identifier && token.lineNumber === this.lookahead.lineNumber && token.value === 'async') {
                if (this.lookahead.type === Token.Identifier || this.matchKeyword('yield')) {
                    const arg = this.parsePrimaryExpression();
                    this.reinterpretExpressionAsPattern(arg);
                    expr = {
                        type: ArrowParameterPlaceHolder,
                        params: [
                            arg
                        ],
                        async: true
                    };
                }
            }
            if (expr.type === ArrowParameterPlaceHolder || this.match('=>')) {
                this.context.isAssignmentTarget = false;
                this.context.isBindingElement = false;
                const isAsync = expr.async;
                const list = this.reinterpretAsCoverFormalsList(expr);
                if (list) {
                    if (this.hasLineTerminator) {
                        this.tolerateUnexpectedToken(this.lookahead);
                    }
                    this.context.firstCoverInitializedNameError = null;
                    const previousStrict = this.context.strict;
                    const previousAllowStrictDirective = this.context.allowStrictDirective;
                    this.context.allowStrictDirective = list.simple;
                    const previousAllowYield = this.context.allowYield;
                    const previousIsAsync = this.context.isAsync;
                    this.context.allowYield = true;
                    this.context.isAsync = isAsync;
                    const node = this.startNode(startToken);
                    this.expect('=>');
                    let body;
                    if (this.match('{')) {
                        const previousAllowIn = this.context.allowIn;
                        this.context.allowIn = true;
                        body = this.parseFunctionSourceElements();
                        this.context.allowIn = previousAllowIn;
                    } else {
                        body = this.isolateCoverGrammar(this.parseAssignmentExpression);
                    }
                    const expression = body.type !== Syntax.BlockStatement;
                    if (this.context.strict && list.firstRestricted) {
                        this.throwUnexpectedToken(list.firstRestricted, list.message);
                    }
                    if (this.context.strict && list.stricted) {
                        this.tolerateUnexpectedToken(list.stricted, list.message);
                    }
                    expr = isAsync ? this.finalize(node, new AsyncArrowFunctionExpression(list.params, body, expression)) : this.finalize(node, new ArrowFunctionExpression(list.params, body, expression));
                    this.context.strict = previousStrict;
                    this.context.allowStrictDirective = previousAllowStrictDirective;
                    this.context.allowYield = previousAllowYield;
                    this.context.isAsync = previousIsAsync;
                }
            } else {
                if (this.matchAssign()) {
                    if (!this.context.isAssignmentTarget) {
                        this.tolerateError(Messages.InvalidLHSInAssignment);
                    }
                    if (this.context.strict && expr.type === Syntax.Identifier) {
                        const id = expr;
                        if (this.scanner.isRestrictedWord(id.name)) {
                            this.tolerateUnexpectedToken(token, Messages.StrictLHSAssignment);
                        }
                        if (this.scanner.isStrictModeReservedWord(id.name)) {
                            this.tolerateUnexpectedToken(token, Messages.StrictReservedWord);
                        }
                    }
                    if (!this.match('=')) {
                        this.context.isAssignmentTarget = false;
                        this.context.isBindingElement = false;
                    } else {
                        this.reinterpretExpressionAsPattern(expr);
                    }
                    token = this.nextToken();
                    const operator = token.value;
                    const right = this.isolateCoverGrammar(this.parseAssignmentExpression);
                    expr = this.finalize(this.startNode(startToken), new AssignmentExpression(operator, expr, right));
                    this.context.firstCoverInitializedNameError = null;
                }
            }
        }
        return expr;
    }
    parseExpression() {
        const startToken = this.lookahead;
        let expr = this.isolateCoverGrammar(this.parseAssignmentExpression);
        if (this.match(',')) {
            const expressions = [];
            expressions.push(expr);
            while(this.lookahead.type !== Token.EOF){
                if (!this.match(',')) {
                    break;
                }
                this.nextToken();
                expressions.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
            }
            expr = this.finalize(this.startNode(startToken), new SequenceExpression(expressions));
        }
        return expr;
    }
    parseStatementListItem() {
        let statement;
        this.context.isAssignmentTarget = true;
        this.context.isBindingElement = true;
        if (this.lookahead.type === Token.Keyword) {
            switch(this.lookahead.value){
                case 'export':
                    if (!this.context.isModule) {
                        this.tolerateUnexpectedToken(this.lookahead, Messages.IllegalExportDeclaration);
                    }
                    statement = this.parseExportDeclaration();
                    break;
                case 'import':
                    if (this.matchImportCall()) {
                        statement = this.parseExpressionStatement();
                    } else if (this.matchImportMeta()) {
                        statement = this.parseStatement();
                    } else {
                        if (!this.context.isModule) {
                            this.tolerateUnexpectedToken(this.lookahead, Messages.IllegalImportDeclaration);
                        }
                        statement = this.parseImportDeclaration();
                    }
                    break;
                case 'const':
                    statement = this.parseLexicalDeclaration({
                        inFor: false
                    });
                    break;
                case 'function':
                    statement = this.parseFunctionDeclaration();
                    break;
                case 'class':
                    statement = this.parseClassDeclaration();
                    break;
                case 'let':
                    statement = this.isLexicalDeclaration() ? this.parseLexicalDeclaration({
                        inFor: false
                    }) : this.parseStatement();
                    break;
                default:
                    statement = this.parseStatement();
                    break;
            }
        } else {
            statement = this.parseStatement();
        }
        return statement;
    }
    parseBlock() {
        const node = this.createNode();
        this.expect('{');
        const block = [];
        while(true){
            if (this.match('}')) {
                break;
            }
            block.push(this.parseStatementListItem());
        }
        this.expect('}');
        return this.finalize(node, new BlockStatement(block));
    }
    parseLexicalBinding(kind, options) {
        const node = this.createNode();
        const params = [];
        const id = this.parsePattern(params, kind);
        if (this.context.strict && id.type === Syntax.Identifier) {
            if (this.scanner.isRestrictedWord(id.name)) {
                this.tolerateError(Messages.StrictVarName);
            }
        }
        let init = null;
        if (kind === 'const') {
            if (!this.matchKeyword('in') && !this.matchContextualKeyword('of')) {
                if (this.match('=')) {
                    this.nextToken();
                    init = this.isolateCoverGrammar(this.parseAssignmentExpression);
                } else {
                    this.throwError(Messages.DeclarationMissingInitializer, 'const');
                }
            }
        } else if (!options.inFor && id.type !== Syntax.Identifier || this.match('=')) {
            this.expect('=');
            init = this.isolateCoverGrammar(this.parseAssignmentExpression);
        }
        return this.finalize(node, new VariableDeclarator(id, init));
    }
    parseBindingList(kind, options) {
        const list = [
            this.parseLexicalBinding(kind, options)
        ];
        while(this.match(',')){
            this.nextToken();
            list.push(this.parseLexicalBinding(kind, options));
        }
        return list;
    }
    isLexicalDeclaration() {
        const state = this.scanner.saveState();
        this.scanner.scanComments();
        const next = this.scanner.lex();
        this.scanner.restoreState(state);
        return next.type === Token.Identifier || next.type === Token.Punctuator && next.value === '[' || next.type === Token.Punctuator && next.value === '{' || next.type === Token.Keyword && next.value === 'let' || next.type === Token.Keyword && next.value === 'yield';
    }
    parseLexicalDeclaration(options) {
        const node = this.createNode();
        const kind = this.nextToken().value;
        assert1(kind === 'let' || kind === 'const', 'Lexical declaration must be either let or const');
        const declarations = this.parseBindingList(kind, options);
        this.consumeSemicolon();
        return this.finalize(node, new VariableDeclaration(declarations, kind));
    }
    parseBindingRestElement(params, kind) {
        const node = this.createNode();
        this.expect('...');
        const arg = this.parsePattern(params, kind);
        return this.finalize(node, new RestElement(arg));
    }
    parseArrayPattern(params, kind) {
        const node = this.createNode();
        this.expect('[');
        const elements = [];
        while(!this.match(']')){
            if (this.match(',')) {
                this.nextToken();
                elements.push(null);
            } else {
                if (this.match('...')) {
                    elements.push(this.parseBindingRestElement(params, kind));
                    break;
                } else {
                    elements.push(this.parsePatternWithDefault(params, kind));
                }
                if (!this.match(']')) {
                    this.expect(',');
                }
            }
        }
        this.expect(']');
        return this.finalize(node, new ArrayPattern(elements));
    }
    parsePropertyPattern(params, kind) {
        const node = this.createNode();
        let computed = false;
        let shorthand = false;
        let key;
        let value;
        if (this.lookahead.type === Token.Identifier) {
            const keyToken = this.lookahead;
            key = this.parseVariableIdentifier();
            const init = this.finalize(node, new Identifier(keyToken.value));
            if (this.match('=')) {
                params.push(keyToken);
                shorthand = true;
                this.nextToken();
                const expr = this.parseAssignmentExpression();
                value = this.finalize(this.startNode(keyToken), new AssignmentPattern(init, expr));
            } else if (!this.match(':')) {
                params.push(keyToken);
                shorthand = true;
                value = init;
            } else {
                this.expect(':');
                value = this.parsePatternWithDefault(params, kind);
            }
        } else {
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
            this.expect(':');
            value = this.parsePatternWithDefault(params, kind);
        }
        return this.finalize(node, new Property('init', key, computed, value, false, shorthand));
    }
    parseRestProperty(params) {
        const node = this.createNode();
        this.expect('...');
        const arg = this.parsePattern(params);
        if (this.match('=')) {
            this.throwError(Messages.DefaultRestProperty);
        }
        if (!this.match('}')) {
            this.throwError(Messages.PropertyAfterRestProperty);
        }
        return this.finalize(node, new RestElement(arg));
    }
    parseObjectPattern(params, kind) {
        const node = this.createNode();
        const properties = [];
        this.expect('{');
        while(!this.match('}')){
            properties.push(this.match('...') ? this.parseRestProperty(params) : this.parsePropertyPattern(params, kind));
            if (!this.match('}')) {
                this.expect(',');
            }
        }
        this.expect('}');
        return this.finalize(node, new ObjectPattern(properties));
    }
    parsePattern(params, kind) {
        let pattern;
        if (this.match('[')) {
            pattern = this.parseArrayPattern(params, kind);
        } else if (this.match('{')) {
            pattern = this.parseObjectPattern(params, kind);
        } else {
            if (this.matchKeyword('let') && (kind === 'const' || kind === 'let')) {
                this.tolerateUnexpectedToken(this.lookahead, Messages.LetInLexicalBinding);
            }
            params.push(this.lookahead);
            pattern = this.parseVariableIdentifier(kind);
        }
        return pattern;
    }
    parsePatternWithDefault(params, kind) {
        const startToken = this.lookahead;
        let pattern = this.parsePattern(params, kind);
        if (this.match('=')) {
            this.nextToken();
            const previousAllowYield = this.context.allowYield;
            this.context.allowYield = true;
            const right = this.isolateCoverGrammar(this.parseAssignmentExpression);
            this.context.allowYield = previousAllowYield;
            pattern = this.finalize(this.startNode(startToken), new AssignmentPattern(pattern, right));
        }
        return pattern;
    }
    parseVariableIdentifier(kind) {
        const node = this.createNode();
        const token = this.nextToken();
        if (token.type === Token.Keyword && token.value === 'yield') {
            if (this.context.strict) {
                this.tolerateUnexpectedToken(token, Messages.StrictReservedWord);
            } else if (!this.context.allowYield) {
                this.throwUnexpectedToken(token);
            }
        } else if (token.type !== Token.Identifier) {
            if (this.context.strict && token.type === Token.Keyword && this.scanner.isStrictModeReservedWord(token.value)) {
                this.tolerateUnexpectedToken(token, Messages.StrictReservedWord);
            } else {
                if (this.context.strict || token.value !== 'let' || kind !== 'var') {
                    this.throwUnexpectedToken(token);
                }
            }
        } else if ((this.context.isModule || this.context.isAsync) && token.type === Token.Identifier && token.value === 'await') {
            this.tolerateUnexpectedToken(token);
        }
        return this.finalize(node, new Identifier(token.value));
    }
    parseVariableDeclaration(options) {
        const node = this.createNode();
        const params = [];
        const id = this.parsePattern(params, 'var');
        if (this.context.strict && id.type === Syntax.Identifier) {
            if (this.scanner.isRestrictedWord(id.name)) {
                this.tolerateError(Messages.StrictVarName);
            }
        }
        let init = null;
        if (this.match('=')) {
            this.nextToken();
            init = this.isolateCoverGrammar(this.parseAssignmentExpression);
        } else if (id.type !== Syntax.Identifier && !options.inFor) {
            this.expect('=');
        }
        return this.finalize(node, new VariableDeclarator(id, init));
    }
    parseVariableDeclarationList(options) {
        const opt = {
            inFor: options.inFor
        };
        const list = [];
        list.push(this.parseVariableDeclaration(opt));
        while(this.match(',')){
            this.nextToken();
            list.push(this.parseVariableDeclaration(opt));
        }
        return list;
    }
    parseVariableStatement() {
        const node = this.createNode();
        this.expectKeyword('var');
        const declarations = this.parseVariableDeclarationList({
            inFor: false
        });
        this.consumeSemicolon();
        return this.finalize(node, new VariableDeclaration(declarations, 'var'));
    }
    parseEmptyStatement() {
        const node = this.createNode();
        this.expect(';');
        return this.finalize(node, new EmptyStatement());
    }
    parseExpressionStatement() {
        const node = this.createNode();
        const expr = this.parseExpression();
        this.consumeSemicolon();
        return this.finalize(node, new ExpressionStatement(expr));
    }
    parseIfClause() {
        if (this.context.strict && this.matchKeyword('function')) {
            this.tolerateError(Messages.StrictFunction);
        }
        return this.parseStatement();
    }
    parseIfStatement() {
        const node = this.createNode();
        let consequent;
        let alternate = null;
        this.expectKeyword('if');
        this.expect('(');
        const test = this.parseExpression();
        if (!this.match(')') && this.config.tolerant) {
            this.tolerateUnexpectedToken(this.nextToken());
            consequent = this.finalize(this.createNode(), new EmptyStatement());
        } else {
            this.expect(')');
            consequent = this.parseIfClause();
            if (this.matchKeyword('else')) {
                this.nextToken();
                alternate = this.parseIfClause();
            }
        }
        return this.finalize(node, new IfStatement(test, consequent, alternate));
    }
    parseDoWhileStatement() {
        const node = this.createNode();
        this.expectKeyword('do');
        this.tolerateInvalidLoopStatement();
        const previousInIteration = this.context.inIteration;
        this.context.inIteration = true;
        const body = this.parseStatement();
        this.context.inIteration = previousInIteration;
        this.expectKeyword('while');
        this.expect('(');
        const test = this.parseExpression();
        if (!this.match(')') && this.config.tolerant) {
            this.tolerateUnexpectedToken(this.nextToken());
        } else {
            this.expect(')');
            if (this.match(';')) {
                this.nextToken();
            }
        }
        return this.finalize(node, new DoWhileStatement(body, test));
    }
    parseWhileStatement() {
        const node = this.createNode();
        let body;
        this.expectKeyword('while');
        this.expect('(');
        const test = this.parseExpression();
        if (!this.match(')') && this.config.tolerant) {
            this.tolerateUnexpectedToken(this.nextToken());
            body = this.finalize(this.createNode(), new EmptyStatement());
        } else {
            this.expect(')');
            const previousInIteration = this.context.inIteration;
            this.context.inIteration = true;
            body = this.parseStatement();
            this.context.inIteration = previousInIteration;
        }
        return this.finalize(node, new WhileStatement(test, body));
    }
    parseForStatement() {
        let init = null;
        let test = null;
        let update = null;
        let forIn = true;
        let left, right;
        let _await = false;
        const node = this.createNode();
        this.expectKeyword('for');
        if (this.matchContextualKeyword('await')) {
            if (!this.context.isAsync) {
                this.tolerateUnexpectedToken(this.lookahead);
            }
            _await = true;
            this.nextToken();
        }
        this.expect('(');
        if (this.match(';')) {
            this.nextToken();
        } else {
            if (this.matchKeyword('var')) {
                init = this.createNode();
                this.nextToken();
                const previousAllowIn = this.context.allowIn;
                this.context.allowIn = false;
                const declarations = this.parseVariableDeclarationList({
                    inFor: true
                });
                this.context.allowIn = previousAllowIn;
                if (!_await && declarations.length === 1 && this.matchKeyword('in')) {
                    const decl = declarations[0];
                    if (decl.init && (decl.id.type === Syntax.ArrayPattern || decl.id.type === Syntax.ObjectPattern || this.context.strict)) {
                        this.tolerateError(Messages.ForInOfLoopInitializer, 'for-in');
                    }
                    init = this.finalize(init, new VariableDeclaration(declarations, 'var'));
                    this.nextToken();
                    left = init;
                    right = this.parseExpression();
                    init = null;
                } else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword('of')) {
                    init = this.finalize(init, new VariableDeclaration(declarations, 'var'));
                    this.nextToken();
                    left = init;
                    right = this.parseAssignmentExpression();
                    init = null;
                    forIn = false;
                } else {
                    init = this.finalize(init, new VariableDeclaration(declarations, 'var'));
                    this.expect(';');
                }
            } else if (this.matchKeyword('const') || this.matchKeyword('let')) {
                init = this.createNode();
                const kind = this.nextToken().value;
                if (!this.context.strict && this.lookahead.value === 'in') {
                    init = this.finalize(init, new Identifier(kind));
                    this.nextToken();
                    left = init;
                    right = this.parseExpression();
                    init = null;
                } else {
                    const previousAllowIn = this.context.allowIn;
                    this.context.allowIn = false;
                    const declarations = this.parseBindingList(kind, {
                        inFor: true
                    });
                    this.context.allowIn = previousAllowIn;
                    if (declarations.length === 1 && declarations[0].init === null && this.matchKeyword('in')) {
                        init = this.finalize(init, new VariableDeclaration(declarations, kind));
                        this.nextToken();
                        left = init;
                        right = this.parseExpression();
                        init = null;
                    } else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword('of')) {
                        init = this.finalize(init, new VariableDeclaration(declarations, kind));
                        this.nextToken();
                        left = init;
                        right = this.parseAssignmentExpression();
                        init = null;
                        forIn = false;
                    } else {
                        this.consumeSemicolon();
                        init = this.finalize(init, new VariableDeclaration(declarations, kind));
                    }
                }
            } else {
                const initStartToken = this.lookahead;
                const previousIsBindingElement = this.context.isBindingElement;
                const previousIsAssignmentTarget = this.context.isAssignmentTarget;
                const previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
                const previousAllowIn = this.context.allowIn;
                this.context.allowIn = false;
                init = this.inheritCoverGrammar(this.parseAssignmentExpression);
                this.context.allowIn = previousAllowIn;
                if (this.matchKeyword('in')) {
                    if (!this.context.isAssignmentTarget || init.type === Syntax.AssignmentExpression) {
                        this.tolerateError(Messages.InvalidLHSInForIn);
                    }
                    this.nextToken();
                    this.reinterpretExpressionAsPattern(init);
                    left = init;
                    right = this.parseExpression();
                    init = null;
                } else if (this.matchContextualKeyword('of')) {
                    if (!this.context.isAssignmentTarget || init.type === Syntax.AssignmentExpression) {
                        this.tolerateError(Messages.InvalidLHSInForLoop);
                    }
                    this.nextToken();
                    this.reinterpretExpressionAsPattern(init);
                    left = init;
                    right = this.parseAssignmentExpression();
                    init = null;
                    forIn = false;
                } else {
                    this.context.isBindingElement = previousIsBindingElement;
                    this.context.isAssignmentTarget = previousIsAssignmentTarget;
                    this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError;
                    if (this.match(',')) {
                        const initSeq = [
                            init
                        ];
                        while(this.match(',')){
                            this.nextToken();
                            initSeq.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
                        }
                        init = this.finalize(this.startNode(initStartToken), new SequenceExpression(initSeq));
                    }
                    this.expect(';');
                }
            }
        }
        if (typeof left === 'undefined') {
            if (!this.match(';')) {
                test = this.isolateCoverGrammar(this.parseExpression);
            }
            this.expect(';');
            if (!this.match(')')) {
                update = this.isolateCoverGrammar(this.parseExpression);
            }
        }
        let body;
        if (!this.match(')') && this.config.tolerant) {
            this.tolerateUnexpectedToken(this.nextToken());
            body = this.finalize(this.createNode(), new EmptyStatement());
        } else {
            this.expect(')');
            this.tolerateInvalidLoopStatement();
            const previousInIteration = this.context.inIteration;
            this.context.inIteration = true;
            body = this.isolateCoverGrammar(this.parseStatement);
            this.context.inIteration = previousInIteration;
        }
        return typeof left === 'undefined' ? this.finalize(node, new ForStatement(init, test, update, body)) : forIn ? this.finalize(node, new ForInStatement(left, right, body)) : this.finalize(node, new ForOfStatement(left, right, body, _await));
    }
    parseContinueStatement() {
        const node = this.createNode();
        this.expectKeyword('continue');
        let label = null;
        if (this.lookahead.type === Token.Identifier && !this.hasLineTerminator) {
            const id = this.parseVariableIdentifier();
            label = id;
            const key = '$' + id.name;
            if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) {
                this.throwError(Messages.UnknownLabel, id.name);
            }
        }
        this.consumeSemicolon();
        if (label === null && !this.context.inIteration) {
            this.throwError(Messages.IllegalContinue);
        }
        return this.finalize(node, new ContinueStatement(label));
    }
    parseBreakStatement() {
        const node = this.createNode();
        this.expectKeyword('break');
        let label = null;
        if (this.lookahead.type === Token.Identifier && !this.hasLineTerminator) {
            const id = this.parseVariableIdentifier();
            const key = '$' + id.name;
            if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) {
                this.throwError(Messages.UnknownLabel, id.name);
            }
            label = id;
        }
        this.consumeSemicolon();
        if (label === null && !this.context.inIteration && !this.context.inSwitch) {
            this.throwError(Messages.IllegalBreak);
        }
        return this.finalize(node, new BreakStatement(label));
    }
    parseReturnStatement() {
        if (!this.context.inFunctionBody) {
            this.tolerateError(Messages.IllegalReturn);
        }
        const node = this.createNode();
        this.expectKeyword('return');
        const hasArgument = !this.match(';') && !this.match('}') && !this.hasLineTerminator && this.lookahead.type !== Token.EOF || this.lookahead.type === Token.StringLiteral || this.lookahead.type === Token.Template;
        const argument = hasArgument ? this.parseExpression() : null;
        this.consumeSemicolon();
        return this.finalize(node, new ReturnStatement(argument));
    }
    parseWithStatement() {
        if (this.context.strict) {
            this.tolerateError(Messages.StrictModeWith);
        }
        const node = this.createNode();
        let body;
        this.expectKeyword('with');
        this.expect('(');
        const object = this.parseExpression();
        if (!this.match(')') && this.config.tolerant) {
            this.tolerateUnexpectedToken(this.nextToken());
            body = this.finalize(this.createNode(), new EmptyStatement());
        } else {
            this.expect(')');
            body = this.parseStatement();
        }
        return this.finalize(node, new WithStatement(object, body));
    }
    parseSwitchCase() {
        const node = this.createNode();
        let test;
        if (this.matchKeyword('default')) {
            this.nextToken();
            test = null;
        } else {
            this.expectKeyword('case');
            test = this.parseExpression();
        }
        this.expect(':');
        const consequent = [];
        while(true){
            if (this.match('}') || this.matchKeyword('default') || this.matchKeyword('case')) {
                break;
            }
            consequent.push(this.parseStatementListItem());
        }
        return this.finalize(node, new SwitchCase(test, consequent));
    }
    parseSwitchStatement() {
        const node = this.createNode();
        this.expectKeyword('switch');
        this.expect('(');
        const discriminant = this.parseExpression();
        this.expect(')');
        const previousInSwitch = this.context.inSwitch;
        this.context.inSwitch = true;
        const cases = [];
        let defaultFound = false;
        this.expect('{');
        while(true){
            if (this.match('}')) {
                break;
            }
            const clause = this.parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    this.throwError(Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }
        this.expect('}');
        this.context.inSwitch = previousInSwitch;
        return this.finalize(node, new SwitchStatement(discriminant, cases));
    }
    parseLabelledStatement() {
        const node = this.createNode();
        const expr = this.parseExpression();
        let statement;
        if (expr.type === Syntax.Identifier && this.match(':')) {
            this.nextToken();
            const id = expr;
            const key = '$' + id.name;
            if (Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) {
                this.throwError(Messages.Redeclaration, 'Label', id.name);
            }
            this.context.labelSet[key] = true;
            let body;
            if (this.matchKeyword('class')) {
                this.tolerateUnexpectedToken(this.lookahead);
                body = this.parseClassDeclaration();
            } else if (this.matchKeyword('function')) {
                const token = this.lookahead;
                const declaration = this.parseFunctionDeclaration();
                if (this.context.strict) {
                    this.tolerateUnexpectedToken(token, Messages.StrictFunction);
                } else if (declaration.generator) {
                    this.tolerateUnexpectedToken(token, Messages.GeneratorInLegacyContext);
                }
                body = declaration;
            } else {
                body = this.parseStatement();
            }
            delete this.context.labelSet[key];
            statement = new LabeledStatement(id, body);
        } else {
            this.consumeSemicolon();
            statement = new ExpressionStatement(expr);
        }
        return this.finalize(node, statement);
    }
    parseThrowStatement() {
        const node = this.createNode();
        this.expectKeyword('throw');
        if (this.hasLineTerminator) {
            this.throwError(Messages.NewlineAfterThrow);
        }
        const argument = this.parseExpression();
        this.consumeSemicolon();
        return this.finalize(node, new ThrowStatement(argument));
    }
    parseCatchClause() {
        const node = this.createNode();
        this.expectKeyword('catch');
        let param = null;
        if (this.match('(')) {
            this.expect('(');
            if (this.match(')')) {
                this.throwUnexpectedToken(this.lookahead);
            }
            const params = [];
            param = this.parsePattern(params);
            const paramMap = {};
            for(let i = 0; i < params.length; i++){
                const key = '$' + params[i].value;
                if (Object.prototype.hasOwnProperty.call(paramMap, key)) {
                    this.tolerateError(Messages.DuplicateBinding, params[i].value);
                }
                paramMap[key] = true;
            }
            if (this.context.strict && param.type === Syntax.Identifier) {
                if (this.scanner.isRestrictedWord(param.name)) {
                    this.tolerateError(Messages.StrictCatchVariable);
                }
            }
            this.expect(')');
        }
        const body = this.parseBlock();
        return this.finalize(node, new CatchClause(param, body));
    }
    parseFinallyClause() {
        this.expectKeyword('finally');
        return this.parseBlock();
    }
    parseTryStatement() {
        const node = this.createNode();
        this.expectKeyword('try');
        const block = this.parseBlock();
        const handler = this.matchKeyword('catch') ? this.parseCatchClause() : null;
        const finalizer = this.matchKeyword('finally') ? this.parseFinallyClause() : null;
        if (!handler && !finalizer) {
            this.throwError(Messages.NoCatchOrFinally);
        }
        return this.finalize(node, new TryStatement(block, handler, finalizer));
    }
    parseDebuggerStatement() {
        const node = this.createNode();
        this.expectKeyword('debugger');
        this.consumeSemicolon();
        return this.finalize(node, new DebuggerStatement());
    }
    parseStatement() {
        let statement;
        switch(this.lookahead.type){
            case Token.BooleanLiteral:
            case Token.NullLiteral:
            case Token.NumericLiteral:
            case Token.StringLiteral:
            case Token.Template:
            case Token.RegularExpression:
                statement = this.parseExpressionStatement();
                break;
            case Token.Punctuator:
                const value = this.lookahead.value;
                if (value === '{') {
                    statement = this.parseBlock();
                } else if (value === '(') {
                    statement = this.parseExpressionStatement();
                } else if (value === ';') {
                    statement = this.parseEmptyStatement();
                } else {
                    statement = this.parseExpressionStatement();
                }
                break;
            case Token.Identifier:
                statement = this.matchAsyncFunction() ? this.parseFunctionDeclaration() : this.parseLabelledStatement();
                break;
            case Token.Keyword:
                switch(this.lookahead.value){
                    case 'break':
                        statement = this.parseBreakStatement();
                        break;
                    case 'continue':
                        statement = this.parseContinueStatement();
                        break;
                    case 'debugger':
                        statement = this.parseDebuggerStatement();
                        break;
                    case 'do':
                        statement = this.parseDoWhileStatement();
                        break;
                    case 'for':
                        statement = this.parseForStatement();
                        break;
                    case 'function':
                        statement = this.parseFunctionDeclaration();
                        break;
                    case 'if':
                        statement = this.parseIfStatement();
                        break;
                    case 'return':
                        statement = this.parseReturnStatement();
                        break;
                    case 'switch':
                        statement = this.parseSwitchStatement();
                        break;
                    case 'throw':
                        statement = this.parseThrowStatement();
                        break;
                    case 'try':
                        statement = this.parseTryStatement();
                        break;
                    case 'var':
                        statement = this.parseVariableStatement();
                        break;
                    case 'while':
                        statement = this.parseWhileStatement();
                        break;
                    case 'with':
                        statement = this.parseWithStatement();
                        break;
                    default:
                        statement = this.parseExpressionStatement();
                        break;
                }
                break;
            default:
                statement = this.throwUnexpectedToken(this.lookahead);
        }
        return statement;
    }
    parseFunctionSourceElements() {
        const node = this.createNode();
        this.expect('{');
        const body = this.parseDirectivePrologues();
        const previousLabelSet = this.context.labelSet;
        const previousInIteration = this.context.inIteration;
        const previousInSwitch = this.context.inSwitch;
        const previousInFunctionBody = this.context.inFunctionBody;
        this.context.labelSet = {};
        this.context.inIteration = false;
        this.context.inSwitch = false;
        this.context.inFunctionBody = true;
        while(this.lookahead.type !== Token.EOF){
            if (this.match('}')) {
                break;
            }
            body.push(this.parseStatementListItem());
        }
        this.expect('}');
        this.context.labelSet = previousLabelSet;
        this.context.inIteration = previousInIteration;
        this.context.inSwitch = previousInSwitch;
        this.context.inFunctionBody = previousInFunctionBody;
        return this.finalize(node, new BlockStatement(body));
    }
    validateParam(options, param, name) {
        const key = '$' + name;
        if (this.context.strict) {
            if (this.scanner.isRestrictedWord(name)) {
                options.stricted = param;
                options.message = Messages.StrictParamName;
            }
            if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
                options.stricted = param;
                options.hasDuplicateParameterNames = true;
            }
        } else if (!options.firstRestricted) {
            if (this.scanner.isRestrictedWord(name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictParamName;
            } else if (this.scanner.isStrictModeReservedWord(name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictReservedWord;
            } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
                options.stricted = param;
                options.hasDuplicateParameterNames = true;
            }
        }
        if (typeof Object.defineProperty === 'function') {
            Object.defineProperty(options.paramSet, key, {
                value: true,
                enumerable: true,
                writable: true,
                configurable: true
            });
        } else {
            options.paramSet[key] = true;
        }
    }
    parseRestElement(params) {
        const node = this.createNode();
        this.expect('...');
        const arg = this.parsePattern(params);
        if (this.match('=')) {
            this.throwError(Messages.DefaultRestParameter);
        }
        if (!this.match(')')) {
            this.throwError(Messages.ParameterAfterRestParameter);
        }
        return this.finalize(node, new RestElement(arg));
    }
    parseFormalParameter(options) {
        const params = [];
        const param = this.match('...') ? this.parseRestElement(params) : this.parsePatternWithDefault(params);
        for(let i = 0; i < params.length; i++){
            this.validateParam(options, params[i], params[i].value);
        }
        options.simple = options.simple && param instanceof Identifier;
        options.params.push(param);
    }
    parseFormalParameters(firstRestricted) {
        const options = {
            simple: true,
            hasDuplicateParameterNames: false,
            params: [],
            firstRestricted: firstRestricted
        };
        this.expect('(');
        if (!this.match(')')) {
            options.paramSet = {};
            while(this.lookahead.type !== Token.EOF){
                this.parseFormalParameter(options);
                if (this.match(')')) {
                    break;
                }
                this.expect(',');
                if (this.match(')')) {
                    break;
                }
            }
        }
        this.expect(')');
        if (options.hasDuplicateParameterNames) {
            if (this.context.strict || this.context.isAsync || !options.simple) {
                this.throwError(Messages.DuplicateParameter);
            }
        }
        return {
            simple: options.simple,
            params: options.params,
            stricted: options.stricted,
            firstRestricted: options.firstRestricted,
            message: options.message
        };
    }
    matchAsyncFunction() {
        let match = this.matchContextualKeyword('async');
        if (match) {
            const state = this.scanner.saveState();
            this.scanner.scanComments();
            const next = this.scanner.lex();
            this.scanner.restoreState(state);
            match = state.lineNumber === next.lineNumber && next.type === Token.Keyword && next.value === 'function';
        }
        return match;
    }
    parseFunctionDeclaration(identifierIsOptional) {
        const node = this.createNode();
        const isAsync = this.matchContextualKeyword('async');
        if (isAsync) {
            if (this.context.inIteration) {
                this.tolerateError(Messages.AsyncFunctionInSingleStatementContext);
            }
            this.nextToken();
        }
        this.expectKeyword('function');
        const isGenerator = this.match('*');
        if (isGenerator) {
            this.nextToken();
        }
        let message;
        let id = null;
        let firstRestricted = null;
        if (!identifierIsOptional || !this.match('(')) {
            const token = this.lookahead;
            id = this.parseVariableIdentifier();
            if (this.context.strict) {
                if (this.scanner.isRestrictedWord(token.value)) {
                    this.tolerateUnexpectedToken(token, Messages.StrictFunctionName);
                }
            } else {
                if (this.scanner.isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (this.scanner.isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }
        const previousIsAsync = this.context.isAsync;
        const previousAllowYield = this.context.allowYield;
        this.context.isAsync = isAsync;
        this.context.allowYield = !isGenerator;
        const formalParameters = this.parseFormalParameters(firstRestricted);
        const params = formalParameters.params;
        const stricted = formalParameters.stricted;
        firstRestricted = formalParameters.firstRestricted;
        if (formalParameters.message) {
            message = formalParameters.message;
        }
        const previousStrict = this.context.strict;
        const previousAllowStrictDirective = this.context.allowStrictDirective;
        this.context.allowStrictDirective = formalParameters.simple;
        const body = this.parseFunctionSourceElements();
        if (this.context.strict && firstRestricted) {
            this.throwUnexpectedToken(firstRestricted, message);
        }
        if (this.context.strict && stricted) {
            this.tolerateUnexpectedToken(stricted, message);
        }
        this.context.strict = previousStrict;
        this.context.allowStrictDirective = previousAllowStrictDirective;
        this.context.isAsync = previousIsAsync;
        this.context.allowYield = previousAllowYield;
        return isAsync ? this.finalize(node, new AsyncFunctionDeclaration(id, params, body, isGenerator)) : this.finalize(node, new FunctionDeclaration(id, params, body, isGenerator));
    }
    parseFunctionExpression() {
        const node = this.createNode();
        const isAsync = this.matchContextualKeyword('async');
        if (isAsync) {
            this.nextToken();
        }
        this.expectKeyword('function');
        const isGenerator = this.match('*');
        if (isGenerator) {
            this.nextToken();
        }
        let message;
        let id = null;
        let firstRestricted;
        const previousIsAsync = this.context.isAsync;
        const previousAllowYield = this.context.allowYield;
        this.context.isAsync = isAsync;
        this.context.allowYield = !isGenerator;
        if (!this.match('(')) {
            const token = this.lookahead;
            id = !this.context.strict && !isGenerator && this.matchKeyword('yield') ? this.parseIdentifierName() : this.parseVariableIdentifier();
            if (this.context.strict) {
                if (this.scanner.isRestrictedWord(token.value)) {
                    this.tolerateUnexpectedToken(token, Messages.StrictFunctionName);
                }
            } else {
                if (this.scanner.isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (this.scanner.isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }
        const formalParameters = this.parseFormalParameters(firstRestricted);
        const params = formalParameters.params;
        const stricted = formalParameters.stricted;
        firstRestricted = formalParameters.firstRestricted;
        if (formalParameters.message) {
            message = formalParameters.message;
        }
        const previousStrict = this.context.strict;
        const previousAllowStrictDirective = this.context.allowStrictDirective;
        this.context.allowStrictDirective = formalParameters.simple;
        const body = this.parseFunctionSourceElements();
        if (this.context.strict && firstRestricted) {
            this.throwUnexpectedToken(firstRestricted, message);
        }
        if (this.context.strict && stricted) {
            this.tolerateUnexpectedToken(stricted, message);
        }
        this.context.strict = previousStrict;
        this.context.allowStrictDirective = previousAllowStrictDirective;
        this.context.isAsync = previousIsAsync;
        this.context.allowYield = previousAllowYield;
        return isAsync ? this.finalize(node, new AsyncFunctionExpression(id, params, body, isGenerator)) : this.finalize(node, new FunctionExpression(id, params, body, isGenerator));
    }
    parseDirective() {
        const token = this.lookahead;
        const node = this.createNode();
        const expr = this.parseExpression();
        const directive = expr.type === Syntax.Literal ? this.getTokenRaw(token).slice(1, -1) : null;
        this.consumeSemicolon();
        return this.finalize(node, directive ? new Directive(expr, directive) : new ExpressionStatement(expr));
    }
    parseDirectivePrologues() {
        let firstRestricted = null;
        const body = [];
        while(true){
            const token = this.lookahead;
            if (token.type !== Token.StringLiteral) {
                break;
            }
            const statement = this.parseDirective();
            body.push(statement);
            const directive = statement.directive;
            if (typeof directive !== 'string') {
                break;
            }
            if (directive === 'use strict') {
                this.context.strict = true;
                if (firstRestricted) {
                    this.tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
                }
                if (!this.context.allowStrictDirective) {
                    this.tolerateUnexpectedToken(token, Messages.IllegalLanguageModeDirective);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }
        return body;
    }
    qualifiedPropertyName(token) {
        switch(token.type){
            case Token.Identifier:
            case Token.StringLiteral:
            case Token.BooleanLiteral:
            case Token.NullLiteral:
            case Token.NumericLiteral:
            case Token.Keyword:
                return true;
            case Token.Punctuator:
                return token.value === '[';
            default:
                break;
        }
        return false;
    }
    parseGetterMethod() {
        const node = this.createNode();
        const isGenerator = false;
        const previousAllowYield = this.context.allowYield;
        this.context.allowYield = !isGenerator;
        const formalParameters = this.parseFormalParameters();
        if (formalParameters.params.length > 0) {
            this.tolerateError(Messages.BadGetterArity);
        }
        const method = this.parsePropertyMethod(formalParameters);
        this.context.allowYield = previousAllowYield;
        return this.finalize(node, new FunctionExpression(null, formalParameters.params, method, false));
    }
    parseSetterMethod() {
        const node = this.createNode();
        const isGenerator = false;
        const previousAllowYield = this.context.allowYield;
        this.context.allowYield = !isGenerator;
        const formalParameters = this.parseFormalParameters();
        if (formalParameters.params.length !== 1) {
            this.tolerateError(Messages.BadSetterArity);
        } else if (formalParameters.params[0] instanceof RestElement) {
            this.tolerateError(Messages.BadSetterRestParameter);
        }
        const method = this.parsePropertyMethod(formalParameters);
        this.context.allowYield = previousAllowYield;
        return this.finalize(node, new FunctionExpression(null, formalParameters.params, method, false));
    }
    parseGeneratorMethod() {
        const node = this.createNode();
        const previousAllowYield = this.context.allowYield;
        this.context.allowYield = true;
        const params = this.parseFormalParameters();
        this.context.allowYield = false;
        const method = this.parsePropertyMethod(params);
        this.context.allowYield = previousAllowYield;
        return this.finalize(node, new FunctionExpression(null, params.params, method, true));
    }
    isStartOfExpression() {
        let start = true;
        const value = this.lookahead.value;
        switch(this.lookahead.type){
            case Token.Punctuator:
                start = value === '[' || value === '(' || value === '{' || value === '+' || value === '-' || value === '!' || value === '~' || value === '++' || value === '--' || value === '/' || value === '/=';
                break;
            case Token.Keyword:
                start = value === 'class' || value === 'delete' || value === 'function' || value === 'let' || value === 'new' || value === 'super' || value === 'this' || value === 'typeof' || value === 'void' || value === 'yield';
                break;
            default:
                break;
        }
        return start;
    }
    parseYieldExpression() {
        const node = this.createNode();
        this.expectKeyword('yield');
        let argument = null;
        let delegate = false;
        if (!this.hasLineTerminator) {
            const previousAllowYield = this.context.allowYield;
            this.context.allowYield = false;
            delegate = this.match('*');
            if (delegate) {
                this.nextToken();
                argument = this.parseAssignmentExpression();
            } else if (this.isStartOfExpression()) {
                argument = this.parseAssignmentExpression();
            }
            this.context.allowYield = previousAllowYield;
        }
        return this.finalize(node, new YieldExpression(argument, delegate));
    }
    parseClassElement(hasConstructor) {
        let token = this.lookahead;
        const node = this.createNode();
        let kind = '';
        let key = null;
        let value = null;
        let computed = false;
        let method = false;
        let isStatic = false;
        let isAsync = false;
        let isGenerator = false;
        if (this.match('*')) {
            this.nextToken();
        } else {
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
            const id = key;
            if (id.name === 'static' && (this.qualifiedPropertyName(this.lookahead) || this.match('*'))) {
                token = this.lookahead;
                isStatic = true;
                computed = this.match('[');
                if (this.match('*')) {
                    this.nextToken();
                } else {
                    key = this.parseObjectPropertyKey();
                }
            }
            if (token.type === Token.Identifier && !this.hasLineTerminator && token.value === 'async') {
                const punctuator = this.lookahead.value;
                if (punctuator !== ':' && punctuator !== '(') {
                    isAsync = true;
                    isGenerator = this.match("*");
                    if (isGenerator) {
                        this.nextToken();
                    }
                    token = this.lookahead;
                    computed = this.match('[');
                    key = this.parseObjectPropertyKey();
                    if (token.type === Token.Identifier && token.value === 'constructor') {
                        this.tolerateUnexpectedToken(token, Messages.ConstructorIsAsync);
                    }
                }
            }
        }
        const lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
        if (token.type === Token.Identifier) {
            if (token.value === 'get' && lookaheadPropertyKey) {
                kind = 'get';
                computed = this.match('[');
                key = this.parseObjectPropertyKey();
                this.context.allowYield = false;
                value = this.parseGetterMethod();
            } else if (token.value === 'set' && lookaheadPropertyKey) {
                kind = 'set';
                computed = this.match('[');
                key = this.parseObjectPropertyKey();
                value = this.parseSetterMethod();
            }
        } else if (token.type === Token.Punctuator && token.value === '*' && lookaheadPropertyKey) {
            kind = 'init';
            computed = this.match('[');
            key = this.parseObjectPropertyKey();
            value = this.parseGeneratorMethod();
            method = true;
        }
        if (!kind && key && this.match('(')) {
            const previousInClassConstructor = this.context.inClassConstructor;
            this.context.inClassConstructor = token.value === 'constructor';
            kind = 'init';
            value = isAsync ? this.parsePropertyMethodAsyncFunction(isGenerator) : this.parsePropertyMethodFunction(isGenerator);
            this.context.inClassConstructor = previousInClassConstructor;
            method = true;
        }
        if (!kind) {
            this.throwUnexpectedToken(this.lookahead);
        }
        if (kind === 'init') {
            kind = 'method';
        }
        if (!computed) {
            if (isStatic && this.isPropertyKey(key, 'prototype')) {
                this.throwUnexpectedToken(token, Messages.StaticPrototype);
            }
            if (!isStatic && this.isPropertyKey(key, 'constructor')) {
                if (kind !== 'method' || !method || value && value.generator) {
                    this.throwUnexpectedToken(token, Messages.ConstructorSpecialMethod);
                }
                if (hasConstructor.value) {
                    this.throwUnexpectedToken(token, Messages.DuplicateConstructor);
                } else {
                    hasConstructor.value = true;
                }
                kind = 'constructor';
            }
        }
        return this.finalize(node, new MethodDefinition(key, computed, value, kind, isStatic));
    }
    parseClassElementList() {
        const body = [];
        const hasConstructor = {
            value: false
        };
        this.expect('{');
        while(!this.match('}')){
            if (this.match(';')) {
                this.nextToken();
            } else {
                body.push(this.parseClassElement(hasConstructor));
            }
        }
        this.expect('}');
        return body;
    }
    parseClassBody() {
        const node = this.createNode();
        const elementList = this.parseClassElementList();
        return this.finalize(node, new ClassBody(elementList));
    }
    parseClassDeclaration(identifierIsOptional) {
        const node = this.createNode();
        const previousStrict = this.context.strict;
        this.context.strict = true;
        this.expectKeyword('class');
        const id = identifierIsOptional && this.lookahead.type !== Token.Identifier ? null : this.parseVariableIdentifier();
        let superClass = null;
        if (this.matchKeyword('extends')) {
            this.nextToken();
            superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
        }
        const classBody = this.parseClassBody();
        this.context.strict = previousStrict;
        return this.finalize(node, new ClassDeclaration(id, superClass, classBody));
    }
    parseClassExpression() {
        const node = this.createNode();
        const previousStrict = this.context.strict;
        this.context.strict = true;
        this.expectKeyword('class');
        const id = this.lookahead.type === Token.Identifier ? this.parseVariableIdentifier() : null;
        let superClass = null;
        if (this.matchKeyword('extends')) {
            this.nextToken();
            superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
        }
        const classBody = this.parseClassBody();
        this.context.strict = previousStrict;
        return this.finalize(node, new ClassExpression(id, superClass, classBody));
    }
    parseModule() {
        this.context.strict = true;
        this.context.isModule = true;
        this.scanner.isModule = true;
        const node = this.createNode();
        const body = this.parseDirectivePrologues();
        while(this.lookahead.type !== Token.EOF){
            body.push(this.parseStatementListItem());
        }
        return this.finalize(node, new Module(body));
    }
    parseScript() {
        const node = this.createNode();
        const body = this.parseDirectivePrologues();
        while(this.lookahead.type !== Token.EOF){
            body.push(this.parseStatementListItem());
        }
        return this.finalize(node, new Script(body));
    }
    parseModuleSpecifier() {
        const node = this.createNode();
        if (this.lookahead.type !== Token.StringLiteral) {
            this.throwError(Messages.InvalidModuleSpecifier);
        }
        const token = this.nextToken();
        const raw = this.getTokenRaw(token);
        return this.finalize(node, new Literal(token.value, raw));
    }
    parseImportSpecifier() {
        const node = this.createNode();
        let imported;
        let local;
        if (this.lookahead.type === Token.Identifier) {
            imported = this.parseVariableIdentifier();
            local = imported;
            if (this.matchContextualKeyword('as')) {
                this.nextToken();
                local = this.parseVariableIdentifier();
            }
        } else {
            imported = this.parseIdentifierName();
            local = imported;
            if (this.matchContextualKeyword('as')) {
                this.nextToken();
                local = this.parseVariableIdentifier();
            } else {
                this.throwUnexpectedToken(this.nextToken());
            }
        }
        return this.finalize(node, new ImportSpecifier(local, imported));
    }
    parseNamedImports() {
        this.expect('{');
        const specifiers = [];
        while(!this.match('}')){
            specifiers.push(this.parseImportSpecifier());
            if (!this.match('}')) {
                this.expect(',');
            }
        }
        this.expect('}');
        return specifiers;
    }
    parseImportDefaultSpecifier() {
        const node = this.createNode();
        const local = this.parseIdentifierName();
        return this.finalize(node, new ImportDefaultSpecifier(local));
    }
    parseImportNamespaceSpecifier() {
        const node = this.createNode();
        this.expect('*');
        if (!this.matchContextualKeyword('as')) {
            this.throwError(Messages.NoAsAfterImportNamespace);
        }
        this.nextToken();
        const local = this.parseIdentifierName();
        return this.finalize(node, new ImportNamespaceSpecifier(local));
    }
    parseImportDeclaration() {
        if (this.context.inFunctionBody) {
            this.throwError(Messages.IllegalImportDeclaration);
        }
        const node = this.createNode();
        this.expectKeyword('import');
        let src;
        let specifiers = [];
        if (this.lookahead.type === Token.StringLiteral) {
            src = this.parseModuleSpecifier();
        } else {
            if (this.match('{')) {
                specifiers = specifiers.concat(this.parseNamedImports());
            } else if (this.match('*')) {
                specifiers.push(this.parseImportNamespaceSpecifier());
            } else if (this.isIdentifierName(this.lookahead) && !this.matchKeyword('default')) {
                specifiers.push(this.parseImportDefaultSpecifier());
                if (this.match(',')) {
                    this.nextToken();
                    if (this.match('*')) {
                        specifiers.push(this.parseImportNamespaceSpecifier());
                    } else if (this.match('{')) {
                        specifiers = specifiers.concat(this.parseNamedImports());
                    } else {
                        this.throwUnexpectedToken(this.lookahead);
                    }
                }
            } else {
                this.throwUnexpectedToken(this.nextToken());
            }
            if (!this.matchContextualKeyword('from')) {
                const message = this.lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause;
                this.throwError(message, this.lookahead.value);
            }
            this.nextToken();
            src = this.parseModuleSpecifier();
        }
        this.consumeSemicolon();
        return this.finalize(node, new ImportDeclaration(specifiers, src));
    }
    parseExportSpecifier() {
        const node = this.createNode();
        const local = this.parseIdentifierName();
        let exported = local;
        if (this.matchContextualKeyword('as')) {
            this.nextToken();
            exported = this.parseIdentifierName();
        }
        return this.finalize(node, new ExportSpecifier(local, exported));
    }
    parseExportDeclaration() {
        if (this.context.inFunctionBody) {
            this.throwError(Messages.IllegalExportDeclaration);
        }
        const node = this.createNode();
        this.expectKeyword('export');
        let exportDeclaration;
        if (this.matchKeyword('default')) {
            this.nextToken();
            if (this.matchKeyword('function')) {
                const declaration = this.parseFunctionDeclaration(true);
                exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
            } else if (this.matchKeyword('class')) {
                const declaration = this.parseClassDeclaration(true);
                exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
            } else if (this.matchContextualKeyword('async')) {
                const declaration = this.matchAsyncFunction() ? this.parseFunctionDeclaration(true) : this.parseAssignmentExpression();
                exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
            } else {
                if (this.matchContextualKeyword('from')) {
                    this.throwError(Messages.UnexpectedToken, this.lookahead.value);
                }
                const declaration = this.match('{') ? this.parseObjectInitializer() : this.match('[') ? this.parseArrayInitializer() : this.parseAssignmentExpression();
                this.consumeSemicolon();
                exportDeclaration = this.finalize(node, new ExportDefaultDeclaration(declaration));
            }
        } else if (this.match('*')) {
            this.nextToken();
            if (!this.matchContextualKeyword('from')) {
                const message = this.lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause;
                this.throwError(message, this.lookahead.value);
            }
            this.nextToken();
            const src = this.parseModuleSpecifier();
            this.consumeSemicolon();
            exportDeclaration = this.finalize(node, new ExportAllDeclaration(src));
        } else if (this.lookahead.type === Token.Keyword) {
            let declaration;
            switch(this.lookahead.value){
                case 'let':
                case 'const':
                    declaration = this.parseLexicalDeclaration({
                        inFor: false
                    });
                    break;
                case 'var':
                case 'class':
                case 'function':
                    declaration = this.parseStatementListItem();
                    break;
                default:
                    this.throwUnexpectedToken(this.lookahead);
            }
            exportDeclaration = this.finalize(node, new ExportNamedDeclaration(declaration, [], null));
        } else if (this.matchAsyncFunction()) {
            const declaration = this.parseFunctionDeclaration();
            exportDeclaration = this.finalize(node, new ExportNamedDeclaration(declaration, [], null));
        } else {
            const specifiers = [];
            let source = null;
            let isExportFromIdentifier = false;
            this.expect('{');
            while(!this.match('}')){
                isExportFromIdentifier = isExportFromIdentifier || this.matchKeyword('default');
                specifiers.push(this.parseExportSpecifier());
                if (!this.match('}')) {
                    this.expect(',');
                }
            }
            this.expect('}');
            if (this.matchContextualKeyword('from')) {
                this.nextToken();
                source = this.parseModuleSpecifier();
                this.consumeSemicolon();
            } else if (isExportFromIdentifier) {
                const message = this.lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause;
                this.throwError(message, this.lookahead.value);
            } else {
                this.consumeSemicolon();
            }
            exportDeclaration = this.finalize(node, new ExportNamedDeclaration(null, specifiers, source));
        }
        return exportDeclaration;
    }
}
const XHTMLEntities = {
    quot: '\u0022',
    amp: '\u0026',
    apos: '\u0027',
    gt: '\u003E',
    nbsp: '\u00A0',
    iexcl: '\u00A1',
    cent: '\u00A2',
    pound: '\u00A3',
    curren: '\u00A4',
    yen: '\u00A5',
    brvbar: '\u00A6',
    sect: '\u00A7',
    uml: '\u00A8',
    copy: '\u00A9',
    ordf: '\u00AA',
    laquo: '\u00AB',
    not: '\u00AC',
    shy: '\u00AD',
    reg: '\u00AE',
    macr: '\u00AF',
    deg: '\u00B0',
    plusmn: '\u00B1',
    sup2: '\u00B2',
    sup3: '\u00B3',
    acute: '\u00B4',
    micro: '\u00B5',
    para: '\u00B6',
    middot: '\u00B7',
    cedil: '\u00B8',
    sup1: '\u00B9',
    ordm: '\u00BA',
    raquo: '\u00BB',
    frac14: '\u00BC',
    frac12: '\u00BD',
    frac34: '\u00BE',
    iquest: '\u00BF',
    Agrave: '\u00C0',
    Aacute: '\u00C1',
    Acirc: '\u00C2',
    Atilde: '\u00C3',
    Auml: '\u00C4',
    Aring: '\u00C5',
    AElig: '\u00C6',
    Ccedil: '\u00C7',
    Egrave: '\u00C8',
    Eacute: '\u00C9',
    Ecirc: '\u00CA',
    Euml: '\u00CB',
    Igrave: '\u00CC',
    Iacute: '\u00CD',
    Icirc: '\u00CE',
    Iuml: '\u00CF',
    ETH: '\u00D0',
    Ntilde: '\u00D1',
    Ograve: '\u00D2',
    Oacute: '\u00D3',
    Ocirc: '\u00D4',
    Otilde: '\u00D5',
    Ouml: '\u00D6',
    times: '\u00D7',
    Oslash: '\u00D8',
    Ugrave: '\u00D9',
    Uacute: '\u00DA',
    Ucirc: '\u00DB',
    Uuml: '\u00DC',
    Yacute: '\u00DD',
    THORN: '\u00DE',
    szlig: '\u00DF',
    agrave: '\u00E0',
    aacute: '\u00E1',
    acirc: '\u00E2',
    atilde: '\u00E3',
    auml: '\u00E4',
    aring: '\u00E5',
    aelig: '\u00E6',
    ccedil: '\u00E7',
    egrave: '\u00E8',
    eacute: '\u00E9',
    ecirc: '\u00EA',
    euml: '\u00EB',
    igrave: '\u00EC',
    iacute: '\u00ED',
    icirc: '\u00EE',
    iuml: '\u00EF',
    eth: '\u00F0',
    ntilde: '\u00F1',
    ograve: '\u00F2',
    oacute: '\u00F3',
    ocirc: '\u00F4',
    otilde: '\u00F5',
    ouml: '\u00F6',
    divide: '\u00F7',
    oslash: '\u00F8',
    ugrave: '\u00F9',
    uacute: '\u00FA',
    ucirc: '\u00FB',
    uuml: '\u00FC',
    yacute: '\u00FD',
    thorn: '\u00FE',
    yuml: '\u00FF',
    OElig: '\u0152',
    oelig: '\u0153',
    Scaron: '\u0160',
    scaron: '\u0161',
    Yuml: '\u0178',
    fnof: '\u0192',
    circ: '\u02C6',
    tilde: '\u02DC',
    Alpha: '\u0391',
    Beta: '\u0392',
    Gamma: '\u0393',
    Delta: '\u0394',
    Epsilon: '\u0395',
    Zeta: '\u0396',
    Eta: '\u0397',
    Theta: '\u0398',
    Iota: '\u0399',
    Kappa: '\u039A',
    Lambda: '\u039B',
    Mu: '\u039C',
    Nu: '\u039D',
    Xi: '\u039E',
    Omicron: '\u039F',
    Pi: '\u03A0',
    Rho: '\u03A1',
    Sigma: '\u03A3',
    Tau: '\u03A4',
    Upsilon: '\u03A5',
    Phi: '\u03A6',
    Chi: '\u03A7',
    Psi: '\u03A8',
    Omega: '\u03A9',
    alpha: '\u03B1',
    beta: '\u03B2',
    gamma: '\u03B3',
    delta: '\u03B4',
    epsilon: '\u03B5',
    zeta: '\u03B6',
    eta: '\u03B7',
    theta: '\u03B8',
    iota: '\u03B9',
    kappa: '\u03BA',
    lambda: '\u03BB',
    mu: '\u03BC',
    nu: '\u03BD',
    xi: '\u03BE',
    omicron: '\u03BF',
    pi: '\u03C0',
    rho: '\u03C1',
    sigmaf: '\u03C2',
    sigma: '\u03C3',
    tau: '\u03C4',
    upsilon: '\u03C5',
    phi: '\u03C6',
    chi: '\u03C7',
    psi: '\u03C8',
    omega: '\u03C9',
    thetasym: '\u03D1',
    upsih: '\u03D2',
    piv: '\u03D6',
    ensp: '\u2002',
    emsp: '\u2003',
    thinsp: '\u2009',
    zwnj: '\u200C',
    zwj: '\u200D',
    lrm: '\u200E',
    rlm: '\u200F',
    ndash: '\u2013',
    mdash: '\u2014',
    lsquo: '\u2018',
    rsquo: '\u2019',
    sbquo: '\u201A',
    ldquo: '\u201C',
    rdquo: '\u201D',
    bdquo: '\u201E',
    dagger: '\u2020',
    Dagger: '\u2021',
    bull: '\u2022',
    hellip: '\u2026',
    permil: '\u2030',
    prime: '\u2032',
    Prime: '\u2033',
    lsaquo: '\u2039',
    rsaquo: '\u203A',
    oline: '\u203E',
    frasl: '\u2044',
    euro: '\u20AC',
    image: '\u2111',
    weierp: '\u2118',
    real: '\u211C',
    trade: '\u2122',
    alefsym: '\u2135',
    larr: '\u2190',
    uarr: '\u2191',
    rarr: '\u2192',
    darr: '\u2193',
    harr: '\u2194',
    crarr: '\u21B5',
    lArr: '\u21D0',
    uArr: '\u21D1',
    rArr: '\u21D2',
    dArr: '\u21D3',
    hArr: '\u21D4',
    forall: '\u2200',
    part: '\u2202',
    exist: '\u2203',
    empty: '\u2205',
    nabla: '\u2207',
    isin: '\u2208',
    notin: '\u2209',
    ni: '\u220B',
    prod: '\u220F',
    sum: '\u2211',
    minus: '\u2212',
    lowast: '\u2217',
    radic: '\u221A',
    prop: '\u221D',
    infin: '\u221E',
    ang: '\u2220',
    and: '\u2227',
    or: '\u2228',
    cap: '\u2229',
    cup: '\u222A',
    int: '\u222B',
    there4: '\u2234',
    sim: '\u223C',
    cong: '\u2245',
    asymp: '\u2248',
    ne: '\u2260',
    equiv: '\u2261',
    le: '\u2264',
    ge: '\u2265',
    sub: '\u2282',
    sup: '\u2283',
    nsub: '\u2284',
    sube: '\u2286',
    supe: '\u2287',
    oplus: '\u2295',
    otimes: '\u2297',
    perp: '\u22A5',
    sdot: '\u22C5',
    lceil: '\u2308',
    rceil: '\u2309',
    lfloor: '\u230A',
    rfloor: '\u230B',
    loz: '\u25CA',
    spades: '\u2660',
    clubs: '\u2663',
    hearts: '\u2665',
    diams: '\u2666',
    lang: '\u27E8',
    rang: '\u27E9'
};
var JSXToken;
(function(JSXToken) {
    JSXToken[JSXToken["Identifier"] = 100] = "Identifier";
    JSXToken[JSXToken["Text"] = 101] = "Text";
})(JSXToken || (JSXToken = {}));
TokenName[JSXToken.Identifier] = 'JSXIdentifier';
TokenName[JSXToken.Text] = 'JSXText';
function getQualifiedElementName(elementName) {
    let qualifiedName;
    switch(elementName.type){
        case JSXSyntax.JSXIdentifier:
            const id = elementName;
            qualifiedName = id.name;
            break;
        case JSXSyntax.JSXNamespacedName:
            const ns = elementName;
            qualifiedName = getQualifiedElementName(ns.namespace) + ':' + getQualifiedElementName(ns.name);
            break;
        case JSXSyntax.JSXMemberExpression:
            const expr = elementName;
            qualifiedName = getQualifiedElementName(expr.object) + '.' + getQualifiedElementName(expr.property);
            break;
        default:
            break;
    }
    return qualifiedName || '';
}
class JSXParser extends Parser {
    constructor(code, options, delegate){
        super(code, options, delegate);
    }
    parsePrimaryExpression() {
        return this.match('<') ? this.parseJSXRoot() : super.parsePrimaryExpression();
    }
    startJSX() {
        this.scanner.index = this.startMarker.index;
        this.scanner.lineNumber = this.startMarker.line;
        this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
    }
    finishJSX() {
        this.nextToken();
    }
    reenterJSX() {
        this.startJSX();
        this.expectJSX('}');
        if (this.config.tokens) {
            this.tokens.pop();
        }
    }
    createJSXNode() {
        this.collectComments();
        return {
            index: this.scanner.index,
            line: this.scanner.lineNumber,
            column: this.scanner.index - this.scanner.lineStart
        };
    }
    createJSXChildNode() {
        return {
            index: this.scanner.index,
            line: this.scanner.lineNumber,
            column: this.scanner.index - this.scanner.lineStart
        };
    }
    scanXHTMLEntity(quote) {
        let result = '&';
        let valid = true;
        let terminated = false;
        let numeric = false;
        let hex = false;
        while(!this.scanner.eof() && valid && !terminated){
            const ch = this.scanner.source[this.scanner.index];
            if (ch === quote) {
                break;
            }
            terminated = ch === ';';
            result += ch;
            ++this.scanner.index;
            if (!terminated) {
                switch(result.length){
                    case 2:
                        numeric = ch === '#';
                        break;
                    case 3:
                        if (numeric) {
                            hex = ch === 'x';
                            valid = hex || Character.isDecimalDigit(ch.charCodeAt(0));
                            numeric = numeric && !hex;
                        }
                        break;
                    default:
                        valid = valid && !(numeric && !Character.isDecimalDigit(ch.charCodeAt(0)));
                        valid = valid && !(hex && !Character.isHexDigit(ch.charCodeAt(0)));
                        break;
                }
            }
        }
        if (valid && terminated && result.length > 2) {
            const str = result.substr(1, result.length - 2);
            if (numeric && str.length > 1) {
                result = String.fromCharCode(parseInt(str.substr(1), 10));
            } else if (hex && str.length > 2) {
                result = String.fromCharCode(parseInt('0' + str.substr(1), 16));
            } else if (!numeric && !hex && XHTMLEntities[str]) {
                result = XHTMLEntities[str];
            }
        }
        return result;
    }
    lexJSX() {
        const cp = this.scanner.source.charCodeAt(this.scanner.index);
        if (cp === 60 || cp === 62 || cp === 47 || cp === 58 || cp === 61 || cp === 123 || cp === 125) {
            const value = this.scanner.source[this.scanner.index++];
            return {
                type: Token.Punctuator,
                value: value,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: this.scanner.index - 1,
                end: this.scanner.index
            };
        }
        if (cp === 34 || cp === 39) {
            const start = this.scanner.index;
            const quote = this.scanner.source[this.scanner.index++];
            let str = '';
            while(!this.scanner.eof()){
                const ch = this.scanner.source[this.scanner.index++];
                if (ch === quote) {
                    break;
                } else if (ch === '&') {
                    str += this.scanXHTMLEntity(quote);
                } else {
                    str += ch;
                }
            }
            return {
                type: Token.StringLiteral,
                value: str,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: start,
                end: this.scanner.index
            };
        }
        if (cp === 46) {
            const n1 = this.scanner.source.charCodeAt(this.scanner.index + 1);
            const n2 = this.scanner.source.charCodeAt(this.scanner.index + 2);
            const value = n1 === 46 && n2 === 46 ? '...' : '.';
            const start = this.scanner.index;
            this.scanner.index += value.length;
            return {
                type: Token.Punctuator,
                value: value,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: start,
                end: this.scanner.index
            };
        }
        if (cp === 96) {
            return {
                type: Token.Template,
                value: '',
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: this.scanner.index,
                end: this.scanner.index
            };
        }
        if (Character.isIdentifierStart(cp) && cp !== 92) {
            const start = this.scanner.index;
            ++this.scanner.index;
            while(!this.scanner.eof()){
                const ch = this.scanner.source.charCodeAt(this.scanner.index);
                if (Character.isIdentifierPart(ch) && ch !== 92) {
                    ++this.scanner.index;
                } else if (ch === 45) {
                    ++this.scanner.index;
                } else {
                    break;
                }
            }
            const id = this.scanner.source.slice(start, this.scanner.index);
            return {
                type: 100,
                value: id,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: start,
                end: this.scanner.index
            };
        }
        return this.scanner.lex();
    }
    nextJSXToken() {
        this.collectComments();
        this.startMarker.index = this.scanner.index;
        this.startMarker.line = this.scanner.lineNumber;
        this.startMarker.column = this.scanner.index - this.scanner.lineStart;
        const token = this.lexJSX();
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        if (this.config.tokens) {
            this.tokens.push(this.convertToken(token));
        }
        return token;
    }
    nextJSXText() {
        this.startMarker.index = this.scanner.index;
        this.startMarker.line = this.scanner.lineNumber;
        this.startMarker.column = this.scanner.index - this.scanner.lineStart;
        const start = this.scanner.index;
        let text = '';
        while(!this.scanner.eof()){
            const ch = this.scanner.source[this.scanner.index];
            if (ch === '{' || ch === '<') {
                break;
            }
            ++this.scanner.index;
            text += ch;
            if (Character.isLineTerminator(ch.charCodeAt(0))) {
                ++this.scanner.lineNumber;
                if (ch === '\r' && this.scanner.source[this.scanner.index] === '\n') {
                    ++this.scanner.index;
                }
                this.scanner.lineStart = this.scanner.index;
            }
        }
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        const token = {
            type: 101,
            value: text,
            lineNumber: this.scanner.lineNumber,
            lineStart: this.scanner.lineStart,
            start: start,
            end: this.scanner.index
        };
        if (text.length > 0 && this.config.tokens) {
            this.tokens.push(this.convertToken(token));
        }
        return token;
    }
    peekJSXToken() {
        const state = this.scanner.saveState();
        this.scanner.scanComments();
        const next = this.lexJSX();
        this.scanner.restoreState(state);
        return next;
    }
    expectJSX(value) {
        const token = this.nextJSXToken();
        if (token.type !== Token.Punctuator || token.value !== value) {
            this.throwUnexpectedToken(token);
        }
    }
    matchJSX(value) {
        const next = this.peekJSXToken();
        return next.type === Token.Punctuator && next.value === value;
    }
    parseJSXIdentifier() {
        const node = this.createJSXNode();
        const token = this.nextJSXToken();
        if (token.type !== 100) {
            this.throwUnexpectedToken(token);
        }
        return this.finalize(node, new JSXIdentifier(token.value));
    }
    parseJSXElementName() {
        const node = this.createJSXNode();
        let elementName = this.parseJSXIdentifier();
        if (this.matchJSX(':')) {
            const namespace = elementName;
            this.expectJSX(':');
            const name = this.parseJSXIdentifier();
            elementName = this.finalize(node, new JSXNamespacedName(namespace, name));
        } else if (this.matchJSX('.')) {
            while(this.matchJSX('.')){
                const object = elementName;
                this.expectJSX('.');
                const property = this.parseJSXIdentifier();
                elementName = this.finalize(node, new JSXMemberExpression(object, property));
            }
        }
        return elementName;
    }
    parseJSXAttributeName() {
        const node = this.createJSXNode();
        let attributeName;
        const identifier = this.parseJSXIdentifier();
        if (this.matchJSX(':')) {
            const namespace = identifier;
            this.expectJSX(':');
            const name = this.parseJSXIdentifier();
            attributeName = this.finalize(node, new JSXNamespacedName(namespace, name));
        } else {
            attributeName = identifier;
        }
        return attributeName;
    }
    parseJSXStringLiteralAttribute() {
        const node = this.createJSXNode();
        const token = this.nextJSXToken();
        if (token.type !== Token.StringLiteral) {
            this.throwUnexpectedToken(token);
        }
        const raw = this.getTokenRaw(token);
        return this.finalize(node, new Literal(token.value, raw));
    }
    parseJSXExpressionAttribute() {
        const node = this.createJSXNode();
        this.expectJSX('{');
        this.finishJSX();
        if (this.match('}')) {
            this.tolerateError('JSX attributes must only be assigned a non-empty expression');
        }
        const expression = this.parseAssignmentExpression();
        this.reenterJSX();
        return this.finalize(node, new JSXExpressionContainer(expression));
    }
    parseJSXAttributeValue() {
        return this.matchJSX('{') ? this.parseJSXExpressionAttribute() : this.matchJSX('<') ? this.parseJSXElement() : this.parseJSXStringLiteralAttribute();
    }
    parseJSXNameValueAttribute() {
        const node = this.createJSXNode();
        const name = this.parseJSXAttributeName();
        let value = null;
        if (this.matchJSX('=')) {
            this.expectJSX('=');
            value = this.parseJSXAttributeValue();
        }
        return this.finalize(node, new JSXAttribute(name, value));
    }
    parseJSXSpreadAttribute() {
        const node = this.createJSXNode();
        this.expectJSX('{');
        this.expectJSX('...');
        this.finishJSX();
        const argument = this.parseAssignmentExpression();
        this.reenterJSX();
        return this.finalize(node, new JSXSpreadAttribute(argument));
    }
    parseJSXAttributes() {
        const attributes = [];
        while(!this.matchJSX('/') && !this.matchJSX('>')){
            const attribute = this.matchJSX('{') ? this.parseJSXSpreadAttribute() : this.parseJSXNameValueAttribute();
            attributes.push(attribute);
        }
        return attributes;
    }
    parseJSXOpeningElement() {
        const node = this.createJSXNode();
        this.expectJSX('<');
        if (this.matchJSX('>')) {
            this.expectJSX('>');
            return this.finalize(node, new JSXOpeningFragment(false));
        }
        const name = this.parseJSXElementName();
        const attributes = this.parseJSXAttributes();
        const selfClosing = this.matchJSX('/');
        if (selfClosing) {
            this.expectJSX('/');
        }
        this.expectJSX('>');
        return this.finalize(node, new JSXOpeningElement(name, selfClosing, attributes));
    }
    parseJSXBoundaryElement() {
        const node = this.createJSXNode();
        this.expectJSX('<');
        if (this.matchJSX('/')) {
            this.expectJSX('/');
            if (this.matchJSX('>')) {
                this.expectJSX('>');
                return this.finalize(node, new JSXClosingFragment());
            }
            const elementName = this.parseJSXElementName();
            this.expectJSX('>');
            return this.finalize(node, new JSXClosingElement(elementName));
        }
        const name = this.parseJSXElementName();
        const attributes = this.parseJSXAttributes();
        const selfClosing = this.matchJSX('/');
        if (selfClosing) {
            this.expectJSX('/');
        }
        this.expectJSX('>');
        return this.finalize(node, new JSXOpeningElement(name, selfClosing, attributes));
    }
    parseJSXEmptyExpression() {
        const node = this.createJSXChildNode();
        this.collectComments();
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        return this.finalize(node, new JSXEmptyExpression());
    }
    parseJSXExpressionContainer() {
        const node = this.createJSXNode();
        this.expectJSX('{');
        let expression;
        if (this.matchJSX('}')) {
            expression = this.parseJSXEmptyExpression();
            this.expectJSX('}');
        } else {
            this.finishJSX();
            expression = this.parseAssignmentExpression();
            this.reenterJSX();
        }
        return this.finalize(node, new JSXExpressionContainer(expression));
    }
    parseJSXChildren() {
        const children = [];
        while(!this.scanner.eof()){
            const node = this.createJSXChildNode();
            const token = this.nextJSXText();
            if (token.start < token.end) {
                const raw = this.getTokenRaw(token);
                const child = this.finalize(node, new JSXText(token.value, raw));
                children.push(child);
            }
            if (this.scanner.source[this.scanner.index] === '{') {
                const container = this.parseJSXExpressionContainer();
                children.push(container);
            } else {
                break;
            }
        }
        return children;
    }
    parseComplexJSXElement(el) {
        const stack = [];
        while(!this.scanner.eof()){
            el.children = el.children.concat(this.parseJSXChildren());
            const node = this.createJSXChildNode();
            const element = this.parseJSXBoundaryElement();
            if (element.type === JSXSyntax.JSXOpeningElement) {
                const opening = element;
                if (opening.selfClosing) {
                    const child = this.finalize(node, new JSXElement(opening, [], null));
                    el.children.push(child);
                } else {
                    stack.push(el);
                    el = {
                        node,
                        opening,
                        closing: null,
                        children: []
                    };
                }
            }
            if (element.type === JSXSyntax.JSXClosingElement) {
                el.closing = element;
                const open = getQualifiedElementName(el.opening.name);
                const close = getQualifiedElementName(el.closing.name);
                if (open !== close) {
                    this.tolerateError('Expected corresponding JSX closing tag for %0', open);
                }
                if (stack.length > 0) {
                    const child = this.finalize(el.node, new JSXElement(el.opening, el.children, el.closing));
                    el = stack[stack.length - 1];
                    el.children.push(child);
                    stack.pop();
                } else {
                    break;
                }
            }
            if (element.type === JSXSyntax.JSXClosingFragment) {
                el.closing = element;
                if (el.opening.type !== JSXSyntax.JSXOpeningFragment) {
                    this.tolerateError('Expected corresponding JSX closing tag for jsx fragment');
                } else {
                    break;
                }
            }
        }
        return el;
    }
    parseJSXElement() {
        const node = this.createJSXNode();
        const opening = this.parseJSXOpeningElement();
        let children = [];
        let closing = null;
        if (!opening.selfClosing) {
            const el = this.parseComplexJSXElement({
                node,
                opening,
                closing,
                children
            });
            children = el.children;
            closing = el.closing;
        }
        return this.finalize(node, new JSXElement(opening, children, closing));
    }
    parseJSXRoot() {
        if (this.config.tokens) {
            this.tokens.pop();
        }
        this.startJSX();
        const element = this.parseJSXElement();
        this.finishJSX();
        return element;
    }
    isStartOfExpression() {
        return super.isStartOfExpression() || this.match('<');
    }
}
function parse3(code, options, delegate) {
    let commentHandler = null;
    const proxyDelegate = (node, metadata)=>{
        if (delegate) {
            delegate(node, metadata);
        }
        if (commentHandler) {
            commentHandler.visit(node, metadata);
        }
    };
    let parserDelegate = typeof delegate === 'function' ? proxyDelegate : null;
    let collectComment = false;
    if (options) {
        collectComment = typeof options.comment === 'boolean' && options.comment;
        const attachComment = typeof options.attachComment === 'boolean' && options.attachComment;
        if (collectComment || attachComment) {
            commentHandler = new CommentHandler();
            commentHandler.attach = attachComment;
            options.comment = true;
            parserDelegate = proxyDelegate;
        }
    }
    let isModule = false;
    if (options && typeof options.sourceType === 'string') {
        isModule = options.sourceType === 'module';
    }
    let parser;
    if (options && typeof options.jsx === 'boolean' && options.jsx) {
        parser = new JSXParser(code, options, parserDelegate);
    } else {
        parser = new Parser(code, options, parserDelegate);
    }
    const program = isModule ? parser.parseModule() : parser.parseScript();
    const ast = program;
    if (collectComment && commentHandler) {
        ast.comments = commentHandler.comments;
    }
    if (parser.config.tokens) {
        ast.tokens = parser.tokens;
    }
    if (parser.config.tolerant) {
        ast.errors = parser.errorHandler.errors;
    }
    return ast;
}
function parseScript(code, options, delegate) {
    const parsingOptions = options || {};
    parsingOptions.sourceType = 'script';
    return parse3(code, parsingOptions, delegate);
}
var d = Object.create;
var b = Object.defineProperty;
var p = Object.getOwnPropertyDescriptor;
var A1 = Object.getOwnPropertyNames;
var E2 = Object.getPrototypeOf, S = Object.prototype.hasOwnProperty;
var _ = (e, r)=>()=>(r || e((r = {
            exports: {}
        }).exports, r), r.exports), h = (e, r)=>{
    for(var t in r)b(e, t, {
        get: r[t],
        enumerable: !0
    });
}, i1 = (e, r, t, c)=>{
    if (r && typeof r == "object" || typeof r == "function") for (let n of A1(r))!S.call(e, n) && n !== t && b(e, n, {
        get: ()=>r[n],
        enumerable: !(c = p(r, n)) || c.enumerable
    });
    return e;
}, u = (e, r, t)=>(i1(e, r, "default"), t && i1(t, r, "default")), s = (e, r, t)=>(t = e != null ? d(E2(e)) : {}, i1(r || !e || !e.__esModule ? b(t, "default", {
        value: e,
        enumerable: !0
    }) : t, e));
var o2 = _((q, O)=>{
    "use strict";
    var w = function(r) {
        return x(r) && !I(r);
    };
    function x(e) {
        return !!e && typeof e == "object";
    }
    function I(e) {
        var r = Object.prototype.toString.call(e);
        return r === "[object RegExp]" || r === "[object Date]" || v(e);
    }
    var T = typeof Symbol == "function" && Symbol.for, P = T ? Symbol.for("react.element") : 60103;
    function v(e) {
        return e.$$typeof === P;
    }
    function U(e) {
        return Array.isArray(e) ? [] : {};
    }
    function l(e, r) {
        return r.clone !== !1 && r.isMergeableObject(e) ? f(U(e), e, r) : e;
    }
    function N(e, r, t) {
        return e.concat(r).map(function(c) {
            return l(c, t);
        });
    }
    function R(e, r) {
        if (!r.customMerge) return f;
        var t = r.customMerge(e);
        return typeof t == "function" ? t : f;
    }
    function $(e) {
        return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(e).filter(function(r) {
            return Object.propertyIsEnumerable.call(e, r);
        }) : [];
    }
    function y(e) {
        return Object.keys(e).concat($(e));
    }
    function m(e, r) {
        try {
            return r in e;
        } catch  {
            return !1;
        }
    }
    function C(e, r) {
        return m(e, r) && !(Object.hasOwnProperty.call(e, r) && Object.propertyIsEnumerable.call(e, r));
    }
    function D(e, r, t) {
        var c = {};
        return t.isMergeableObject(e) && y(e).forEach(function(n) {
            c[n] = l(e[n], t);
        }), y(r).forEach(function(n) {
            C(e, n) || (m(e, n) && t.isMergeableObject(r[n]) ? c[n] = R(n, t)(e[n], r[n], t) : c[n] = l(r[n], t));
        }), c;
    }
    function f(e, r, t) {
        t = t || {}, t.arrayMerge = t.arrayMerge || N, t.isMergeableObject = t.isMergeableObject || w, t.cloneUnlessOtherwiseSpecified = l;
        var c = Array.isArray(r), n = Array.isArray(e), M = c === n;
        return M ? c ? t.arrayMerge(e, r, t) : D(e, r, t) : l(r, t);
    }
    f.all = function(r, t) {
        if (!Array.isArray(r)) throw new Error("first argument should be an array");
        return r.reduce(function(c, n) {
            return f(c, n, t);
        }, {});
    };
    var F = f;
    O.exports = F;
});
var a = {};
h(a, {
    all: ()=>K,
    default: ()=>V
});
var j = s(o2());
u(a, s(o2()));
var { all: K  } = j, { default: g2 , ...L } = j, V = g2 !== void 0 ? g2 : L;
function s1(t = {}) {
    let r = [
        {
            variables: {},
            ...t
        }
    ];
    return {
        push (e = {}) {
            return r.push(V(this.get(), e)), this.get();
        },
        get () {
            return r[r.length - 1];
        },
        pop () {
            return r.pop(), this.get();
        }
    };
}
var u1 = ({ mappers: t , scope: r , decoratedTranspile: e  }, o, { arraySeparator: a = `
`  } = {})=>(Array.isArray(o) ? o : [
        o
    ]).filter((p)=>p).map((p)=>{
        let n = t[p.type];
        if (!n) throw new Error(`\x1B[41m\x1B[37mThere is no handler for ${p.type}\x1B[0m`);
        let i = n(p, {
            transpile: e,
            scope: n.scopeBoundary ? r.push() : r.get()
        }) || "";
        return n.scopeBoundary && r.pop(), i;
    }).join(a);
function l({ mappers: t = {} , initialScopeData: r  } = {}) {
    let e = {
        scope: s1(r),
        mappers: t
    };
    return e.decoratedTranspile = u1.bind(null, e);
}
const ClassDeclaration1 = ({ id , body  }, { transpile  })=>`local class_${transpile(id)} = function (...)
    local this = {}
    local classinstance = ${transpile(body)}
    if (classinstance.constructor) classinstance.constructor(...)
    return classinstance
  end`;
function normalizeName(name) {
    return name.toLowerCase().replace(/\$/g, "_");
}
function wrapWithParantheses(condition, expression) {
    return condition ? `(${expression})` : expression;
}
const FunctionDeclaration1 = ({ id , body , params  }, { transpile  })=>{
    const { name =""  } = id || {};
    const argumentList = transpile(params, {
        arraySeparator: ", "
    });
    const functionContent = transpile(body);
    return `function ${normalizeName(name)}(${argumentList})
    ${functionContent}
  end`;
};
FunctionDeclaration1.scopeBoundary = true;
const VariableDeclaration1 = ({ declarations  }, { transpile  })=>transpile(declarations);
const VariableDeclarator1 = ({ id , init  }, { scope , transpile  })=>{
    const { name  } = id;
    const normalizedName = normalizeName(name);
    const value = transpile(init) || "nil";
    scope.variables[name] = {
        name: normalizedName
    };
    return `local ${normalizedName} = ${value}`;
};
const ArrayExpression1 = ({ elements  }, { transpile  })=>`{
    ${transpile(elements, {
        arraySeparator: ", "
    })}
  }`;
const ArrowFunctionExpression1 = (...args)=>FunctionDeclaration1(...args);
ArrowFunctionExpression1.scopeBoundary = true;
const AssignmentExpression1 = ({ operator , left , right  }, { transpile  })=>{
    const leftExpression = transpile(left);
    const rightExpression = transpile(right);
    return `${leftExpression}${operator}${rightExpression}`;
};
const operatorTable = {
    "!==": "!=",
    "===": "=="
};
const BinaryExpression1 = ({ operator , left , right  }, { transpile  })=>{
    let leftExpression = transpile(left);
    let rightExpression = transpile(right);
    const luaOperator = operatorTable[operator] || operator;
    if (luaOperator === "*" || luaOperator === "/" || luaOperator === "%") {
        if (left.type === BinaryExpression1.name) {
            leftExpression = `(${leftExpression})`;
        }
        if (right.type === BinaryExpression1.name) {
            rightExpression = `(${rightExpression})`;
        }
    }
    return `${leftExpression} ${luaOperator} ${rightExpression}`;
};
const genericPolyfillMap = {
    "console.log": (args)=>`printh(${args})`,
    "math.abs": (args)=>`abs(${args})`,
    "math.ceil": (args)=>`ceil(${args})`,
    "math.floor": (args)=>`flr(${args})`,
    "math.max": (args)=>`max(${args})`,
    "math.min": (args)=>`min(${args})`,
    "math.random": ()=>"rnd()",
    "math.sqrt": (args)=>`sqrt(${args})`,
    "math.sin": (args)=>`-sin(${args})`,
    "object.assign": (args)=>`_assign({${args}})`,
    "object.entries": (args)=>`_objmap(${args}, _byentries)`,
    "object.keys": (args)=>`_objmap(${args}, _bykeys)`,
    "object.values": (args)=>`_objmap(${args}, _byvalues)`
};
const arrayPolyfillMap = {
    filter: (context, args)=>`_filter(${context}, ${args})`,
    findindex: (context, args)=>`_findindex(${context}, ${args})`,
    foreach: (context, args)=>`foreach(${context}, ${args})`,
    includes: (context, arg)=>`_includes(${context}, ${arg})`,
    join: (context, args)=>args ? `_join(${context}, ${args})` : `_join(${context})`,
    length: (context)=>`#${context}`,
    map: (context, args)=>`_map(${context}, ${args})`,
    pop: (context)=>`_pop(${context})`,
    push: (context, args)=>`add(${context}, ${args})`,
    reduce: (context, args)=>`_reduce(${context}, ${args})`,
    sort: (context, args)=>args ? `_sort(${context}, ${args})` : `_sort(${context})`,
    split: (context, args)=>`_split(${context}, ${args})`,
    substr: (context, args)=>`_substr(${context}, ${args})`,
    substring: (context, args)=>`_substring(${context}, ${args})`,
    tostring: (context)=>`_tostring(${context})`
};
function getPolyfilledCallExpression(args) {
    const { transpile , callee , argumentList =""  } = args;
    const callExpression = transpile(callee);
    const context = transpile(callee.object);
    const functionName = transpile(callee.property);
    if (genericPolyfillMap.hasOwnProperty(callExpression)) {
        return genericPolyfillMap[callExpression](argumentList);
    }
    if (context && functionName && arrayPolyfillMap.hasOwnProperty(functionName)) {
        return arrayPolyfillMap[functionName](context, argumentList);
    }
    return `${callExpression}(${argumentList})`;
}
const FunctionExpression1 = (node, options)=>FunctionDeclaration1({
        ...node,
        id: null
    }, options);
FunctionExpression1.scopeBoundary = true;
const CallExpression1 = ({ callee , arguments: args  }, { transpile  })=>{
    const argumentList = transpile(args, {
        arraySeparator: ", "
    });
    if (callee.object) {
        return getPolyfilledCallExpression({
            transpile,
            callee,
            argumentList
        });
    }
    const calleeExpression = wrapWithParantheses(callee.type === FunctionExpression1.name, transpile(callee));
    return `${calleeExpression}(${argumentList})`;
};
const ClassBody1 = ({ body  }, { transpile  })=>`{
    ${transpile(body, {
        arraySeparator: ",\n"
    })}
  }`;
const ConditionalExpression1 = ({ test , consequent , alternate  }, { transpile  })=>{
    const testExpression = transpile(test);
    const consequentPath = transpile(consequent);
    const alternatePath = transpile(alternate);
    return `(function () if ${testExpression} then return ${consequentPath} else return ${alternatePath} end end)()`;
};
const specialCases = {
    undefined: "nil"
};
const Identifier1 = ({ name , value  })=>{
    const identifier = normalizeName(value || name);
    return specialCases.hasOwnProperty(identifier) && specialCases[identifier] || identifier;
};
const specialCases1 = {
    null: "nil"
};
const Literal1 = ({ raw  })=>specialCases1[raw] || raw;
const LogicalExpression = ({ operator , left , right  }, { transpile  })=>{
    const logicalOperator = operator === "||" ? "or" : "and";
    const leftExpression = wrapWithParantheses(left.type === LogicalExpression.name && logicalOperator === "and", transpile(left));
    const rightExpression = wrapWithParantheses(right.type === LogicalExpression.name && logicalOperator === "and", transpile(right));
    return `${leftExpression} ${logicalOperator} ${rightExpression}`;
};
function getPolyfilledMemberExpression({ transpile , computed , object , property  }) {
    const objectName = transpile(object);
    const propertyName = transpile(property);
    if (arrayPolyfillMap.hasOwnProperty(propertyName)) {
        return arrayPolyfillMap[propertyName](objectName, "");
    }
    return computed ? `${objectName}[${propertyName}]` : `${objectName}.${propertyName}`;
}
const MemberExpression = ({ computed , object , property  }, { transpile  })=>getPolyfilledMemberExpression({
        transpile,
        computed,
        object,
        property
    });
const MethodDefinition1 = ({ key , value  }, { transpile  })=>`${transpile(key)} = ${transpile(value)}`;
const NewExpression1 = ({ arguments: args , callee  }, { transpile  })=>{
    const className = `class_${transpile(callee)}`;
    const classArguments = transpile(args, {
        arraySeparator: ","
    });
    return `${className}(${classArguments})`;
};
const ObjectExpression1 = ({ properties  }, { transpile  })=>`{
    ${transpile(properties, {
        arraySeparator: ",\n"
    })}
  }`;
const Property1 = ({ key , value  }, { transpile  })=>{
    const { name , value: alternativeName = ""  } = key;
    return `${normalizeName(name || alternativeName)} = ${transpile(value)}`;
};
const SequenceExpression1 = ({ expressions  }, { transpile  })=>transpile(expressions, {
        arraySeparator: "\n"
    });
const ThisExpression1 = ()=>"this";
const UnaryExpression1 = ({ operator , argument  }, { transpile  })=>{
    const value = transpile(argument);
    if (operator === "~") {
        throw new Error("Unary operator ~ is not supported.");
    }
    const luaOperator = operator === "!" ? "not " : operator;
    return operator === "void" ? "nil" : `${luaOperator}${value}`;
};
const UpdateExpression1 = ({ argument , operator  }, { transpile  })=>{
    const identifier = transpile(argument);
    return `${identifier}${operator[0]}=1`;
};
const BlockStatement1 = ({ body  }, { transpile  })=>transpile(body);
BlockStatement1.scopeBoundary = true;
const BreakStatement1 = (_, { scope: { isInsideSwitch  }  })=>isInsideSwitch ? "" : "break";
const DoWhileStatement1 = ({ body , test  }, { transpile  })=>`repeat
    ${transpile(body)}
  until not (${transpile(test)})`;
const EmptyStatement1 = ()=>"";
const ExpressionStatement1 = ({ expression , directive  }, { transpile  })=>!directive ? wrapWithParantheses(expression.type === FunctionExpression1.name, transpile(expression)) : "";
const IfStatement1 = ({ test , consequent , alternate  }, { transpile  })=>{
    const testExpression = transpile(test);
    const statementBody = transpile(consequent);
    const alternateStatement = transpile(alternate);
    const alternateIsIfStatement = alternate && alternate.type === IfStatement1.name;
    let closingStatement = "end";
    if (alternateStatement) {
        closingStatement = alternateIsIfStatement ? `else${alternateStatement}` : `else ${alternateStatement} end`;
    }
    return `if ${testExpression} then
    ${statementBody}
  ${closingStatement}`;
};
const ForStatement1 = ({ body , init , test , update  }, { transpile  })=>`${transpile(init)}
  while ${transpile(test)} do
    ${transpile(body)}
    ${transpile(update, {
        arraySeparator: "\n"
    })}
  end`;
const ReturnStatement1 = ({ argument  }, { transpile  })=>{
    const value = transpile(argument);
    return value ? `return ${value}` : "do return end";
};
const SwitchCase1 = ({ test , consequent  }, { transpile  })=>{
    if (consequent.length === 0) {
        throw new Error("Switch case fallthroughs are not supported.");
    }
    const statements = transpile(consequent, {
        arraySeparator: "\n"
    });
    if (!test) {
        return `\n${statements}`;
    }
    const testValue = transpile(test);
    return `if ${testValue} == switchCase then
    ${statements}
  `;
};
const SwitchStatement1 = ({ discriminant , cases  }, { scope , transpile  })=>{
    const condition = `local switchCase = ${transpile(discriminant)}`;
    scope.isInsideSwitch = true;
    const sortedCases = cases.sort((switchCase)=>!switchCase.test ? 1 : 0);
    return `
    ${condition}
    ${transpile(sortedCases, {
        arraySeparator: "else"
    })}
    end`;
};
SwitchStatement1.scopeBoundary = true;
const ThrowStatement1 = ({ argument  }, { transpile  })=>{
    const transpiledArgument = transpile(argument).replace(/\n/g, "\\n").replace(/"/g, '\\"');
    return `assert(false, "${transpiledArgument}")`;
};
const WhileStatement1 = ({ body , test  }, { transpile  })=>`while ${transpile(test)} do
    ${transpile(body)}
  end`;
const mod2 = {
    MethodDefinition: MethodDefinition1,
    ThrowStatement: ThrowStatement1,
    BreakStatement: BreakStatement1,
    UnaryExpression: UnaryExpression1,
    SequenceExpression: SequenceExpression1,
    ObjectExpression: ObjectExpression1,
    FunctionExpression: FunctionExpression1,
    WhileStatement: WhileStatement1,
    DoWhileStatement: DoWhileStatement1,
    MemberExpression,
    ForStatement: ForStatement1,
    ReturnStatement: ReturnStatement1,
    BlockStatement: BlockStatement1,
    LogicalExpression,
    Property: Property1,
    SwitchStatement: SwitchStatement1,
    Identifier: Identifier1,
    ExpressionStatement: ExpressionStatement1,
    CallExpression: CallExpression1,
    ClassDeclaration: ClassDeclaration1,
    IfStatement: IfStatement1,
    ArrowFunctionExpression: ArrowFunctionExpression1,
    ArrayExpression: ArrayExpression1,
    BinaryExpression: BinaryExpression1,
    SwitchCase: SwitchCase1,
    EmptyStatement: EmptyStatement1,
    NewExpression: NewExpression1,
    ConditionalExpression: ConditionalExpression1,
    UpdateExpression: UpdateExpression1,
    VariableDeclarator: VariableDeclarator1,
    ThisExpression: ThisExpression1,
    FunctionDeclaration: FunctionDeclaration1,
    Literal: Literal1,
    AssignmentExpression: AssignmentExpression1,
    VariableDeclaration: VariableDeclaration1,
    ClassBody: ClassBody1
};
function createJspiclTranspiler(customMappers, initialScopeData) {
    return l({
        initialScopeData,
        mappers: {
            ...mod2,
            ...customMappers
        }
    });
}
const _assign = `
function _assign(sources)
  local target = sources[1]
  del(sources, target)
  for source in all(sources) do
    for key, value in pairs(source) do
      target[key] = value
    end
  end

  return target
end
`;
const _filter = `
function _filter(collection, predicate)
  local result = {}
  for value in all(collection) do
    if predicate(value) then
      add(result, value)
    end
  end

  return result
end
`;
const _findindex = `
function _findindex(collection, value)
  for i=1,#collection do
    if (collection[i] == value) then return i end
  end
end
`;
const _includes = `
function _includes(collection, searchelement)
  for value in all(collection) do
    if value == searchelement then
      return true
    end
  end

  return false
end
`;
const _join = `
function _join(collection, separator)
  separator = separator or ","
  local result = ""
  for value in all(collection) do
    result = result..separator..tostr(value)
  end

  if separator != "" then
    result = sub(result, #separator + 1)
  end

  return result
end
`;
const _map = `
function _map(collection, callback)
  local result = {}
  for value in all(collection) do
    add(result, callback(value))
  end

  return result
end
`;
const _objmap = `
function _byentries(key, value)
  return {key, value}
end

function _byvalues(key, value)
  return value
end

function _bykeys(key)
  return key
end

function _objmap(source, mapper)
  local result = {}
  for key, value in pairs(source) do
    add(result, mapper(key, value))
  end

  return result
end
`;
const _pop = `
function _pop(collection)
  local v = collection[#collection]
  collection[#collection] = nil
  return v
end`;
const _reduce = `
function _reduce(collection, callback, initialvalue)
  local result = collection[1]
  local startindex = 2
  if initialvalue then
    result = initialvalue
    startindex = 1
  end

  for i=startindex, #collection do
    result = callback(result, collection[i])
  end

  return result
end
`;
const _sort = `
function _sort(collection, comparison)
  local clone = {}
  for key, value in pairs(collection) do
    clone[key] = value
  end

  for i=1, #clone do
    local j = i
    while j > 1 and _defaultcompare(clone[j], clone[j-1]) do
    clone[j],clone[j-1] = clone[j-1],clone[j]
      j = j - 1
    end
  end

  return clone
end

function _defaultcompare(a, b)
  return a < b
end
`;
const _split = `
function _split(str, separator)
  local indices = {}
  local i = 1
  while i <= #str do
    if sub(str, i, i + #separator - 1) == separator then
      add(indices, i)
    end
    i+=1
  end

  local result = {}
  local lastoffset = 1
  foreach(indices, function (offset)
    add(result, sub(str, lastoffset, offset - 1))
    lastoffset = offset + #separator
  end)

  add(result, sub(str, lastoffset))

  if separator == "" then
    del(result, "")
  end

  return result
end`;
const _substr = `
function _substr(str, indexStart, length)
  return sub(str, indexStart + 1, indexStart + (length or #str))
end`;
const _substring = `
function _substring(str, indexStart, indexEnd)
  return sub(str, indexStart + 1, indexEnd)
end`;
const _tostring = `
function _tostring(input, level)
  level = max(level, 1)
  local output = ""

  if type(input) != "table" then
    return tostr(input)
  end

  local indentation = ""
  for i=2, level do
    indentation = indentation.."  "
  end

  for key, value in pairs(input) do
    if type(value) == "table" then
      output = output..indentation.."  "..key..": ".._tostring(value, level + 1).."\\n"
    elseif type(key) != "number" then
      output = output..indentation.."  "..key..": ".._tostring(value, level + 1).."\\n"
    else
      output = output..value..", "
    end
  end

  if sub(output, -2) == ", " then
    output = indentation.."  "..sub(output, 1, -3).."\\n" -- remove last comma
  end

  return "{\\n"..output..indentation.."}"
end
`;
const mod11 = {
    _assign,
    _filter,
    _findindex,
    _includes,
    _join,
    _map,
    _objmap,
    _pop,
    _reduce,
    _sort,
    _split,
    _substr,
    _substring,
    _tostring
};
const polyfillMatcher = /(?<!\.)\b_\w+\(/g;
function getRequiredPolyfills(luaCode) {
    const detectedPolyfills = new Set(luaCode.match(polyfillMatcher));
    const implementations = mod11;
    return Array.from(detectedPolyfills).reduce((result, match)=>{
        const polyfillId = match.substr(0, match.length - 1);
        result[polyfillId] = implementations[polyfillId];
        return result;
    }, {});
}
const indentIncrease = [
    (line)=>/^\bfor\b\s/.test(line),
    (line)=>/^\bforeach\b/.test(line) && !/\)$/.test(line),
    (line)=>/\bfunction\b/.test(line),
    (line)=>/^\bif\b\s/.test(line) && /\bthen\b$/.test(line),
    (line)=>/^while\s/.test(line),
    (line)=>/^repeat\s/.test(line),
    (line)=>/{$/.test(line),
    (line)=>/\bthen\b$/.test(line)
];
const indentDecrease = [
    (line)=>/^end[)]?/.test(line),
    (line)=>/end$/.test(line),
    (line)=>/^else/.test(line),
    (line)=>/^}/.test(line)
];
function prettify(luaCode) {
    const lines = luaCode.split("\n").map((line)=>line.trim());
    const { code  } = lines.reduce((result, line)=>{
        const { code , indentation  } = result;
        let currentIndentation = indentation;
        let nextLineIndentation = indentation;
        if (indentIncrease.some((entry)=>entry(line))) {
            nextLineIndentation++;
        }
        if (indentDecrease.some((entry)=>entry(line))) {
            currentIndentation--;
            nextLineIndentation--;
        }
        code.push(line && line.padStart(line.length + currentIndentation * 2) || line);
        return {
            code,
            indentation: Math.max(0, nextLineIndentation)
        };
    }, {
        code: [],
        indentation: 0
    });
    return code.join("\n");
}
const defaultOptions1 = {
    prettify: true
};
function jspicl(source, overrideOptions) {
    const options = {
        ...defaultOptions1,
        ...overrideOptions
    };
    const transpile = createJspiclTranspiler(options.customMappers);
    const { body  } = parseScript(source, {
        loc: true,
        range: true
    });
    let code = transpile(body);
    if (options.prettify) {
        code = prettify(code);
    }
    return {
        polyfills: getRequiredPolyfills(code),
        code
    };
}
function transpile(javascriptCode, options) {
    const { includeBanner , polyfillTransform , jspicl: jspiclOptions = {}  } = options;
    const jspiclBanner = includeBanner && `${banner}` || "";
    const { code , polyfills  } = jspicl(javascriptCode, jspiclOptions);
    const polyfillOutput = polyfillTransform ? polyfillTransform(polyfills) : Object.values(polyfills).join("\n");
    const lua = `${polyfillOutput}${code}`;
    return {
        lua,
        polyfillOutput,
        toString () {
            return `${jspiclBanner}${lua}`;
        }
    };
}
function plugin(customizedOptions) {
    const options = {
        ...defaultOptions,
        ...customizedOptions
    };
    if (!options.cartridgePath) {
        throw new Error("Ensure that 'cartridgePath' property in options is set.");
    }
    if (!options.spritesheetImagePath) {
        throw new Error("Ensure that 'spritesheetImagePath' property in options is set.");
    }
    let runOnce = true;
    const runPico = createPico8Launcher(options);
    return {
        name: "jspicl",
        buildStart () {
            if (runOnce) {
                options.watch && logSuccess("Watching source files for changes");
                logSuccess("Building cartridge");
            }
            runOnce = false;
            if (options.watch) {
                logSuccess("Not watching (disabled for now)");
            }
        },
        async renderChunk (javascriptCode) {
            const { cartridgePath , jsOutput , luaOutput , showStats , spritesheetImagePath  } = options;
            const transpiledSource = transpile(javascriptCode, options);
            const cartridgeSections = getCartridgeSections(cartridgePath);
            logSuccess("Reading Gfx");
            const gfxSection = await getSpritesheetFromImage(spritesheetImagePath);
            logSuccess("Read Gfx");
            const code = generateCartridgeContent({
                ...cartridgeSections,
                lua: transpiledSource,
                gfx: gfxSection
            });
            logSuccess("Generated cart");
            jsOutput && logToFile(javascriptCode, jsOutput);
            luaOutput && logToFile(transpiledSource.lua, luaOutput);
            logSuccess("Complete");
            return {
                code
            };
        },
        watchChange () {
            console.clear();
            logSuccess("Change detected, rebuilding cartridge");
        },
        generateBundle ({ file  }) {
            runPico(file);
            options.watch && console.log("\nPress Ctrl+C to stop watching");
        }
    };
}
const jspiclCli = async (config)=>{
    if (config.jsOutput && typeof config.jsOutput === "boolean") {
        const filename = basename2(config.output, extname2(config.output));
        config.jsOutput = resolve2(join3(dirname2(config.output), `${filename}.js`));
    }
    if (config.luaOutput && typeof config.luaOutput === "boolean") {
        const filename = basename2(config.output, extname2(config.output));
        config.luaOutput = resolve2(join3(dirname2(config.output), `${filename}.lua`));
    }
    const builder = plugin({
        cartridgePath: config.cartridgePath,
        spritesheetImagePath: config.spritesheetImagePath,
        includeBanner: config.includeBanner || false,
        jsOutput: config.jsOutput,
        luaOutput: config.luaOutput,
        showStats: config.showStats || false,
        customPicoPath: config.customPicoPath,
        pipeOutputToConsole: config.pipeOutputToConsole
    });
    builder.buildStart();
    const js = (await Deno.readTextFile(config.input)).replace(/\/\/ <!-- DEBUG[^//]*\/\/\s-->/g, "");
    const cart = await builder.renderChunk(js);
    await Deno.writeTextFile(config.output, cart.code);
};
export { jspiclCli as jspiclCli };

