import { useCallback, useRef, useState } from 'preact/hooks'
import { Icons } from './Icons'

type Props = {
	value: string
	onChange: (value: string) => void
	editable?: boolean,
	class?: string,
}
export function EditableText({ value, onChange, editable, class: clazz }: Props) {
	const [newValue, setNewValue] = useState<string>()
	const inputRef = useRef<HTMLInputElement>(null)

	const startEditing = useCallback(() => {
		setNewValue(value)
		setTimeout(() => {
			inputRef.current?.select()
		})
	}, [value])

	const onEnter = useCallback((e: KeyboardEvent | FocusEvent) => {
		if (e instanceof FocusEvent || e.key === 'Enter') {
			if (newValue !== undefined && newValue.length > 0) {
				onChange(newValue)
			}
			setNewValue(undefined)
		}
	}, [newValue, onChange])

	return <div class={`group mt-1 flex items-center ${editable ? 'cursor-pointer' : ''}`} onClick={newValue !== undefined || editable === false ? undefined : startEditing}>
		{newValue === undefined
			? <>
				<span class={`border-b border-transparent ${clazz}`}>{value}</span>
				{editable && <div class="hidden group-hover:block">{Icons.pencil}</div>}
			</>
			: <input ref={inputRef} class={`outline-none border-b border-gray-300 bg-gray-50 ${clazz}`} type="text" value={newValue} onInput={(e) => setNewValue((e.target as HTMLInputElement).value)} onKeyDown={onEnter} onBlur={onEnter} />}
	</div>
}
