import { useCallback, useEffect, useState } from 'preact/hooks'

type Props = {
	initial: string,
	detailed: string,
	width?: number,
	class?: string,
	onClick?: (e: MouseEvent) => void,
}
export function ProgressiveImage({ initial, detailed, width, class: clazz, onClick }: Props) {
	const [src, setSrc] = useState(initial)

	useEffect(() => {
		setSrc(initial)
	}, [initial])

	const onLoad = useCallback(() => {
		if (src === detailed) return
		const img = new Image()
		img.onload = () => {
			setSrc(detailed)
		}
		img.src = detailed
	}, [src, detailed])

	return <img class={clazz} src={src} onLoad={onLoad} width={width} onClick={onClick} />
}
