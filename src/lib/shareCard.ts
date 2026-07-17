export interface ShareCardData {
  displayName: string
  totalMl: number
  goalMl: number
  percent: number
  streak: number
}

async function generateShareCardBlob(data: ShareCardData): Promise<Blob> {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 1000
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas not supported')

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bg.addColorStop(0, '#eaf7fc')
  bg.addColorStop(1, '#86e0f5')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.textAlign = 'center'

  ctx.fillStyle = '#0b4f73'
  ctx.font = "600 44px Kanit, 'IBM Plex Sans Thai', sans-serif"
  ctx.fillText('💧 Drink Water', canvas.width / 2, 130)

  ctx.font = "700 150px Kanit, sans-serif"
  ctx.fillText(`${Math.round(data.percent)}%`, canvas.width / 2, 420)

  ctx.font = "500 34px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = '#0f93bc'
  ctx.fillText(`${data.totalMl.toLocaleString()} / ${data.goalMl.toLocaleString()} ml วันนี้`, canvas.width / 2, 480)

  if (data.streak > 0) {
    ctx.font = "600 36px Kanit, sans-serif"
    ctx.fillStyle = '#f0603d'
    ctx.fillText(`🔥 ${data.streak} วันติดต่อกัน`, canvas.width / 2, 570)
  }

  ctx.font = "400 28px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = '#0b4f73'
  ctx.fillText(data.displayName || 'Drink Water', canvas.width / 2, 900)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))), 'image/png')
  })
}

/** Shares via the Web Share API when available (mobile), otherwise downloads the PNG. */
export async function shareProgressCard(data: ShareCardData): Promise<void> {
  const blob = await generateShareCardBlob(data)
  const file = new File([blob], 'drink-water-progress.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Drink Water',
      text: `วันนี้ดื่มน้ำไปแล้ว ${Math.round(data.percent)}% ของเป้าหมาย!`,
    })
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'drink-water-progress.png'
  a.click()
  URL.revokeObjectURL(url)
}
