import { route } from 'preact-router'
import { useEffect } from 'preact/hooks'

type Props = {
	path: string
}
export function HomePage({}: Props) {
	useEffect(() => {
		route('/scoutsheirbrug')
	}, [])
	return <></>
}
