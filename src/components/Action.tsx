import { ComponentChildren } from 'preact'
import { Link } from 'preact-router'
import { Icons } from './Icons'

type Props = {
	icon?: keyof typeof Icons,
	danger?: true,
	bold?: true,
	link?: string,
	onClick?: () => void,
	children: ComponentChildren,
}
export function Action({ icon, danger, bold, link, onClick, children }: Props) {
	if (link !== undefined) {
		return<Link class={`flex gap-1 items-center whitespace-nowrap hover:underline ${danger ? 'text-red-800 fill-current' : ''}`} href={link} onClick={onClick ? (e => {onClick();e.preventDefault()}) : undefined}>
			{icon && Icons[icon]}
			<span class={bold ? 'font-bold' : ''}>{children}</span>
		</Link>
	}
	if (onClick !== undefined) {
		return<button class={`flex gap-1 items-center whitespace-nowrap hover:underline ${danger ? 'text-red-800 fill-current' : ''}`} onClick={onClick}>
			{icon && Icons[icon]}
			<span class={bold ? 'font-bold' : ''}>{children}</span>
		</button>
	}
	return <div class={`flex gap-1 items-center whitespace-nowrap ${danger ? 'text-red-800 fill-current' : ''}`}>
		{icon && Icons[icon]}
		<span class={bold ? 'font-bold' : ''}>{children}</span>
	</div>
}
