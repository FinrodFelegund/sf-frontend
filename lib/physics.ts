import Hypher from "hypher"
import german from "hyphenation.de"

const hyphenator = new Hypher(german)

function tokenize(caption: string): string[] {
  const out: string[] = []
  caption.split(/\s+/).filter(Boolean).forEach((word, wi) => {
    const syllables: string[] = hyphenator.hyphenate(word)
    syllables.forEach((s, si) => out.push(si === 0 && wi > 0 ? " " + s : s))
  })
  return out
}

type P = {
    x: number,
    y: number,
}

export function smoothLinePoints(l: P, r: P, samples = 10): P[]{

    let left = { x: l.x, y: l.y }, right = { x: r.x, y: r.y }
    if (left.x < right.x) { const t = left; left = right; right = t }

    const ctrl = {
        x: left.x + (right.x - left.x) * 0.25,
        y: right.y + (left.y - right.y) * 0.25,   // note: y uses right as base
    }

    // legacy pushes [left, ctrl, right] then _.reverse()
    const p = [right, ctrl, left]
    // d3 v3 basis duplicates the endpoints twice each
    const c = [p[0], p[0], p[0], p[1], p[2], p[2], p[2]]

    const out: P[] = []
    for (let i = 0; i + 3 < c.length; i++) {
        for (let s = 0; s <= samples; s++) {
        const t = s / samples, t2 = t * t, t3 = t2 * t
        const b0 = (1 - t) ** 3 / 6
        const b1 = (3 * t3 - 6 * t2 + 4) / 6
        const b2 = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6
        const b3 = t3 / 6
        out.push({
            x: b0 * c[i].x + b1 * c[i+1].x + b2 * c[i+2].x + b3 * c[i+3].x,
            y: b0 * c[i].y + b1 * c[i+1].y + b2 * c[i+2].y + b3 * c[i+3].y,
        })
        }
    }
    return out
}

export function wrapInCircle(
  ctx: CanvasRenderingContext2D,
  caption: string,
  r: number,
  lineHeight = 14,
  padding = 3,
): string[] {
  if (!caption) return []
  if (ctx.measureText(caption).width <= (r - padding * 2) * 2) return [caption]

  const maxRows = Math.max(1, Math.floor(((r - padding) * 2) / lineHeight))

  // legacy: lineWidth = max(2*sqrt(r² - lineY²) - 12, 0)
  const chord = (i: number, rows: number) => {
    const y = (i - (rows - 1) / 2) * lineHeight
    if (Math.abs(y) >= r) return 0
    return Math.max(Math.sqrt(r * r - y * y) * 2 - 12, 0)
  }

  const fit = (text: string, w: number, suffix: string) => {
    let s = text
    while (s.length && ctx.measureText(s + suffix).width > w) s = s.slice(0, -1)
    return s
  }

  const tokens = tokenize(caption)

  for (let rows = 2; rows <= maxRows; rows++) {
    const queue = [...tokens]
    const out: string[] = []

    for (let i = 0; i < rows; i++) {
      const w = chord(i, rows)
      if (w <= 0 || !queue.length) { out.push(""); continue }

      let line = ""
      while (queue.length && ctx.measureText((line + queue[0]).trimStart()).width <= w) {
        line += queue.shift()!
      }

      if (!line) {
        // one syllable is wider than the chord -> legacy splitChars fallback
        const isLast = i === rows - 1
        const suffix = isLast ? "…" : "-"
        const rest = queue[0].trimStart()
        const head = fit(rest, w, suffix)
        if (!head) { out.push(""); continue }
        line = head + suffix
        const tail = rest.slice(head.length)
        if (tail) queue[0] = tail; else queue.shift()
      } else if (queue.length && !queue[0].startsWith(" ")) {
        // mid-word break -> hyphen, if it still fits
        const hyphened = line.trimStart() + "-"
        line = ctx.measureText(hyphened).width <= w ? hyphened : line.trimStart()
      }

      out.push(line.trimStart())
    }

    if (!queue.length) return out

    if (rows === maxRows) {
      // last line gets "…" instead of "-"
      let last = out.length - 1
      while (last > 0 && !out[last]) last--
      const w = chord(last, rows)
      out[last] = fit(out[last].replace(/-$/, ""), w, "…") + "…"
      return out.slice(0, last + 1)
    }
  }

  return [caption]
}

export function pathMetrics(pts: P[]) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return { cum, total: cum[cum.length - 1] }
}

function pointAt(pts: P[], cum: number[], d: number) {
  let i = 1
  while (i < cum.length - 1 && cum[i] < d) i++
  const t = (d - cum[i - 1]) / Math.max(cum[i] - cum[i - 1], 1e-6)
  return {
    x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
    y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
    a: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x),
  }
}

/** canvas equivalent of <textPath startOffset="50%"> with dy */
export function drawTextOnPath(
  ctx: CanvasRenderingContext2D,
  text: string,
  pts: P[],
  cum: number[],
  total: number,
  dy: number,
) {
  const width = ctx.measureText(text).width
  const mid = pointAt(pts, cum, total / 2)
  const flip = mid.a > Math.PI / 2 || mid.a < -Math.PI / 2

  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"

  let cursor = (total - width) / 2
  for (const ch of text) {
    const w = ctx.measureText(ch).width
    const d = cursor + w / 2
    const p = pointAt(pts, cum, flip ? total - d : d)
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.a + (flip ? Math.PI : 0))
    ctx.fillText(ch, 0, -dy)
    ctx.restore()
    cursor += w
  }
  ctx.restore()
}

export function collideForce(radiusOf: (n: any) => number, padding = 4, strength = 0.8) {
    let nodes: any[] = []
    const force = () => {
        for(let i = 0; i < nodes.length; i++){
            const a = nodes[i]
            const ra = radiusOf(a) + padding
            for(let j = i + 1; j < nodes.length; j++){
                const b = nodes[j]
                const min = ra + radiusOf(b) + padding
                let dx = b.x - a.x, dy = b.y - a.y
                const d2 = dx * dx + dy * dy
                if(d2 === 0){ b.x += 0.5; b.y += 0.5; continue }
                if(d2 >= min * min) continue

                const d = Math.sqrt(d2)
                const push = ((min - d) / d) * strength * 0.5
                dx *= push; dy *= push
                a.x -= dx; a.y -= dy
                b.x += dx; b.y += dy
            }
        }
    }
    force.initialize = (n: any[]) => { nodes = n }
    return force
}

/** Hard viewport clamp, centred on the origin. Replaces cola's separation constraints. */
export function boundsForce(getBounds: () => { w: number, h: number, pad: number }) {
    let nodes: any[] = []
    const force = () => {
        const { w, h, pad } = getBounds()
        for(const n of nodes){
            const r = (n.__r ?? 0) + pad
            const hw = Math.max(w / 2 - r, 0), hh = Math.max(h / 2 - r, 0)
            if(n.x < -hw){ n.x = -hw; n.vx = Math.max(0, n.vx) }
            if(n.x >  hw){ n.x =  hw; n.vx = Math.min(0, n.vx) }
            if(n.y < -hh){ n.y = -hh; n.vy = Math.max(0, n.vy) }
            if(n.y >  hh){ n.y =  hh; n.vy = Math.min(0, n.vy) }
        }
    }
    force.initialize = (n: any[]) => { nodes = n }
    return force
}

/** Inward pull so disconnected components don't wander. */
export function centerPullForce(strength = 0.08) {
    let nodes: any[] = []
    const force = (alpha: number) => {
        for(const n of nodes){
            n.vx -= n.x * strength * alpha
            n.vy -= n.y * strength * alpha
        }
    }
    force.initialize = (n: any[]) => { nodes = n }
    return force
}