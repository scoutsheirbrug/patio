import { ComponentChildren } from 'preact'
import { Icons } from './Icons'

type Props = {
	icon?: keyof typeof Icons,
	danger?: true,
	bold?: true,
	onClick?: () => void,
	children: ComponentChildren,
}
export function Action({ icon, danger, bold, onClick, children }: Props) {
	if (onClick === undefined) {
		return <div class={`flex gap-1 items-center whitespace-nowrap ${danger ? 'text-red-800 fill-current' : ''}`}>
			{icon && Icons[icon]}
			<span class={bold ? 'font-bold' : ''}>{children}</span>
		</div>
	}
	return <button class={`flex gap-1 items-center whitespace-nowrap hover:underline ${danger ? 'text-red-800 fill-current' : ''}`} onClick={onClick}>
		{icon && Icons[icon]}
		<span class={bold ? 'font-bold' : ''}>{children}</span>
	</button>
}
