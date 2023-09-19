import { route } from 'preact-router'

type Props = {
	path: string
}
export function HomePage({}: Props) {
	route('/scoutsheirbrug')
	return <></>
}
