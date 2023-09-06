import { ApiAlbum, getObjectUrl } from "../api"

type Props = {
  album: ApiAlbum
}
export function Album({ album }: Props) {
  return <div>
      <h2 class="font-bold text-2xl mt-1">{album.name}</h2>
      <span>{album.photos.length} Foto's</span>
      <div class="flex flex-wrap gap-1 mt-4">
        {album.photos.map(p => <div class="photo-container relative cursor-pointer">
          <img class="absolute w-full h-full object-cover bg-gray-100" src={getObjectUrl(p.id)} />
        </div>)}
        <div class="photo-container relative">
          <div class="absolute w-full h-full cursor-pointer bg-gray-100 flex justify-center items-center text-4xl font-bold text-gray-600">
            +
          </div>
        </div>
      </div>
    </div>
}
