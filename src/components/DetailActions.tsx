import { useCallback, useEffect, useRef } from 'preact/hooks'
import { Icons } from './Icons'

type Props = {
	ids: string[]
	id: string
	changeId: (id: string | undefined) => void
	downloadUrl: string
}
export function DetailActions({ids, id, changeId, downloadUrl }: Props) {
	
	const prev = useCallback(() => {
		const index = ids.findIndex(p => p === id)
		if (index !== -1 && index > 0) {
			changeId(ids[index - 1])
		}
	}, [ids, id, changeId])

	const next = useCallback(() => {
		const index = ids.findIndex(p => p === id)
		if (index !== -1 && index < ids.length - 1) {
			changeId(ids[index + 1])
		}
	}, [ids, id, changeId])

	const downloadRef = useRef<HTMLAnchorElement>(null)
	const download = useCallback(() => {
		downloadRef.current?.click()
	}, [downloadRef])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				changeId(undefined)
			} else if (e.key === 'ArrowLeft') {
				prev()
			} else if (e.key === 'ArrowRight') {
				next()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [id, prev, next, changeId])


	return <div class="absolute bottom-4 left-[50%] translate-x-[-50%] bg-black bg-opacity-60 fill-gray-400 rounded-md flex" onClick={e => e.stopPropagation()}>
		<button class="p-4 transition-color hover:fill-white" onClick={() => changeId(undefined)}>
			{Icons.screen_normal}
		</button>
		<button class="p-4 transition-color hover:fill-white" onClick={download}>
			{Icons.download}
		</button>
		<button class="p-4 transition-color hover:fill-white" onClick={prev}>
			{Icons.arrow_left}
		</button>
		<button class="p-4 transition-color hover:fill-white" onClick={next}>
			{Icons.arrow_right}
		</button>
		<a ref={downloadRef} class="hidden" href={downloadUrl} download={id}></a>
	</div>
}
