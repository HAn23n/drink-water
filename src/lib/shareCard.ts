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

  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas not supported')

  // Vibrant diagonal base — cyan → blue → indigo, still water-forward but punchy.
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#06b6d4')
  bg.addColorStop(0.5, '#3b82f6')
  bg.addColorStop(1, '#6366f1')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Soft colour blobs for depth (a pink glow top-right, cyan bottom-left).
  const blob = (cx: number, cy: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  blob(920, 180, 520, 'rgba(244,114,182,0.55)')
  blob(120, 1180, 560, 'rgba(34,211,238,0.5)')

  // Subtle grain for a less "flat gradient" feel.
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }

  ctx.textAlign = 'center'

  // Top badge pill. letterSpacing isn't in every TS DOM lib version, so access it loosely.
  const spacing = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  const badge = '💧 DRINK WATER'
  ctx.font = "600 30px Kanit, sans-serif"
  spacing.letterSpacing = '3px'
  const badgeW = ctx.measureText(badge).width + 72
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, W / 2 - badgeW / 2, 74, badgeW, 62, 31)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(badge, W / 2, 115)
  spacing.letterSpacing = '0px'

  // Name + subtitle
  ctx.fillStyle = '#ffffff'
  ctx.font = "700 60px Kanit, 'IBM Plex Sans Thai', sans-serif"
  ctx.fillText(data.displayName || 'Drink Water', W / 2, 232)
  ctx.font = "500 34px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.fillText('สรุปการดื่มน้ำวันนี้', W / 2, 286)

  // Hero percentage
  ctx.save()
  ctx.shadowColor = 'rgba(3,20,60,0.35)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 14
  ctx.fillStyle = '#ffffff'
  ctx.font = "800 320px Kanit, sans-serif"
  ctx.fillText(`${Math.round(data.percent)}%`, W / 2, 620)
  ctx.restore()

  ctx.font = "500 36px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText('ของเป้าหมายวันนี้', W / 2, 700)

  // Chunky progress pill with a droplet knob at the fill point
  const barX = 100
  const barY = 772
  const barW = W - 200
  const barH = 44
  const barR = 22
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  roundRect(ctx, barX, barY, barW, barH, barR)
  ctx.fill()
  const frac = Math.max(0.04, Math.min(data.percent, 100) / 100)
  const fillW = barW * frac
  const fg = ctx.createLinearGradient(barX, 0, barX + barW, 0)
  fg.addColorStop(0, '#ffffff')
  fg.addColorStop(1, '#bff3ff')
  ctx.fillStyle = fg
  roundRect(ctx, barX, barY, fillW, barH, barR)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(barX + fillW, barY + barH / 2, 34, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(3,20,60,0.3)'
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.restore()
  ctx.font = "600 30px Kanit, sans-serif"
  ctx.fillStyle = '#3b82f6'
  ctx.fillText('💧', barX + fillW, barY + barH / 2 + 10)

  // Two glass stat cards
  const cardY = 880
  const cardH = 210
  const gap = 30
  const cardW = (W - 200 - gap) / 2
  const statCard = (x: number, big: string, small: string) => {
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    roundRect(ctx, x, cardY, cardW, cardH, 40)
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    roundRect(ctx, x, cardY, cardW, cardH, 40)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = "800 76px Kanit, sans-serif"
    ctx.fillText(big, x + cardW / 2, cardY + 108)
    ctx.font = "500 32px 'IBM Plex Sans Thai', sans-serif"
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText(small, x + cardW / 2, cardY + 162)
  }
  statCard(100, data.totalMl.toLocaleString(), 'ml วันนี้')
  if (data.streak > 0) {
    statCard(100 + cardW + gap, `🔥 ${data.streak}`, 'วันติดต่อกัน')
  } else {
    statCard(100 + cardW + gap, data.goalMl.toLocaleString(), 'เป้าหมาย ml')
  }

  // Watermark
  ctx.font = "500 30px 'IBM Plex Sans Thai', sans-serif"
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('ดื่มน้ำให้ครบ แล้วมาแชร์กัน 💦', W / 2, 1290)

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
