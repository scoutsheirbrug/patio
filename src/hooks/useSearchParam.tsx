import { useCallback, useEffect, useState } from 'preact/hooks'

function getValue(search: string, param: string) {
	return new URLSearchParams(search).get(param) ?? undefined
}

export function useSearchParam(param: string): [string | undefined, (value: string | undefined) => unknown] {
	const location = window.location
	const [value, setValue] = useState<string | undefined>(getValue(location.search, param))

	useEffect(() => {
		const onChange = () => {
			setValue(getValue(location.search, param))
		}

		window.addEventListener('popstate', onChange)
		window.addEventListener('pushstate', onChange)
		window.addEventListener('replacestate', onChange)

		return () => {
			window.removeEventListener('popstate', onChange)
			window.removeEventListener('pushstate', onChange)
			window.removeEventListener('replacestate', onChange)
		}
	}, [])

	const changeValue = useCallback((newValue: string | undefined) => {
		if (newValue !== value) {
			setValue(newValue)
			const params = new URLSearchParams(location.search)
			if (newValue === undefined || newValue.length === 0) {
				params.delete(param)
			} else {
				params.set(param, newValue)
			}
			history.replaceState(null, '', `${location.pathname}?${params.toString()}`)
		}
	}, [value])

	return [value, changeValue]
};
