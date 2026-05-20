"use client"

import { useEffect, useRef } from "react"

interface Props {
  /** When true, renders dark violet/indigo particles on a light background */
  light?: boolean
}

export default function InteractiveBackground({ light = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf: number
    let width  = (canvas.width  = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const mouse = { x: -2000, y: -2000, radius: 140 }

    /* ── Colour palette ─────────────────────────────────────── */
    const palette = light
      ? [
          "rgba(124, 58, 237, 0.28)",   // violet-600
          "rgba(99, 102, 241, 0.22)",   // indigo-500
          "rgba(5, 150, 105, 0.22)",    // emerald-600
        ]
      : [
          "rgba(255, 255, 255, 0.40)",
          "rgba(167, 139, 250, 0.45)",  // violet-400
          "rgba(52,  211, 153, 0.45)",  // emerald-400
        ]

    const lineColor = light
      ? "rgba(124, 58, 237,"   // violet prefix
      : "rgba(139, 92,  246,"  // violet prefix (dark bg)

    /* ── Particle ───────────────────────────────────────────── */
    class Particle {
      x:      number
      y:      number
      vx:     number
      vy:     number
      radius: number
      color:  string

      constructor() {
        this.x      = Math.random() * width
        this.y      = Math.random() * height
        this.vx     = (Math.random() - 0.5) * 0.35
        this.vy     = (Math.random() - 0.5) * 0.35
        this.radius = Math.random() * 2.2 + 0.8
        this.color  = palette[Math.floor(Math.random() * palette.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        // Wrap edges
        if (this.x < 0)      this.x = width
        if (this.x > width)  this.x = 0
        if (this.y < 0)      this.y = height
        if (this.y > height) this.y = 0

        // Repel from cursor
        const dx   = mouse.x - this.x
        const dy   = mouse.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius
          this.x -= (dx / dist) * force * 1.2
          this.y -= (dy / dist) * force * 1.2
        }
      }

      draw() {
        ctx!.beginPath()
        ctx!.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx!.fillStyle = this.color
        ctx!.fill()
      }
    }

    const count     = Math.min(75, Math.floor((width * height) / 18000))
    const particles = Array.from({ length: count }, () => new Particle())
    const connDist  = 115

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach(p => { p.update(); p.draw() })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1   = particles[i]
          const p2   = particles[j]
          const dx   = p1.x - p2.x
          const dy   = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connDist) {
            const alpha = (1 - dist / connDist) * (light ? 0.18 : 0.12)
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `${lineColor}${alpha})`
            ctx.lineWidth   = 0.7
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(animate)
    }

    const onMove  = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onLeave = ()               => { mouse.x = -2000;     mouse.y = -2000 }
    const onResize = () => {
      width  = canvas.width  = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener("mousemove",  onMove)
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("resize",     onResize)
    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove",  onMove)
      window.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("resize",     onResize)
    }
  }, [light])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
    />
  )
}
