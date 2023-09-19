import { ComponentChildren } from 'preact'

type Props = {
	nowrap?: boolean,
	children: ComponentChildren,
}
export function Actionbar({ nowrap, children }: Props) {
	return <div class={`flex ${nowrap ? '' : 'flex-wrap'} gap-x-4 gap-y-1`}>
		{children}
	</div>
}
