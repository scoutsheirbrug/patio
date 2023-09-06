import { useState } from "preact/hooks"
import { ApiLibrary, getObjectUrl } from "../api"

type Props = {
  library: ApiLibrary
  onSelect: (id: string) => void
  onAdd: (name: string) => void
}
export function Library({ library, onSelect, onAdd }: Props) {
  const [newName, setNewName] = useState<string>()

  return <div class="flex flex-wrap gap-2">
    {library.albums.map(a => <div class="cursor-pointer" onClick={() => onSelect(a.id)}>
      {a.cover
        ? <img class="w-64 h-64 rounded-lg object-cover" src={getObjectUrl(a.cover)} />
        : <div class="w-64 h-64 bg-gray-300 rounded-lg" />}
      <h2 class="font-bold text-2xl mt-1">{a.name}</h2>
      <span>{a.photos.length} Foto's</span>
    </div>)}
    <div class="cursor-pointer" onClick={newName === undefined ? () => setNewName('') : undefined}>
      <div class="w-64 h-64 bg-gray-100 rounded-lg flex justify-center items-center text-4xl font-bold text-gray-600">+</div>
      {newName !== undefined && <input class="w-64 py-1 px-2 font-bold text-2xl mt-1 bg-gray-200 rounded-md min-w-0" autoFocus={true} value={newName} onInput={e => setNewName((e.target as HTMLInputElement).value)} onBlur={() => onAdd(newName)}/>}
    </div>
  </div>
}
