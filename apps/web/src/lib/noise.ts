import 'server-only'

import { PNG } from 'pngjs'

const hexToRgb = (hex: string) => {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

export const createPngNoiseBackground = async (hex: string) => {
  const { b, g, r } = hexToRgb(hex)
  const width = 72
  const height = 72
  const png = new PNG({
    width,
    height,
    filterType: -1,
  })

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (width * y + x) << 2
      png.data[index] = r
      png.data[index + 1] = g
      png.data[index + 2] = b
      png.data[index + 3] = Math.random() > 0.5 ? 255 : 0
    }
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    png
      .pack()
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(`url('data:image/png;base64,${buffer.toString('base64')}')`)
      })
  })
}
