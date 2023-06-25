// deno-lint-ignore no-explicit-any
export function isMergeableObject(value: any): boolean {
	return isNonNullObject(value)
		&& !isSpecial(value)
}

// deno-lint-ignore no-explicit-any
function isNonNullObject(value: any) {
	return !!value && typeof value === 'object'
}

// deno-lint-ignore no-explicit-any
function isSpecial(value: any) {
	const stringValue = Object.prototype.toString.call(value)

	return stringValue === '[object RegExp]'
		|| stringValue === '[object Date]'
		|| isReactElement(value)
}

// see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
const canUseSymbol = typeof Symbol === 'function' && Symbol.for
const REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7

// deno-lint-ignore no-explicit-any
function isReactElement(value: any) {
	return value.$$typeof === REACT_ELEMENT_TYPE
}