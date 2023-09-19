import { ComponentChildren } from 'preact'
import { Link } from 'preact-router'
import { Icons } from './Icons'

type Props = {
	icon?: keyof typeof Icons,
	danger?: boolean,
	bold?: boolean,
	link?: string,
	onClick?: () => void,
	children?: ComponentChildren,
}
export function Action({ icon, danger, bold, link, onClick, children }: Props) {
	const clazz = `flex gap-1 items-center whitespace-nowrap ${danger ? 'text-red-800 fill-current' : ''}`
	const content = <>
		{icon && Icons[icon]}
		<span class={bold ? 'font-bold' : ''}>{children}</span>
	</>
	if (link !== undefined) {
		return<Link class={`${clazz} hover:underline`} href={link} onClick={onClick ? (e => {onClick();e.preventDefault()}) : undefined}>
			{content}
		</Link>
	}
	if (onClick !== undefined) {
		return<button class={`${clazz} hover:underline`} onClick={e => {onClick();e.stopPropagation()}}>
			{content}
		</button>
	}
	return <div class={clazz}>
		{content}
	</div>
}
