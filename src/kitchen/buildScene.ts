import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

// The display on a wooden kitchen table, a soft window behind. Ported from
// moldable-kitchen-mockup/index.html. Units are centimetres.

const FACE = 14.55 // face of the 5.73 in display
const LIVE = 13.0 // live screen area
const SCREEN_PX = 640

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rep?: [number, number], linear?: boolean) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rep[0], rep[1])
  }
  if (linear) {
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearFilter
    t.generateMipmaps = false
  }
  return t
}

function rrShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Builds the scene into `canvas`, keeps `screen` fitted to the device glass every frame, and returns a cleanup. */
export function buildScene(canvas: HTMLCanvasElement, screen: HTMLElement, getPerspective: () => 'grandma' | 'grandkids' = () => 'grandkids') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#3a2a1f')
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTarget = pmrem.fromScene(new RoomEnvironment(renderer), 0.04)
  scene.environment = envTarget.texture

  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 3000)

  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

  // Table: wide planks, warm walnut with grain
  const tableTex = canvasTex(2048, 1024, (g, w, hh) => {
    const planks = 6
    const ph = hh / planks
    for (let p = 0; p < planks; p++) {
      const l = 30 + rnd() * 8
      g.fillStyle = `hsl(${24 + rnd() * 6} 42% ${l}%)`
      g.fillRect(0, p * ph, w, ph)
      for (let i = 0; i < 70; i++) {
        const y = p * ph + rnd() * ph
        g.strokeStyle = rnd() > 0.5 ? 'rgba(30,14,4,.18)' : 'rgba(255,220,180,.06)'
        g.lineWidth = 0.6 + rnd() * 2.2
        g.beginPath()
        g.moveTo(0, y)
        for (let x = 0; x <= w; x += 40) g.lineTo(x, y + Math.sin(x / (120 + i * 3) + p) * 5)
        g.stroke()
      }
      g.fillStyle = 'rgba(20,10,4,.55)'
      g.fillRect(0, p * ph, w, 2.5)
    }
  }, [1.2, 1.4])

  // The room behind, painted small then stretched so it reads as out of focus
  const roomTex = canvasTex(192, 96, (g, w, hh) => {
    const bg = g.createLinearGradient(0, 0, w, 0)
    bg.addColorStop(0, '#2c2119'); bg.addColorStop(0.45, '#4a3627'); bg.addColorStop(1, '#5d4532')
    g.fillStyle = bg; g.fillRect(0, 0, w, hh)
    g.fillStyle = 'rgba(190,160,120,.35)'; g.fillRect(34, 0, 22, hh * 0.7)
    g.fillStyle = 'rgba(240,215,170,.25)'; g.fillRect(40, 0, 6, hh * 0.65)
    g.fillStyle = 'rgba(20,16,14,.65)'; g.beginPath(); g.ellipse(14, 42, 9, 22, 0, 0, 7); g.fill()
    const wx = 120, wy = 18, ww = 68, wh = 52
    g.fillStyle = '#d9c9a4'; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const px = wx + c * (ww / 4) + 1.5, py = wy + r * (wh / 3) + 1.5, pw = ww / 4 - 3, ph = wh / 3 - 3
      const pg = g.createLinearGradient(px, py, px, py + ph)
      pg.addColorStop(0, '#f8f1dc'); pg.addColorStop(0.6, r === 2 ? '#b8c59a' : '#e9edd8'); pg.addColorStop(1, '#9fb07e')
      g.fillStyle = pg; g.fillRect(px, py, pw, ph)
    }
    const haze = g.createRadialGradient(150, 30, 2, 150, 30, 70)
    haze.addColorStop(0, 'rgba(255,236,200,.55)'); haze.addColorStop(1, 'rgba(255,236,200,0)')
    g.fillStyle = haze; g.fillRect(0, 0, w, hh)
    g.fillStyle = 'rgba(25,16,10,.55)'; g.fillRect(0, hh * 0.78, w, hh * 0.22)
  }, undefined, true)

  // Grandma's kitchen: teak, woven bamboo, hand-painted tile and morning light.
  const grandmaRoomTex = canvasTex(256, 128, (g, w, hh) => {
    const plaster = g.createLinearGradient(0, 0, w, hh)
    plaster.addColorStop(0, '#8c5b35'); plaster.addColorStop(0.5, '#bd8755'); plaster.addColorStop(1, '#704328')
    g.fillStyle = plaster; g.fillRect(0, 0, w, hh)
    g.fillStyle = '#cda66d'; g.fillRect(0, 0, 76, 88)
    g.strokeStyle = 'rgba(91,54,26,.22)'; g.lineWidth = 1
    for (let x = -90; x < 160; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 90, 90); g.stroke() }
    for (let x = 0; x < 250; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 90, 90); g.stroke() }
    g.fillStyle = '#4f2d1d'; g.fillRect(184, 6, 72, 83); g.fillRect(84, 18, 82, 7)
    g.fillStyle = '#2d1b14'; g.fillRect(88, 22, 74, 3)
    ;[[98, 13, '#b86d37'], [119, 12, '#d0a35d'], [143, 14, '#734732']].forEach(([x, r, color]) => {
      g.fillStyle = color as string; g.beginPath(); g.ellipse(x as number, 19, (r as number) * .45, (r as number) * .34, 0, Math.PI, 0); g.fill()
    })
    g.fillStyle = '#ded2ad'; g.fillRect(0, 88, w, 26)
    for (let x = 0; x < w; x += 16) {
      g.strokeStyle = '#765a4a'; g.strokeRect(x + 1, 89, 14, 14)
      g.fillStyle = x % 32 ? '#77907a' : '#a85f47'; g.beginPath(); g.arc(x + 8, 96, 3, 0, 7); g.fill()
    }
    g.fillStyle = 'rgba(35,18,10,.58)'; g.fillRect(0, 114, w, 14)
    const light = g.createRadialGradient(43, 25, 2, 43, 25, 95)
    light.addColorStop(0, 'rgba(255,236,183,.76)'); light.addColorStop(1, 'rgba(255,224,172,0)')
    g.fillStyle = light; g.fillRect(0, 0, w, hh)
  }, undefined, true)

  const meshTex = canvasTex(512, 256, (g, w, hh) => {
    g.fillStyle = '#b9b6b0'; g.fillRect(0, 0, w, hh)
    g.fillStyle = '#3c3a37'
    for (let y = 3; y < hh; y += 6) for (let x = (y / 6) % 2 ? 6 : 3; x < w; x += 6) { g.beginPath(); g.arc(x, y, 1.5, 0, 7); g.fill() }
  }, [5, 1.2])

  const blobTex = canvasTex(256, 256, (g, w, hh) => {
    const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2)
    gr.addColorStop(0, 'rgba(12,6,2,.7)'); gr.addColorStop(0.5, 'rgba(12,6,2,.25)'); gr.addColorStop(1, 'rgba(12,6,2,0)')
    g.fillStyle = gr; g.fillRect(0, 0, w, hh)
  })

  const contact = (x: number, z: number, sx: number, sz: number, op = 0.6) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: op, depthWrite: false }))
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.04, z)
    scene.add(m)
  }
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o)
  const shadowy = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; m.receiveShadow = true; return m }

  // Table and room
  const table = new THREE.Mesh(new THREE.BoxGeometry(320, 4, 180), new THREE.MeshPhysicalMaterial({ map: tableTex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 }))
  table.position.set(0, -2, -40)
  table.receiveShadow = true
  scene.add(table)
  const roomMaterial = new THREE.MeshBasicMaterial({ map: roomTex, toneMapped: false, transparent: true })
  const grandmaRoomMaterial = new THREE.MeshBasicMaterial({ map: grandmaRoomTex, toneMapped: false, transparent: true, opacity: 0 })
  const room = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), roomMaterial)
  const grandmaRoom = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), grandmaRoomMaterial)
  room.position.set(60, 120, -420)
  grandmaRoom.position.set(60, 120, -419)
  scene.add(room, grandmaRoom)

  // Things on the table
  const plateMat = std({ color: '#2b2c2e', roughness: 0.35 })
  const plate = (x: number, z: number, r: number) => {
    const p = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 1.4, 64), plateMat))
    p.position.set(x, 0.7, z)
    scene.add(p)
    contact(x, z, r * 2.6, r * 2.6, 0.5)
  }
  // Left: pandan rolls (dadar gulung) and pastries
  plate(-36, -34, 13)
  const crust = std({ color: '#c98a3c', roughness: 0.55 })
  const pandan = std({ color: '#6f9a3e', roughness: 0.6 })
  ;[[-40, -36, 0.4], [-34, -31, -0.3], [-31, -38, 1.2], [-39, -29, 0.9]].forEach(([x, z, ry], i) => {
    const m = shadowy(new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 5, 8, 16), i % 2 ? pandan : crust))
    m.rotation.set(0, ry, Math.PI / 2)
    m.position.set(x, 2.8, z)
    scene.add(m)
  })
  // Right: a slab of kue lapis and blueberries
  plate(37, -38, 12)
  const lapis = new THREE.Group()
  lapis.position.set(36, 1.4, -39)
  lapis.rotation.y = -0.35
  scene.add(lapis)
  for (let i = 0; i < 7; i++) {
    const layer = shadowy(new THREE.Mesh(new THREE.BoxGeometry(14, 0.9, 7), std({ color: i % 2 ? '#e0559f' : '#f4e3c8', roughness: 0.7 })))
    layer.position.y = 0.45 + i * 0.9
    lapis.add(layer)
  }
  const berry = std({ color: '#2d2f55', roughness: 0.4 })
  ;[[43, -33], [45, -37], [42, -30], [46, -34], [30, -31]].forEach(([x, z]) => {
    const b = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), berry))
    b.position.set(x, 2.3, z)
    scene.add(b)
  })

  // The display
  const device = new THREE.Group()
  scene.add(device)
  const metal = new THREE.MeshPhysicalMaterial({ color: '#cdbfa8', metalness: 0.9, roughness: 0.28, clearcoat: 0.5 })
  const base = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 3.8, 96), [
    new THREE.MeshPhysicalMaterial({ map: meshTex, metalness: 0.75, roughness: 0.42 }), metal, metal,
  ]))
  base.position.set(0, 1.9, -1.4)
  device.add(base)
  const lip = shadowy(new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.12, 12, 96), metal))
  lip.rotation.x = Math.PI / 2
  lip.position.set(0, 3.8, -1.4)
  device.add(lip)
  contact(0, -1.2, 22, 16, 0.65)

  const pivot = new THREE.Group()
  pivot.position.set(0, 4.3, 0.8)
  pivot.rotation.x = -0.06
  device.add(pivot)
  const depth = 0.8
  const rim = shadowy(new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(FACE - 0.3, FACE - 0.3, 2.2), { depth, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 5, curveSegments: 28 }), metal))
  rim.position.set(0, FACE / 2, -depth)
  pivot.add(rim)
  const face = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(FACE - 0.36, FACE - 0.36, 2.15), 28), new THREE.MeshPhysicalMaterial({ color: '#09090a', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05 }))
  face.position.set(0, FACE / 2, 0.16)
  pivot.add(face)
  const back = shadowy(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 2.6), std({ color: '#bdb3a2', roughness: 0.4, metalness: 0.6 })))
  back.position.set(0, 1.4, -1.8)
  pivot.add(back)

  // Screen corners in the device's own space. Each frame they are projected and
  // the HTML screen is fitted to them with a flat 2D matrix.
  const corners = [
    new THREE.Vector3(-LIVE / 2, FACE / 2 + LIVE / 2, 0.18),
    new THREE.Vector3(LIVE / 2, FACE / 2 + LIVE / 2, 0.18),
    new THREE.Vector3(-LIVE / 2, FACE / 2 - LIVE / 2, 0.18),
  ]
  const pr = new THREE.Vector3()
  const placeScreen = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const [tl, tr, bl] = corners.map((c) => {
      pr.copy(c)
      pivot.localToWorld(pr)
      pr.project(camera)
      return [((pr.x + 1) / 2) * vw, ((1 - pr.y) / 2) * vh]
    })
    screen.style.transform = `matrix(${(tr[0] - tl[0]) / SCREEN_PX},${(tr[1] - tl[1]) / SCREEN_PX},${(bl[0] - tl[0]) / SCREEN_PX},${(bl[1] - tl[1]) / SCREEN_PX},${tl[0]},${tl[1]})`
  }

  // Light: window behind and to the right, soft fill from the room
  scene.add(new THREE.HemisphereLight('#ffeedd', '#4a2e1c', 0.55))
  const sun = new THREE.DirectionalLight('#ffd7a6', 3.2)
  sun.position.set(140, 120, -160)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 50, far: 600 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.5
  sun.shadow.radius = 8
  scene.add(sun, sun.target)
  const key = new THREE.DirectionalLight('#fff1e2', 1.1)
  key.position.set(-80, 70, 120)
  scene.add(key)

  // Camera, depth of field, parallax
  const target = new THREE.Vector3(0, 9.4, 0)
  const camDist = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    return Math.max(FACE / (0.47 * 2 * tan), FACE / (0.7 * 2 * tan * camera.aspect))
  }
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bokeh = new BokehPass(scene, camera, { focus: 50, aperture: 0.0005, maxblur: 0.012 })
  composer.addPass(bokeh)
  composer.addPass(new OutputPass())

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  const onMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onMove)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  let raf = 0
  let last = performance.now()
  let grandmaMix = getPerspective() === 'grandma' ? 1 : 0
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const d = camDist()
    const amt = reduce ? 0 : 1
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 3)
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 3)
    const roomTarget = getPerspective() === 'grandma' ? 1 : 0
    grandmaMix += (roomTarget - grandmaMix) * Math.min(1, dt * (reduce ? 100 : 2.8))
    grandmaRoomMaterial.opacity = grandmaMix
    roomMaterial.opacity = 1 - grandmaMix
    camera.position.set(target.x + mouse.sx * 2.6 * amt, target.y + 4.5 - mouse.sy * 1.4 * amt, target.z + d)
    camera.lookAt(target)
    ;(bokeh.uniforms as Record<string, THREE.IUniform>).focus.value = camera.position.distanceTo(target) + 1
    composer.render()
    camera.updateMatrixWorld()
    placeScreen()
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', resize)
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => { m.map?.dispose(); m.dispose() })
      }
    })
    envTarget.dispose()
    pmrem.dispose()
    composer.dispose()
    renderer.dispose()
  }
}
