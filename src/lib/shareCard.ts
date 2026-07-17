export interface ShareCardData {
  displayName: string
  totalMl: number
  goalMl: number
  percent: number
  streak: number
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function generateShareCardBlob(data: ShareCardData): Promise<Blob> {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 1000
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas not supported')

  const bg = ctx.createLinearGradient(0, 0, 800, 1000)
  bg.addColorStop(0, '#0b4f73')
  bg.addColorStop(0.55, '#17b4e0')
  bg.addColorStop(1, '#86e0f5')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Ambient wave ribbon, echoing the home screen's signature WaveCircle motif
  ctx.save()
  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(0, 90)
  ctx.bezierCurveTo(180, 40, 380, 140, 560, 70)
  ctx.bezierCurveTo(680, 30, 760, 60, 800, 40)
  ctx.lineTo(800, 0)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = "600 34px Kanit, 'IBM Plex Sans Thai', sans-serif"
  ctx.fillText('💧 Drink Water', canvas.width / 2, 130)

  const cardX = 70
  const cardY = 190
  const cardW = 660
  const cardH = 660
  const cardR = 56
  ctx.save()
  ctx.shadowColor = 'rgba(11,79,115,0.35)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 18
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()

  // Progress ring echoing WaveCircle's goal-ring, filled to the day's percent
  const ringCx = canvas.width / 2
  const ringCy = cardY + 300
  const ringR = 220
  ctx.lineWidth = 26
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#eaf7fc'
  ctx.beginPath()
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2)
  ctx.stroke()

  const clampedPercent = Math.min(data.percent, 100)
  ctx.strokeStyle = '#17b4e0'
  ctx.beginPath()
  ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + (clampedPercent / 100) * Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#0b4f73'
  ctx.font = "700 128px Kanit, sans-serif"
  ctx.fillText(`${Math.round(data.percent)}%`, ringCx, ringCy + 45)

  ctx.font = "500 30px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = '#0f93bc'
  ctx.fillText(`${data.totalMl.toLocaleString()} / ${data.goalMl.toLocaleString()} ml วันนี้`, ringCx, ringCy + 100)

  if (data.streak > 0) {
    const chipW = 280
    const chipH = 56
    const chipX = ringCx - chipW / 2
    const chipY = ringCy + 140
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2)
    ctx.fillStyle = '#ffe4da'
    ctx.fill()
    ctx.fillStyle = '#d94a29'
    ctx.font = "600 28px Kanit, sans-serif"
    ctx.fillText(`🔥 ${data.streak} วันติดต่อกัน`, ringCx, chipY + 38)
  }

  ctx.font = "400 30px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = '#ffffff'
  ctx.fillText(data.displayName || 'Drink Water', canvas.width / 2, 930)

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
