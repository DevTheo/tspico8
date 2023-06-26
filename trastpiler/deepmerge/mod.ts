import {isMergeableObject} from '../is-mergeable-object/mod.ts';
const defaultIsMergeableObject = isMergeableObject;

function emptyTarget(val: any) {
	return Array.isArray(val) ? [] : {}
}

function cloneUnlessOtherwiseSpecified(value: any, options: DeepMergeOptions): any {
	return (options.clone !== false && 
        (options.isMergeableObject && options.isMergeableObject(value))) ?
  		    deepmerge(emptyTarget(value), value, options)
		  : value
}

function defaultArrayMerge(target: any, source: any, options: DeepMergeOptions): any {
	return target.concat(source).map(function(element: any) {
		return cloneUnlessOtherwiseSpecified(element, options)
	})
}

function getMergeFunction(key: any, options: DeepMergeOptions) {
	if (!options.customMerge) {
		return deepmerge
	}
	var customMerge = options.customMerge(key)
	return typeof customMerge === 'function' ? customMerge : deepmerge
}

function getEnumerableOwnPropertySymbols(target: any): any {
	return Object.getOwnPropertySymbols
		? Object.getOwnPropertySymbols(target).filter(function(symbol) {
			return Object.propertyIsEnumerable.call(target, symbol)
		})
		: []
}

function getKeys(target: any) {
	return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))
}

function propertyIsOnObject(object: any, property: any): any {
	try {
		return property in object
	} catch(_) {
		return false
	}
}

// Protects from prototype poisoning and unexpected merging up the prototype chain.
function propertyIsUnsafe(target: any, key: any): any {
	return propertyIsOnObject(target, key) // Properties are safe to merge if they don't exist in the target yet,
		&& !(Object.hasOwnProperty.call(target, key) // unsafe if they exist up the prototype chain,
			&& Object.propertyIsEnumerable.call(target, key)) // and also unsafe if they're nonenumerable.
}

function mergeObject(target: any, source: any, options: any): any {
	var destination = {} as any;
	if (options.isMergeableObject(target)) {
		getKeys(target).forEach(function(key) {
			destination[key] = cloneUnlessOtherwiseSpecified(target[key], options)
		})
	}
	getKeys(source).forEach(function(key) {
		if (propertyIsUnsafe(target, key)) {
			return
		}

		if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
			destination[key] = getMergeFunction(key, options)(target[key], source[key], options)
		} else {
			destination[key] = cloneUnlessOtherwiseSpecified(source[key], options)
		}
	})
	return destination
}

// declare function deepmerge<T>(x: Partial<T>, y: Partial<T>, options?: deepmerge.Options): T;
// declare function deepmerge<T1, T2>(x: Partial<T1>, y: Partial<T2>, options?: deepmerge.Options): T1 & T2;
function deepmerge(target: any, source: any, options?: any) {
	options = options || {}
	options.arrayMerge = options.arrayMerge || defaultArrayMerge
	options.isMergeableObject = options.isMergeableObject || defaultIsMergeableObject
	// cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
	// implementations can use it. The caller may not replace it.
	options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified

	var sourceIsArray = Array.isArray(source)
	var targetIsArray = Array.isArray(target)
	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray

	if (!sourceAndTargetTypesMatch) {
		return cloneUnlessOtherwiseSpecified(source, options)
	} else if (sourceIsArray) {
		return options.arrayMerge(target, source, options)
	} else {
		return mergeObject(target, source, options)
	}
}

function deepmergeAll(array: any, options: any) {
    if (!Array.isArray(array)) {
        throw new Error('first argument should be an array')
    }

    return array.reduce(function(prev, next) {
        return deepmerge(prev, next, options)
    }, {})
}

export type DeepMergeOptions = {
    arrayMerge?(target: any[], source: any[], options?: DeepMergeArrayMergeOptions): any[];
    clone?: boolean;
    customMerge?: (key: string, options?: DeepMergeOptions) => ((x: any, y: any) => any) | undefined;
    isMergeableObject?(value: object): boolean;
}

export type DeepMergeArrayMergeOptions = {
    isMergeableObject(value: object): boolean;
    cloneUnlessOtherwiseSpecified(value: object, options?: DeepMergeOptions): object;
}

deepmerge.all = deepmergeAll;

export default deepmerge;

//module.exports = deepmerge