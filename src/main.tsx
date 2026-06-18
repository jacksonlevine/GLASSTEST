import {
  StrictMode,
  createContext,
  forwardRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { displacementMaps } from './generated/displacementMaps';
import { ShapeKey, shapes } from './shapes';

type GlassTint = {
  color: string;
  strength?: number;
};

type ShaderSettings = {
  sourceBrightness: number;
  sourceContrast: number;
  finalBrightness: number;
  finalContrast: number;
  transmissionStrength: number;
  thicknessTintAmount: number;
};

const defaultGlassTint: GlassTint = { color: '#ffffff', strength: 0 };
const defaultShaderSettings: ShaderSettings = {
  sourceBrightness: 0.61,
  sourceContrast: 1.44,
  finalBrightness: 1.54,
  finalContrast: 1.06,
  transmissionStrength: 1.56,
  thicknessTintAmount: 0.38,
};

const demoGlassTints = {
  clear: { color: '#ffffff', strength: 0 },
  amberDark: { color: '#ff7608', strength: 0.95 },
  amber: { color: '#ff9b18', strength: 0.84 },
  red: { color: '#ff1a12', strength: 0.9 },
  blue: { color: '#1467ff', strength: 0.88 },
  blueDark: { color: '#0828ff', strength: 0.94 },
} satisfies Record<string, GlassTint>;

function App() {
  const [stageSize, setStageSize] = useState({ width: 1200, height: 760 });
  const [dragPosition, setDragPosition] = useState({ x: 44, y: 46 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragSectionRef = useRef<HTMLElement | null>(null);
  const dragCardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const displacement = 1;
  const tints = demoGlassTints;
  const textureSize = useMemo(
    () => ({
      width: Math.min(2048, Math.max(1024, Math.ceil(stageSize.width / 256) * 256)),
      height: 2048,
    }),
    [stageSize.width],
  );
  const backdropUrl = useMemo(
    () => makeBackgroundPngDataUrl(textureSize.width, textureSize.height),
    [textureSize.width, textureSize.height],
  );

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const syncSize = () => {
      const stageBounds = stage.getBoundingClientRect();
      setStageSize({ width: stageBounds.width, height: stageBounds.height });
    };

    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, []);

  const clampDragPosition = useCallback((x: number, y: number) => {
    const section = dragSectionRef.current;
    const card = dragCardRef.current;
    if (!section || !card) return { x, y };

    const sectionWidth = section.clientWidth;
    const sectionHeight = section.clientHeight;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const inset = 16;
    const maxX = Math.max(inset, sectionWidth - cardWidth - inset);
    const maxY = Math.max(inset, sectionHeight - cardHeight - inset);

    return {
      x: Math.min(Math.max(inset, x), maxX),
      y: Math.min(Math.max(inset, y), maxY),
    };
  }, []);

  useLayoutEffect(() => {
    const section = dragSectionRef.current;
    const card = dragCardRef.current;
    if (!section || !card) return;

    const syncDragBounds = () => {
      setDragPosition((position) => clampDragPosition(position.x, position.y));
    };

    syncDragBounds();
    const resizeObserver = new ResizeObserver(syncDragBounds);
    resizeObserver.observe(section);
    resizeObserver.observe(card);
    return () => resizeObserver.disconnect();
  }, [clampDragPosition]);

  const handleDragPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Browser-owned pointer capture is not available for synthetic checks.
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dragPosition.x,
      originY: dragPosition.y,
    };
  };

  const handleDragPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setDragPosition(
      clampDragPosition(
        dragState.originX + event.clientX - dragState.startX,
        dragState.originY + event.clientY - dragState.startY,
      ),
    );
  };

  const handleDragPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      <main className="app-shell">
        <GlassScene
          ref={stageRef}
          backdropUrl={backdropUrl}
          textureSize={textureSize}
          settings={defaultShaderSettings}
        >
          <div className="home-page">
            <header className="home-nav">
              <div className="brand-mark">GL</div>
              <nav>
                <a href="#scene">React</a>
                <a href="#shader">WebGL</a>
                <a href="#baker">Rust</a>
              </nav>
              <Glass className="nav-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                TypeScript
              </Glass>
            </header>

            <section className="homepage-grid">
              <div className="hero-copy">
                <span className="eyebrow">This page is legally required to mention its stack</span>
                <h1>Vite React WebGL Rust map situation.</h1>
                <p>
                  Please enjoy this normal webpage that cannot stop explaining it is React DOM
                  registered into one WebGL compositor using Rust-baked displacement PNGs.
                </p>
                <div className="hero-actions">
                  <button>npm run dev</button>
                  <button>cargo run</button>
                </div>
              </div>

              <Glass className="hero-panel" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <div className="card-title-row">
                  <span>Wavy sheet</span>
                  <span>React node</span>
                </div>
                <h2>I am a div with a GPU alibi.</h2>
                <p>CSS placed me here. WebGL arrived later with a clipboard and measured my rect.</p>
              </Glass>

              <article className="plain-card">
                <span>01</span>
                <h3>Vite did this</h3>
                <p>The dev server is very proud of transforming this TypeScript into browser feelings.</p>
              </article>

              <Glass className="metric-glass" shape="wavy-sheet" displacement={displacement} tint={tints.red}>
                <span>02</span>
                <h3>ResizeObserver fan club</h3>
                <p>Every layout change files a report. WebGL accepts the report and draws a rectangle.</p>
              </Glass>

              <article className="plain-card dark-card">
                <span>03</span>
                <h3>Important limitation</h3>
                <p>WebGL cannot lick the DOM pixels. We feed it a texture like responsible adults.</p>
              </article>

              <Glass className="wide-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>04</span>
                <h3>Fragment shader with opinions</h3>
                <p>It samples the backdrop three times and insists the red channel go slightly elsewhere.</p>
              </Glass>

              <Glass className="tall-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amber}>
                <span>05</span>
                <h3>PNG does vector math</h3>
                <p>Red means shove X. Green means shove Y. Blue was not invited to the meeting.</p>
              </Glass>

              <article className="plain-card coral-card">
                <span>06</span>
                <h3>Just CSS</h3>
                <p>This card is not glass. It is here so the WebGL cards can feel special.</p>
              </article>
            </section>

            <section className="color-band band-teal" id="scene">
              <div>
                <span className="eyebrow">Architecture announcement department</span>
                <h2>One canvas has been appointed manager.</h2>
              </div>
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <span>API</span>
                <h3>{'<Glass>'} signs the guestbook.</h3>
                <p>It hands over an element ref, a shape name, and a displacement number. Very formal.</p>
              </Glass>
            </section>

            <section className="story-grid" id="shader">
              <article className="plain-card yellow-card">
                <span>07</span>
                <h3>Canvas sandwich</h3>
                <p>Backdrop below, WebGL in the middle, DOM text on top. A very technical lunch.</p>
              </article>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement}>
                <span>08</span>
                <h3>Quad parade</h3>
                <p>Each glass element becomes two triangles, because apparently rectangles need lore.</p>
              </Glass>
              <article className="plain-card blue-card">
                <span>09</span>
                <h3>RAF custody agreement</h3>
                <p>The visible image and shader scroll share one animation timestamp to avoid lying.</p>
              </article>
              <Glass className="story-glass large-story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>10</span>
                <h3>Readable, allegedly</h3>
                <p>The shader lifts crushed shadows because text has filed several complaints.</p>
              </Glass>
            </section>

            <section className="color-band band-red">
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blueDark}>
                <span>Shader stack</span>
                <h3>Displace, RGB split, apologize.</h3>
                <p>No blur. No SVG filter. No specular. Just texture samples doing customer service.</p>
              </Glass>
              <div>
                <span className="eyebrow">Optical model, sort of</span>
                <h2>The edges are where the glass does its taxes.</h2>
              </div>
            </section>

            <section className="story-grid" id="baker">
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.red}>
                <span>11</span>
                <h3>Rust baker</h3>
                <p>A tiny Rust program bakes lens maps, because JavaScript had already done enough.</p>
              </Glass>
              <article className="plain-card">
                <span>12</span>
                <h3>Generated TypeScript</h3>
                <p>The PNGs become data URLs, then pretend this was a normal frontend decision.</p>
              </article>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <span>13</span>
                <h3>Shape swap</h3>
                <p>Same div, different displacement map. The layout remains blissfully uninformed.</p>
              </Glass>
              <article className="plain-card dark-card">
                <span>14</span>
                <h3>Known betrayal</h3>
                <p>WebGL will not sample arbitrary DOM behind the card. The browser said absolutely not.</p>
              </article>
            </section>

            <section className="color-band band-teal">
              <div>
                <span className="eyebrow">NPM package prophecy</span>
                <h2>The API wants a scene and many needy children.</h2>
              </div>
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>Usage</span>
                <h3>{'<GlassScene><Glass /></GlassScene>'}</h3>
                <p>The parent owns the GPU situation. The children bring rectangles and confidence.</p>
              </Glass>
            </section>

            <section className="story-grid">
              <article className="plain-card coral-card">
                <span>15</span>
                <h3>Performance model</h3>
                <p>One GL context. One backdrop texture. Many quads. Fewer reasons for phones to panic.</p>
              </article>
              <Glass className="story-glass large-story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <span>16</span>
                <h3>Mobile target</h3>
                <p>The shader does extra samples, but it avoids the animated SVG filter incident.</p>
              </Glass>
              <article className="plain-card yellow-card">
                <span>17</span>
                <h3>Layout proof</h3>
                <p>CSS Grid does the layout. The renderer follows behind like an intern with a ruler.</p>
              </article>
            </section>

            <section className="color-band band-red">
              <div>
                <span className="eyebrow">Uniform update disclosure</span>
                <h2>The shader receives rectangles and refuses to be mysterious.</h2>
              </div>
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amber}>
                <span>18</span>
                <h3>u_rect is the main character.</h3>
                <p>Every glass element becomes x, y, width, height, and a quiet GPU obligation.</p>
              </Glass>
            </section>

            <section className="story-grid">
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>19</span>
                <h3>Texture unit zero</h3>
                <p>The backdrop lives there, answering every fragment shader question with a color.</p>
              </Glass>
              <article className="plain-card blue-card">
                <span>20</span>
                <h3>Texture unit one</h3>
                <p>The displacement map sits next door and suggests bad ideas for UV coordinates.</p>
              </article>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blueDark}>
                <span>21</span>
                <h3>Three samples</h3>
                <p>Red, green, and blue each get a slightly different sample because glass is dramatic.</p>
              </Glass>
              <article className="plain-card yellow-card">
                <span>22</span>
                <h3>No backdrop-filter</h3>
                <p>The browser backdrop pipeline was thanked for its service and escorted out.</p>
              </article>
            </section>

            <section className="color-band band-teal">
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.red}>
                <span>23</span>
                <h3>The center calms down.</h3>
                <p>Most of the heavy refraction is pushed toward edges so it reads more like glass.</p>
              </Glass>
              <div>
                <span className="eyebrow">Material committee minutes</span>
                <h2>The edge bend caucus has approved the current shader.</h2>
              </div>
            </section>

            <section className="story-grid">
              <article className="plain-card dark-card">
                <span>24</span>
                <h3>React ref ceremony</h3>
                <p>The forwarded ref is assigned, then the scene receives the element like paperwork.</p>
              </article>
              <Glass className="story-glass large-story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>25</span>
                <h3>Map stretch default</h3>
                <p>The displacement PNG stretches to the element bounds, because that is the least annoying API.</p>
              </Glass>
              <article className="plain-card coral-card">
                <span>26</span>
                <h3>TypeScript witness</h3>
                <p>The prop types watched all of this happen and wrote down shape names.</p>
              </article>
            </section>

            <section className="color-band band-red">
              <div>
                <span className="eyebrow">Generated asset sermon</span>
                <h2>The PNGs are baked, embedded, uploaded, and overexplained.</h2>
              </div>
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <span>27</span>
                <h3>Rust did not ask for fame.</h3>
                <p>It just produced red-green displacement fields and returned to the command line.</p>
              </Glass>
            </section>

            <section className="story-grid">
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amber}>
                <span>28</span>
                <h3>ObjectBoundingBox who?</h3>
                <p>SVG filter coordinate sadness is gone. This renderer speaks pixels now.</p>
              </Glass>
              <article className="plain-card">
                <span>29</span>
                <h3>Device pixel ratio</h3>
                <p>The canvas backs itself at DPR, capped so mobile hardware does not send a letter.</p>
              </article>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>30</span>
                <h3>RAF loop</h3>
                <p>One loop scrolls the visible backdrop and the shader sample window together.</p>
              </Glass>
              <article className="plain-card blue-card">
                <span>31</span>
                <h3>Still real DOM</h3>
                <p>The joke is long, but the buttons, text, layout, and scrolling are still normal HTML.</p>
              </article>
            </section>

            <section className="color-band band-teal">
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blueDark}>
                <span>32</span>
                <h3>Compositor monologue continues.</h3>
                <p>The page is now mostly a dramatic reading of its own render pipeline.</p>
              </Glass>
              <div>
                <span className="eyebrow">Final technical overshare</span>
                <h2>There are still more rectangles to register.</h2>
              </div>
            </section>

            <section className="story-grid">
              <article className="plain-card dark-card">
                <span>33</span>
                <h3>Long layout audit</h3>
                <p>The point of this section is proving the compositor survives a page that refuses to end.</p>
              </article>
              <Glass className="story-glass large-story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.red}>
                <span>34</span>
                <h3>Opaque refracted output</h3>
                <p>This glass no longer blends with regular backdrop pixels. It outputs the processed sample.</p>
              </Glass>
              <article className="plain-card yellow-card">
                <span>35</span>
                <h3>CSS does placement</h3>
                <p>Grid areas change; WebGL only receives new measured rectangles.</p>
              </article>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.clear}>
                <span>36</span>
                <h3>One draw call</h3>
                <p>This card is another quad in the same shared renderer.</p>
              </Glass>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <span>37</span>
                <h3>Organic map</h3>
                <p>Same shader, different displacement texture, same overexplained stack joke.</p>
              </Glass>
            </section>

            <section className="color-band band-red">
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>38</span>
                <h3>Alpha is not the trick.</h3>
                <p>The glass patch is opaque in the compositor; only the sampled image is distorted.</p>
              </Glass>
              <div>
                <span className="eyebrow">Material correction notice</span>
                <h2>Partial regular backdrop mixing has been removed.</h2>
              </div>
            </section>

            <section className="drag-lab" ref={dragSectionRef}>
              <Glass
                ref={dragCardRef}
                className="drag-glass"
                shape="wavy-sheet"
                displacement={displacement}
                tint={tints.blue}
                position={dragPosition}
                onPointerDown={handleDragPointerDown}
                onPointerMove={handleDragPointerMove}
                onPointerUp={handleDragPointerUp}
                onPointerCancel={handleDragPointerUp}
              >
                <span>Drag demo</span>
                <h3>Drag me</h3>
                <p>Same wavy map. Same scene. Different position.</p>
              </Glass>
            </section>

            <section className="story-grid">
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.red}>
                <span>39</span>
                <h3>Fragment stage</h3>
                <p>The pixel either belongs to a registered glass quad or it does not. No halfway panel.</p>
              </Glass>
              <article className="plain-card coral-card">
                <span>40</span>
                <h3>React keeps talking</h3>
                <p>The component API remains mundane while the shader does all the theater.</p>
              </article>
              <Glass className="story-glass large-story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>41</span>
                <h3>Texture repeat fix</h3>
                <p>The backdrop is now a capped tile, because giant page-height textures anger GPUs.</p>
              </Glass>
              <article className="plain-card blue-card">
                <span>42</span>
                <h3>MAX_TEXTURE_SIZE</h3>
                <p>The page became long enough to teach us hardware limits, which is rude but useful.</p>
              </article>
            </section>

            <section className="color-band band-teal">
              <div>
                <span className="eyebrow">Still going</span>
                <h2>The stack joke has acquired pagination energy.</h2>
              </div>
              <Glass className="band-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amber}>
                <span>43</span>
                <h3>Canvas stays one.</h3>
                <p>The page gets longer, but the compositor does not multiply into per-card canvases.</p>
              </Glass>
            </section>

            <section className="story-grid">
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blueDark}>
                <span>44</span>
                <h3>Uniforms again</h3>
                <p>Scene size, texture size, scroll vector, rect, strength. The shader gets the paperwork.</p>
              </Glass>
              <article className="plain-card">
                <span>45</span>
                <h3>DOM remains eligible</h3>
                <p>Text selection, links, and layout do not become WebGL sprites.</p>
              </article>
              <Glass className="story-glass large-story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.blue}>
                <span>46</span>
                <h3>Data URL displacement</h3>
                <p>The generated maps are embedded so the demo can upload textures without a fetch parade.</p>
              </Glass>
              <article className="plain-card dark-card">
                <span>47</span>
                <h3>Browser boundary</h3>
                <p>The browser will not hand arbitrary page pixels to WebGL, so the scene owns the backdrop.</p>
              </article>
              <Glass className="story-glass" shape="wavy-sheet" displacement={displacement} tint={tints.red}>
                <span>48</span>
                <h3>Endless cards</h3>
                <p>Another glass rectangle registers itself, because apparently we are still doing this.</p>
              </Glass>
            </section>

            <section className="closing-grid">
              <article className="plain-card dark-card">
                <span>49</span>
                <h3>Current stack</h3>
                <p>Vite, React, TypeScript, WebGL, Rust, PNGs, and a surprising amount of rectangles.</p>
              </article>
              <Glass className="closing-glass" shape="wavy-sheet" displacement={displacement} tint={tints.amberDark}>
                <span>50</span>
                <h3>Final glass panel</h3>
                <p>This panel would also like to mention it is registered into the shared compositor.</p>
              </Glass>
            </section>
          </div>
        </GlassScene>
      </main>
    </>
  );
}

function makeBackgroundPngDataUrl(width: number, height: number) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const canvas = document.createElement('canvas');
  canvas.width = safeWidth;
  canvas.height = safeHeight;
  const context = canvas.getContext('2d');
  if (!context) return '';

  const stripeWidth = safeWidth / 5.8;
  const colors = ['#de6657', '#ecc75c', '#58afa9', '#efe4d2', '#4f69b3', '#202734'];

  const baseGradient = context.createLinearGradient(0, 0, safeWidth, safeHeight);
  baseGradient.addColorStop(0, '#f4ead9');
  baseGradient.addColorStop(0.42, '#efe3d0');
  baseGradient.addColorStop(1, '#e0d8c8');
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, safeWidth, safeHeight);

  for (let index = 0; index < 10; index += 1) {
    context.beginPath();
    context.moveTo(index * stripeWidth - stripeWidth * 1.4, 0);
    context.lineTo(index * stripeWidth + stripeWidth * 0.8, 0);
    context.lineTo(index * stripeWidth - stripeWidth * 0.15, safeHeight);
    context.lineTo(index * stripeWidth - stripeWidth * 2.35, safeHeight);
    context.closePath();
    context.fillStyle = colors[(index + 2) % colors.length];
    context.fill();
  }

  context.save();
  context.globalAlpha = 0.24;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1;
  for (let x = -160; x <= safeWidth + 160; x += 82) {
    context.beginPath();
    context.moveTo(x, -40);
    context.lineTo(x + safeHeight * 0.18, safeHeight + 40);
    context.stroke();
  }
  for (let y = -120; y <= safeHeight + 120; y += 82) {
    context.beginPath();
    context.moveTo(-60, y);
    context.lineTo(safeWidth + 60, y - safeWidth * 0.08);
    context.stroke();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.22;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1.2;
  for (let row = 0; row < Math.ceil(safeHeight / 150) + 2; row += 1) {
    for (let column = 0; column < Math.ceil(safeWidth / 210) + 2; column += 1) {
      const x = -80 + column * 210 + (row % 2) * 38;
      const y = -80 + row * 150;
      context.strokeRect(x, y, 136, 76);
      context.beginPath();
      context.moveTo(x + 14, y + 56);
      context.bezierCurveTo(x + 48, y + 12, x + 88, y + 88, x + 124, y + 28);
      context.stroke();
    }
  }
  context.restore();

  context.save();
  context.fillStyle = 'rgba(21,25,29,.56)';
  context.font = '800 11px Inter, Arial, sans-serif';
  const labels = ['SURFACE', 'FIELD', 'VECTOR', 'LENS', 'MATERIAL'];
  for (let row = 0; row < Math.ceil(safeHeight / 260) + 2; row += 1) {
    for (let column = 0; column < Math.ceil(safeWidth / 360) + 2; column += 1) {
      context.fillText(labels[(row + column) % labels.length], 36 + column * 360, 92 + row * 260);
    }
  }
  context.restore();

  return canvas.toDataURL('image/png');
}

type GlassProps = {
  shape?: ShapeKey;
  mode?: 'stretch';
  displacement?: number;
  tint?: GlassTint;
  position?: { x: number; y: number };
  className?: string;
  style?: CSSProperties;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  children?: ReactNode;
};

type GlassEntry = {
  id: string;
  element: HTMLDivElement;
  shape: ShapeKey;
  displacement: number;
  tint: ResolvedGlassTint;
};

type ResolvedGlassTint = {
  color: [number, number, number];
  strength: number;
};

type GlassSceneContextValue = {
  registerGlass: (entry: GlassEntry) => () => void;
  updateGlass: (id: string, patch: Partial<Omit<GlassEntry, 'id' | 'element'>>) => void;
};

const GlassSceneContext = createContext<GlassSceneContextValue | null>(null);
let nextGlassId = 0;

type GlassSceneProps = {
  backdropUrl: string;
  textureSize: { width: number; height: number };
  settings: ShaderSettings;
  children?: ReactNode;
};

export const GlassScene = forwardRef<HTMLDivElement, GlassSceneProps>(function GlassScene(
  { backdropUrl, textureSize, settings, children },
  forwardedRef,
) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const glassesRef = useRef(new Map<string, GlassEntry>());
  const paramsRef = useRef({ textureSize, settings });
  paramsRef.current = { textureSize, settings };

  useImperativeHandle(forwardedRef, () => sceneRef.current as HTMLDivElement, []);

  const registerGlass = useCallback((entry: GlassEntry) => {
    glassesRef.current.set(entry.id, entry);
    return () => {
      glassesRef.current.delete(entry.id);
    };
  }, []);

  const updateGlass = useCallback(
    (id: string, patch: Partial<Omit<GlassEntry, 'id' | 'element'>>) => {
      const entry = glassesRef.current.get(id);
      if (!entry) return;
      glassesRef.current.set(id, { ...entry, ...patch });
    },
    [],
  );

  const contextValue = useMemo(() => ({ registerGlass, updateGlass }), [registerGlass, updateGlass]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
    });
    if (!gl) return undefined;

    let disposed = false;
    let animationFrame = 0;
    let program: WebGLProgram | null = null;
    let backdropTexture: WebGLTexture | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    const displacementTextures = new Map<ShapeKey, WebGLTexture>();

    const setup = async () => {
      const [backdropImage, ...displacementImages] = await Promise.all([
        loadImage(backdropUrl),
        ...Object.values(shapes).map((shape) => loadImage(displacementMaps[shape.key])),
      ]);
      if (disposed) return;

      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, sceneVertexSource);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, sceneFragmentSource);
      program = linkProgram(gl, vertexShader, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
        gl.STATIC_DRAW,
      );

      backdropTexture = createTexture(gl, backdropImage);
      Object.values(shapes).forEach((shape, index) => {
        displacementTextures.set(shape.key, createTexture(gl, displacementImages[index]));
      });

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      const uniforms = {
        backdrop: gl.getUniformLocation(program, 'u_backdrop'),
        displacementMap: gl.getUniformLocation(program, 'u_displacementMap'),
        viewportSize: gl.getUniformLocation(program, 'u_viewportSize'),
        textureSize: gl.getUniformLocation(program, 'u_textureSize'),
        drawRect: gl.getUniformLocation(program, 'u_drawRect'),
        sampleRect: gl.getUniformLocation(program, 'u_sampleRect'),
        radius: gl.getUniformLocation(program, 'u_radius'),
        scroll: gl.getUniformLocation(program, 'u_scroll'),
        strengthPx: gl.getUniformLocation(program, 'u_strengthPx'),
        tintColor: gl.getUniformLocation(program, 'u_tintColor'),
        tintStrength: gl.getUniformLocation(program, 'u_tintStrength'),
        sourceBrightness: gl.getUniformLocation(program, 'u_sourceBrightness'),
        sourceContrast: gl.getUniformLocation(program, 'u_sourceContrast'),
        finalBrightness: gl.getUniformLocation(program, 'u_finalBrightness'),
        finalContrast: gl.getUniformLocation(program, 'u_finalContrast'),
        transmissionStrength: gl.getUniformLocation(program, 'u_transmissionStrength'),
        thicknessTintAmount: gl.getUniformLocation(program, 'u_thicknessTintAmount'),
      };

      const render = (time: number) => {
        if (disposed || !program || !backdropTexture || !positionBuffer) return;

        const visualViewport = window.visualViewport;
        const viewportOffsetLeft = visualViewport?.offsetLeft ?? 0;
        const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewportWidth = visualViewport?.width ?? window.innerWidth;
        const viewportHeight = visualViewport?.height ?? window.innerHeight;
        const viewportPageLeft = visualViewport?.pageLeft ?? window.scrollX;
        const viewportPageTop = visualViewport?.pageTop ?? window.scrollY;

        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;

        const sceneRect = scene.getBoundingClientRect();
        const sceneDocumentX = sceneRect.left + window.scrollX;
        const sceneDocumentY = sceneRect.top + window.scrollY;
        const canvasX = viewportPageLeft - sceneDocumentX + viewportOffsetLeft;
        const canvasY = viewportPageTop - sceneDocumentY + viewportOffsetTop;
        canvas.style.transform = `translate3d(${canvasX}px, ${canvasY}px, 0)`;
        const width = Math.max(1, Math.round(viewportWidth * dpr));
        const height = Math.max(1, Math.round(viewportHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const phase = (time % 36000) / 18000;
        const scrollAmount = phase <= 1 ? phase : 2 - phase;
        const scrollX = -620 * scrollAmount;
        const scrollY = -410 * scrollAmount;
        const params = paramsRef.current;
        const currentSettings = params.settings;
        if (backdropRef.current) {
          backdropRef.current.style.backgroundPosition = `${scrollX}px ${scrollY}px`;
        }

        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
        gl.uniform1i(uniforms.backdrop, 0);
        gl.uniform2f(uniforms.viewportSize, viewportWidth, viewportHeight);
        gl.uniform2f(uniforms.textureSize, params.textureSize.width, params.textureSize.height);
        gl.uniform2f(uniforms.scroll, scrollX, scrollY);
        gl.uniform1f(uniforms.sourceBrightness, currentSettings.sourceBrightness);
        gl.uniform1f(uniforms.sourceContrast, currentSettings.sourceContrast);
        gl.uniform1f(uniforms.finalBrightness, currentSettings.finalBrightness);
        gl.uniform1f(uniforms.finalContrast, currentSettings.finalContrast);
        gl.uniform1f(uniforms.transmissionStrength, currentSettings.transmissionStrength);
        gl.uniform1f(uniforms.thicknessTintAmount, currentSettings.thicknessTintAmount);

        for (const glass of glassesRef.current.values()) {
          const displacementTexture = displacementTextures.get(glass.shape);
          if (!displacementTexture) continue;

          const glassRect = glass.element.getBoundingClientRect();
          const glassDocumentX = glassRect.left + window.scrollX;
          const glassDocumentY = glassRect.top + window.scrollY;
          const drawX = glassDocumentX - viewportPageLeft;
          const drawY = glassDocumentY - viewportPageTop;
          const sampleX = glassDocumentX - sceneDocumentX;
          const sampleY = glassDocumentY - sceneDocumentY;
          if (
            drawX > viewportWidth ||
            drawY > viewportHeight ||
            drawX + glassRect.width < 0 ||
            drawY + glassRect.height < 0
          ) {
            continue;
          }

          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, displacementTexture);
          gl.uniform1i(uniforms.displacementMap, 1);
          gl.uniform4f(uniforms.drawRect, drawX, drawY, glassRect.width, glassRect.height);
          gl.uniform4f(uniforms.sampleRect, sampleX, sampleY, glassRect.width, glassRect.height);
          gl.uniform1f(uniforms.radius, 28);
          gl.uniform1f(uniforms.strengthPx, 92 * glass.displacement);
          gl.uniform3f(uniforms.tintColor, glass.tint.color[0], glass.tint.color[1], glass.tint.color[2]);
          gl.uniform1f(uniforms.tintStrength, glass.tint.strength);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        animationFrame = requestAnimationFrame(render);
      };

      animationFrame = requestAnimationFrame(render);
    };

    setup().catch((error) => {
      console.error('Failed to initialize shared glass shader', error);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (backdropTexture) gl.deleteTexture(backdropTexture);
      for (const texture of displacementTextures.values()) {
        gl.deleteTexture(texture);
      }
      if (program) gl.deleteProgram(program);
    };
  }, [backdropUrl]);

  return (
    <GlassSceneContext.Provider value={contextValue}>
      <section className="stage" ref={sceneRef}>
        <div
          ref={backdropRef}
          className="stage-art"
          style={{
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: `${textureSize.width}px ${textureSize.height}px`,
          }}
          aria-hidden="true"
        />
        <canvas ref={canvasRef} className="glass-scene-canvas" aria-hidden="true" />
        {children}
      </section>
    </GlassSceneContext.Provider>
  );
});

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  {
    shape = 'wavy-sheet',
    mode = 'stretch',
    displacement = 1,
    tint = defaultGlassTint,
    position,
    className,
    style,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    children,
  },
  ref,
) {
  void mode;
  const scene = useContext(GlassSceneContext);
  const idRef = useRef(`glass-${nextGlassId += 1}`);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const resolvedTint = useMemo(() => resolveGlassTint(tint), [tint]);
  const glassStyle = position
    ? ({
        ...style,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      } satisfies CSSProperties)
    : style;
  const glassClassName = ['glass-card', position ? 'is-floating' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  const setElementRef = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element;
      assignForwardedRef(ref, element);
    },
    [ref],
  );

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !scene) return undefined;

    return scene.registerGlass({
      id: idRef.current,
      element,
      shape,
      displacement,
      tint: resolvedTint,
    });
  }, [displacement, resolvedTint, scene, shape]);

  useLayoutEffect(() => {
    scene?.updateGlass(idRef.current, { shape, displacement, tint: resolvedTint });
  }, [displacement, resolvedTint, scene, shape]);

  return (
    <div
      ref={setElementRef}
      className={glassClassName}
      style={glassStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <span className="glass-content">{children}</span>
    </div>
  );
});

function assignForwardedRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) {
    ref.current = value;
  }
}

function resolveGlassTint(tint: GlassTint): ResolvedGlassTint {
  return {
    color: parseHexColor(tint.color),
    strength: clamp(tint.strength ?? 0, 0, 0.95),
  };
}

function parseHexColor(color: string): [number, number, number] {
  const normalized = color.trim().replace(/^#/, '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [1, 1, 1];
  }

  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const sceneVertexSource = `
precision mediump float;

attribute vec2 a_position;
uniform vec2 u_viewportSize;
uniform vec4 u_drawRect;
varying vec2 v_uv;

void main() {
  v_uv = a_position;
  vec2 pixelPosition = u_drawRect.xy + a_position * u_drawRect.zw;
  vec2 clipPosition = pixelPosition / u_viewportSize * 2.0 - 1.0;
  gl_Position = vec4(clipPosition.x, -clipPosition.y, 0.0, 1.0);
}
`;

const sceneFragmentSource = `
precision mediump float;

uniform sampler2D u_backdrop;
uniform sampler2D u_displacementMap;
uniform vec2 u_textureSize;
uniform vec4 u_sampleRect;
uniform vec2 u_scroll;
uniform float u_radius;
uniform float u_strengthPx;
uniform vec3 u_tintColor;
uniform float u_tintStrength;
uniform float u_sourceBrightness;
uniform float u_sourceContrast;
uniform float u_finalBrightness;
uniform float u_finalContrast;
uniform float u_transmissionStrength;
uniform float u_thicknessTintAmount;
varying vec2 v_uv;

float roundedRectMask(vec2 point, vec2 size, float radius) {
  float safeRadius = min(radius, min(size.x, size.y) * 0.5);
  vec2 halfSize = size * 0.5;
  vec2 q = abs(point - halfSize) - (halfSize - vec2(safeRadius));
  float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - safeRadius;
  return 1.0 - smoothstep(0.0, 1.25, distance);
}

void main() {
  vec2 localPx = v_uv * u_sampleRect.zw;
  float mask = roundedRectMask(localPx, u_sampleRect.zw, u_radius);
  if (mask <= 0.001) {
    discard;
  }

  vec4 mapSample = texture2D(u_displacementMap, v_uv);
  vec2 displacement = mapSample.rg - vec2(0.5);
  float thickness = mapSample.b;
  float edgeDistance = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
  float outerGlass = 1.0 - smoothstep(0.0, 0.16, edgeDistance);
  float innerBevel = smoothstep(0.035, 0.10, edgeDistance) * (1.0 - smoothstep(0.16, 0.28, edgeDistance));
  float bend = smoothstep(0.035, 0.18, length(displacement));
  float opticalWeight = clamp(0.42 + outerGlass * 2.15 + innerBevel * 0.9 + bend * 0.35, 0.0, 3.1);

  vec2 basePx = u_sampleRect.xy + localPx - u_scroll;
  vec2 sourcePx = basePx + displacement * u_strengthPx * opticalWeight;
  vec2 sourceUv = fract(sourcePx / u_textureSize);

  vec2 chromaPx = normalize(displacement + vec2(0.0001)) * mix(0.2, 3.6, max(bend, outerGlass));
  vec2 chroma = chromaPx / u_textureSize;
  vec3 color;
  color.r = texture2D(u_backdrop, fract(sourceUv + chroma)).r;
  color.g = texture2D(u_backdrop, sourceUv).g;
  color.b = texture2D(u_backdrop, fract(sourceUv - chroma)).b;

  float material = clamp(0.34 + outerGlass * 0.5 + innerBevel * 0.28 + bend * 0.18, 0.0, 1.0);
  float sourceLuminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(sourceLuminance), color, 1.24);
  color = (color - vec3(0.5)) * u_sourceContrast + vec3(0.5);
  color = clamp(color * u_sourceBrightness, 0.0, 1.0);
  float opticalDepth = u_tintStrength * u_transmissionStrength * (0.07 + thickness * u_thicknessTintAmount);
  vec3 transmission = pow(max(u_tintColor, vec3(0.001)), vec3(opticalDepth));
  color *= transmission;
  color = (color - vec3(0.5)) * u_finalContrast + vec3(0.5);
  color = clamp(color * u_finalBrightness, 0.0, 1.0);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), mask);
}
`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src.slice(0, 80)}`));
    image.src = src;
  });
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create WebGL shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function linkProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create WebGL program');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement) {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Unable to create WebGL texture');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
