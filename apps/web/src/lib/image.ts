import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash'

import { TENCENT_CDN_DOMAIN } from '~/app.static.config'

export const calculateDimensions = ({
  width,
  height,
  max,
}: {
  width: number
  height: number
  max: { width: number; height: number }
}) => {
  if (width === 0 || height === 0) throw new Error('Invalid image size')

  const { width: maxW, height: maxH } = max

  const wRatio = maxW / width || 1
  const hRatio = maxH / height || 1

  const ratio = Math.min(wRatio, hRatio, 1)

  return {
    width: width * ratio,
    height: height * ratio,
  }
}

export function getDominantColor(imageObject: HTMLImageElement) {
  const canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d')!

  canvas.width = 1
  canvas.height = 1

  // draw the image to one pixel and let the browser find the dominant color
  ctx.drawImage(imageObject, 0, 0, 1, 1)

  // get pixel color
  const i = ctx.getImageData(0, 0, 1, 1).data

  return `#${((1 << 24) + (i[0] << 16) + (i[1] << 8) + i[2])
    .toString(16)
    .slice(1)}`
}

const getImageData = (image: HTMLImageElement) => {
  const canvas = document.createElement('canvas')
  const ratio = Math.min(100 / image.naturalWidth, 100 / image.naturalHeight, 1)
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

const bytesToBase64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))

const base64ToBytes = (value: string) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export const encodeImageToThumbhash = (image: HTMLImageElement) => {
  const imageData = getImageData(image)
  return bytesToBase64(
    rgbaToThumbHash(imageData.width, imageData.height, imageData.data),
  )
}

export const decodeThumbhashToDataUrl = (thumbhash: string) => {
  try {
    return thumbHashToDataURL(base64ToBytes(thumbhash))
  } catch {
    return
  }
}

export const addImageUrlResizeQuery = (url: string, size: number) => {
  const parsedUrl = new URL(url)

  if (parsedUrl.host === TENCENT_CDN_DOMAIN) {
    // Tencent Cloud 数据万象
    // ?imageMogr2/thumbnail/300x

    return `${url}?imageMogr2/thumbnail/${size}x/strip`
  }

  return url
}
