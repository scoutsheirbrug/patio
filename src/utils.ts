import 'jimp/browser/lib/jimp.js'

declare var Jimp: any

type ThumbnailOptions = {
	size: number,
	square?: boolean,
	quality?: number,
}
export async function resizePhoto(photo: File, { size, square, quality }: ThumbnailOptions) {
	const buffer = await photo.arrayBuffer()
	const jimp = await Jimp.read(buffer)
	if (square) {
		jimp.cover(size, size)
	} else {
		jimp.resize(size, Jimp.AUTO)
	}
	if (quality) {
		jimp.quality(quality)
	}
	const result = await new Promise<Uint8Array>((res, rej) => {
		jimp.getBuffer(Jimp.MIME_JPEG, (err: any, buffer: any) => {
			if (err) rej(err)
			res(buffer)
		})
	})
	return new Blob([result], { type: 'image/jpeg' })
}
