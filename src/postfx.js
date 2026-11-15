import {
  THREE,
  Effect,
  EffectAttribute,
  EffectComposer,
  RenderPass,
  EffectPass,
  SavePass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction
} from './engine.js';
import { GFX_PRESETS, getPresetDefaultFx } from './constants.js';

const MOTION_BLUR_FRAG = /* glsl */ `
uniform mat4 uReprojMatrix;
uniform sampler2D uPrevFrame;
uniform vec2 uVelocity;
uniform vec2 uShakeVelocity;
uniform float uSpeedBlur;
uniform float uMBlurPower;
uniform float uShutterScale;
uniform float uTurnMix;
uniform float uShakeMix;
uniform float uTemporalMix;
uniform float uEnabled;
uniform float uDofAmount;
uniform float uCamNear;
uniform float uCamFar;
uniform float uAspect;

float mbHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float linearizeDist(float d, float zn, float zf) {
  float zNdc = clamp(d, 0.0, 0.99995) * 2.0 - 1.0;
  return (2.0 * zn * zf) / max(zf + zn - zNdc * (zf - zn), 0.001);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centered = uv - vec2(0.5);
  float dist = length(centered);
  float depth = min(readDepth(uv), 0.9994);
  float viewDistM = linearizeDist(depth, uCamNear, uCamFar);

  // Metric Distance Depth-of-Field: 0m..15m razor sharp -> 15m..75m+ velvety progressive optical blur
  float dofRamp = smoothstep(15.0, 75.0, viewDistM);
  float dofCurve = pow(dofRamp, 1.45) * max(uDofAmount, 0.0);

  float turnMask = clamp(uTurnMix, 0.0, 1.0) * step(0.5, uEnabled);
  float shakeMask = clamp(uShakeMix, 0.0, 1.0) * step(0.5, uEnabled);

  // 1. Real 3D Depth-Buffer Camera Reprojection Velocity (for strong Camera-Turn motion blur)
  vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 prevClip = uReprojMatrix * clipPos;
  vec2 reprojTrail = vec2(0.0);
  if (prevClip.w > 0.0002) {
    vec2 prevUV = (prevClip.xy / prevClip.w) * 0.5 + 0.5;
    reprojTrail = (prevUV - uv) * uShutterScale;
  }

  // 2. Strong Camera-Turn Motion Blur + Noticeably Lighter & Faster Running Camera-Shake Micro-Blur
  float turnEdgeMask = mix(0.36, 1.48, smoothstep(0.04, 0.48, dist));
  vec2 rotTrail = uVelocity * turnEdgeMask * turnMask;
  vec2 turnTrail = (reprojTrail * 0.65 * turnMask + rotTrail) * uMBlurPower;

  float shakeEdgeMask = mix(0.55, 1.05, smoothstep(0.08, 0.50, dist));
  float shakeCloseEase = mix(0.45, 1.0, smoothstep(0.65, 2.4, viewDistM));
  vec2 shakeTrail = uShakeVelocity * shakeEdgeMask * shakeMask * shakeCloseEase;

  float cornerEdge = smoothstep(0.38, 0.68, dist);
  vec2 radialInward = dist > 0.0001 ? -normalize(centered) * (dist * uSpeedBlur * cornerEdge * step(0.5, uEnabled)) : vec2(0.0);

  vec2 totalTrail = turnTrail + shakeTrail + radialInward;
  float mag = length(totalTrail);
  if (mag > 0.28) totalTrail = totalTrail * (0.28 / mag);

  // Early exit when both motion blur is off AND scene pixel is within 15m sharp radius
  if (mag < 0.0014 && dofCurve < 0.0015) {
    outputColor = inputColor;
    return;
  }

  vec4 accum = inputColor;
  float totalWeight = 1.0;
  float jitter = mbHash12(uv * 917.3 + fract(uSpeedBlur * 13.7 + uVelocity.x * 71.1));
  const int SAMPLES = 28;
  float aspectInv = 1.0 / max(uAspect, 0.5);
  float dofRad = 0.044 * dofCurve;
  float dofGate = smoothstep(0.0, 0.14, dofCurve) * (1.0 - smoothstep(0.008, 0.020, mag));

  for (int i = 1; i <= SAMPLES; i++) {
    float fi = float(i);
    float t = (fi - 0.5 + jitter * 0.60) / float(SAMPLES);
    // Golden-Angle Poisson Bokeh disc spread for silky-smooth >15m distance optical blur
    float ang = fi * 2.3999632 + jitter * 6.28318;
    float rDisc = sqrt((fi - 0.35) / float(SAMPLES));
    vec2 bokehOffset = vec2(cos(ang) * aspectInv, sin(ang)) * (dofRad * rDisc);
    vec2 motionOffset = totalTrail * t;

    vec2 suv = clamp(uv + motionOffset + bokehOffset, vec2(0.003), vec2(0.997));
    vec4 sCol = texture2D(inputBuffer, suv);
    float sLuma = dot(sCol.rgb, vec3(0.299, 0.587, 0.114));
    float lightBoost = 1.0 + smoothstep(0.68, 2.00, sLuma) * mix(0.65, 1.15, turnMask);

    // Continuous foreground bleed-guard so 15m transition never forms hard cutout seams
    float bleedGuard = 1.0;
    if (dofGate > 0.005) {
      float sDistM = linearizeDist(min(readDepth(suv), 0.9994), uCamNear, uCamFar);
      float bleedMask = mix(0.06, 1.0, smoothstep(12.0, 20.5, sDistM));
      bleedGuard = mix(1.0, bleedMask, dofGate);
    }

    float w = (1.0 - t * 0.22) * lightBoost * bleedGuard;
    accum += sCol * w;
    totalWeight += w;
  }

  vec3 blurred = accum.rgb / max(totalWeight, 0.0001);

  float tMix = uTemporalMix * turnMask * smoothstep(0.015, 0.055, mag);
  if (tMix > 0.001) {
    vec3 prevCol = texture2D(uPrevFrame, clamp(uv, vec2(0.003), vec2(0.997))).rgb;
    blurred = mix(blurred, prevCol, tMix);
  }

  outputColor = vec4(blurred, inputColor.a);
}
`;

const CRT_GRADE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uCrtAmount;
uniform float uLensCurve;
uniform float uGrainAmount;
uniform float uScanlineAmount;
uniform float uVignetteAmount;
uniform float uVhsStrength;
uniform float uPanic;
uniform float uIsKiller;
uniform float uIs43;
uniform vec2 uResolution;
uniform float uCrtNear;
uniform float uCrtFar;

float crtLinearizeDist(float d, float zn, float zf) {
  float zNdc = clamp(d, 0.0, 0.99995) * 2.0 - 1.0;
  return (2.0 * zn * zf) / max(zf + zn - zNdc * (zf - zn), 0.001);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 hash32(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

// Smooth ultra-tiny circular optical emulsion grains (avoids square Cartesian pixel noise)
float roundGrainLayer(vec2 p, float tSeed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float sum = 0.0;
  for (int oy = -1; oy <= 1; oy++) {
    for (int ox = -1; ox <= 1; ox++) {
      vec2 n = vec2(float(ox), float(oy));
      vec3 h = hash32(i + n + vec2(tSeed, tSeed * 1.37));
      vec2 dotCenter = n + 0.18 + 0.64 * h.xy;
      vec2 d = f - dotCenter;
      float r2 = dot(d, d);
      float disc = smoothstep(0.24, 0.015, r2);
      sum += (h.z - 0.5) * disc * 2.0;
    }
  }
  return sum;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv - vec2(0.5);
  // Wide circular optical profile on 16:9, ultra-bulbous vintage tube curvature on 4:3
  vec2 pOpt = vec2(p.x * mix(1.18, 1.0, uIs43), p.y);
  float r2 = dot(pOpt, pOpt);
  float r4 = r2 * r2;

  // 1. Strongly Curved Wide-Angle CRT/Camcorder Barrel Lens (16:9 & extreme 4:3 CRT modes)
  float curveScale = max(uLensCurve, 0.0);
  float baseZoom = mix(1.0, mix(0.76, 0.70, uIs43), clamp(curveScale, 0.0, 1.0));
  float lensPow = mix(0.66, 1.06, uIs43) * mix(1.0, 0.48, uIsKiller) * curveScale;
  vec2 cuv = mix(uv, vec2(0.5) + p * (baseZoom + r2 * lensPow + r4 * lensPow * 0.58), clamp(curveScale, 0.0, 1.0));

  // Rounded physical camcorder / CRT glass monitor mask
  vec2 edgeBox = abs(cuv - vec2(0.5)) * 2.0;
  float rectCore = mix(0.87, 0.81, uIs43);
  float cornerRad = mix(0.185, 0.235, uIs43);
  float cornerDist = length(max(edgeBox - vec2(rectCore), vec2(0.0)));
  if (curveScale > 0.08 && (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0 || cornerDist > cornerRad)) {
    outputColor = vec4(0.006, 0.005, 0.003, 1.0);
    return;
  }

  // Soft optical glass bezel edge darkening right at rounded tube rim
  float bezelFeather = 1.0 - smoothstep(cornerRad * 0.82, cornerRad, cornerDist);

  // Depth-aware close-object clarity (< ~2.8m) so players can clearly read notes, papers & inspect props
  vec2 baseCuv = clamp(cuv, vec2(0.006), vec2(0.994));
  float closeDistM = crtLinearizeDist(min(readDepth(baseCuv), 0.9994), uCrtNear, uCrtFar);
  float nearFocus = 1.0 - smoothstep(0.85, 2.85, closeDistM);

  // 2. Heavy Camcorder VHS Tracking & Entity Proximity Interference
  float scanAmt = max(uScanlineAmount, 0.0);
  float vhs = uVhsStrength * scanAmt;
  float sweep = sin(cuv.y * 7.0 - uTime * 2.4 + sin(uTime * 11.0));
  float sweepLine = smoothstep(0.965, 1.0, sweep);
  float bottomNoise = smoothstep(0.045, 0.0, cuv.y) * 0.65;
  float tearFreq = (0.00022 + sweepLine * 0.0065 + bottomNoise * 0.008 + uPanic * 0.016) * vhs * mix(1.0, 0.08, nearFocus);
  float lineNoise = (hash12(vec2(floor(cuv.y * 260.0), floor(uTime * 24.0))) - 0.5);
  cuv.x = clamp(cuv.x + lineNoise * tearFreq, 0.006, 0.994);

  // 3. Clean Optical Lens Dispersion + Film Halation across HDR blurred inputBuffer + Close-Range Optical Micro-Sharpening
  vec2 clampedCuv = clamp(cuv, vec2(0.006), vec2(0.994));
  float shift = (0.00068 + r2 * 0.0030 + uPanic * 0.0026 * vhs) * scanAmt * mix(0.35, 1.0, clamp(curveScale, 0.0, 1.0)) * mix(1.0, 0.14, nearFocus);
  float colR = max(0.0, texture2D(inputBuffer, clamp(clampedCuv + vec2(shift, 0.0), vec2(0.006), vec2(0.994))).r);
  float colG = max(0.0, texture2D(inputBuffer, clampedCuv).g);
  float colB = max(0.0, texture2D(inputBuffer, clamp(clampedCuv - vec2(shift, 0.0), vec2(0.006), vec2(0.994))).b);
  vec3 col = vec3(colR, colG, colB);

  // Subtle Analog Camcorder Halation (warm amber-red bloom rim around bright fluorescent tubes)
  vec2 halStep = vec2(0.0032, 0.0022);
  vec3 halSample = 0.25 * (
    texture2D(inputBuffer, clamp(clampedCuv + halStep, vec2(0.006), vec2(0.994))).rgb +
    texture2D(inputBuffer, clamp(clampedCuv - halStep, vec2(0.006), vec2(0.994))).rgb +
    texture2D(inputBuffer, clamp(clampedCuv + vec2(halStep.x, -halStep.y), vec2(0.006), vec2(0.994))).rgb +
    texture2D(inputBuffer, clamp(clampedCuv + vec2(-halStep.x, halStep.y), vec2(0.006), vec2(0.994))).rgb
  );
  float halLuma = dot(halSample, vec3(0.299, 0.587, 0.114));
  col += vec3(1.0, 0.48, 0.16) * smoothstep(0.72, 1.85, halLuma) * 0.14 * clamp(uCrtAmount, 0.0, 1.0);

  if (nearFocus > 0.01) {
    vec2 pxStep = 1.0 / max(uResolution.xy, vec2(640.0, 360.0));
    vec3 nb = 0.25 * (
      texture2D(inputBuffer, clamp(clampedCuv + vec2(pxStep.x, 0.0), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv - vec2(pxStep.x, 0.0), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(0.0, pxStep.y), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv - vec2(0.0, pxStep.y), vec2(0.006), vec2(0.994))).rgb
    );
    vec3 sharpDelta = clamp(col - nb, vec3(-0.24), vec3(0.24));
    col = max(vec3(0.0), col + sharpDelta * (nearFocus * 0.82));
  }

  // 4. HDR Color Grade & Filmic ACES Tone Mapping BEFORE Contrast S-curve (prevents negative channel wrap!)
  float uneasyBreathe = mix(1.0 + sin(uTime * 0.68) * 0.025 + sin(uTime * 2.1) * 0.012 * uPanic, 1.0, uIsKiller);
  col = pow(max(col * uneasyBreathe, vec3(0.0)), vec3(1.04));

  float preLumaHdr = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 deepAmberShadow = vec3(0.82, 0.66, 0.24);
  vec3 sicklyYellowHi = vec3(1.26, 1.08, 0.48);
  vec3 grade = mix(deepAmberShadow, sicklyYellowHi, smoothstep(0.03, 0.58, preLumaHdr));
  col *= grade;

  if (uIsKiller > 0.5) {
    col *= vec3(1.10, 0.92, 0.80);
  }
  col = mix(col, col * vec3(1.24, 0.76, 0.62), uPanic * 0.52);

  // Filmic ACES rolloff matched near Picture-2 iconic bright Backrooms exposure without negative wrap
  col *= 0.84;
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), vec3(0.0), vec3(1.0));

  // Ultra-tiny Circular Analog Silver-Halide Grain — soft round beads with high highlight presence!
  float preLuma = dot(col, vec3(0.299, 0.587, 0.114));
  float lightGrainBoost = smoothstep(0.24, 0.86, preLuma);
  vec2 resPx = max(uResolution.xy, vec2(640.0, 360.0));
  vec2 rotPx = mat2(0.8, -0.6, 0.6, 0.8) * (clampedCuv * resPx);
  float tSeedA = floor(fract(uTime * 0.73) * 48.0);
  float tSeedB = floor(fract(uTime * 0.59 + 0.37) * 48.0);
  float gRoundA = roundGrainLayer(clampedCuv * resPx * 0.72, tSeedA);
  float gRoundB = roundGrainLayer(rotPx * 1.24, tSeedB);
  float gMix = clamp((gRoundA * 0.56 + gRoundB * 0.44) * 0.55, -0.55, 0.55);
  float grainMul = max(uGrainAmount, 0.0);
  float baseGrain = (mix(0.056, 0.030, uIsKiller) + uPanic * 0.052) * grainMul;
  float closeGrainEase = mix(1.0, 0.24, nearFocus);
  float lightGrain = baseGrain * (1.0 + lightGrainBoost * 5.2) * closeGrainEase;
  float darkBite = max(0.0, -gMix) * lightGrainBoost * mix(0.62, 0.32, uIsKiller) * min(grainMul, 1.5) * mix(1.0, 0.16, nearFocus);
  col = clamp(col * max(0.28, 1.0 - darkBite) + vec3(gMix) * lightGrain * vec3(1.12, 1.00, 0.76), vec3(0.0), vec3(1.0));

  // VHS horizontal tape snow spikes on tracking / Entity proximity (calmed over close-up inspection)
  float snowTrigger = smoothstep(0.92 - uPanic * 0.25, 1.0, hash12(vec2(cuv.x * 180.0, floor(cuv.y * 220.0 + uTime * 42.0))));
  col += vec3(0.75, 0.68, 0.42) * snowTrigger * (0.045 + sweepLine * 0.09 + uPanic * 0.22) * vhs * mix(1.0, 0.14, nearFocus);

  // Bounded [0,1] contrast S-curve preserving deep recesses & clear wall textures
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.24);

  // 5. Pronounced CRT Scanlines & Aperture Grille (eased smoothly up close so small text stays crisp)
  float scan = sin(clampedCuv.y * max(uResolution.y, 480.0) * 1.1) * 0.5 + 0.5;
  float scanMul = mix(1.0 - (mix(0.14, 0.18, uIs43) * scanAmt) * (1.0 - scan), 1.0, nearFocus * 0.58);
  float triad = sin(clampedCuv.x * max(uResolution.x, 640.0) * 1.65) * 0.5 + 0.5;
  float triadMul = mix(1.0 - (0.045 * scanAmt) * triad, 1.0, nearFocus * 0.58);
  col *= scanMul * triadMul;

  // 6. Strong Deep Camcorder Optical Vignette + Curved Bezel Glass Roll-Off
  float vigAmt = max(uVignetteAmount, 0.0);
  float bezel = smoothstep(mix(0.60, 0.50, uIs43), 0.12, r2);
  float outerDarkGrad = pow(clamp(smoothstep(mix(0.54, 0.46, uIs43), 0.05, r2), 0.0, 1.0), 1.48);
  float cornerCrush = smoothstep(mix(0.42, 0.34, uIs43), 0.14, r2);
  col *= mix(1.0, (0.32 + 0.68 * bezel) * mix(1.0, bezelFeather, 0.92), clamp(curveScale, 0.0, 1.0) * clamp(vigAmt, 0.2, 1.4));
  col *= mix(1.0, mix(0.025, 1.0, outerDarkGrad * (0.72 + 0.28 * cornerCrush)), clamp(vigAmt * 0.85, 0.0, 1.65));

  outputColor = vec4(max(col, vec3(0.0015)), inputColor.a);
}
`;

// Real-Time Screen-Space Wall Contact AO, Multi-Scale Cavity SSAO, Indirect Radiosity Bounce & Overhead-Light Shadow Raymarch Shader (High & Ultra presets)
const RT_SHADOW_FRAG = /* glsl */ `
uniform mat4 uProj;
uniform mat4 uInvProj;
uniform vec2 uResolution;
uniform float uStrength;
uniform float uShadowFar;
uniform vec3 uLightV0;
uniform vec3 uLightV1;
uniform float uLightPow0;
uniform float uLightPow1;

float rtHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 rtViewPos(vec2 uvc, float d) {
  vec4 ndc = vec4(uvc * 2.0 - 1.0, clamp(d, 0.0, 0.99995) * 2.0 - 1.0, 1.0);
  vec4 vp = uInvProj * ndc;
  return vp.xyz / max(vp.w, 0.00001);
}

vec2 rtProjectUV(vec3 pV) {
  vec4 clip = uProj * vec4(pV, 1.0);
  return (clip.xy / max(clip.w, 0.0001)) * 0.5 + 0.5;
}

float rtTraceLight(vec3 originV, vec3 normV, vec3 lightPosV, float jitter) {
  vec3 toL = lightPosV - originV;
  float distL = length(toL);
  if (distL < 0.15) return 0.0;
  vec3 lDir = toL / distL;
  float ndl = dot(normV, lDir);
  if (ndl < 0.05) return 0.0;

  float traceLen = min(1.35, distL * 0.54);
  float occ = 0.0;
  const int RAY_STEPS = 8;
  for (int k = 0; k < RAY_STEPS; k++) {
    float frac = (float(k) + 0.25 + jitter * 0.65) / float(RAY_STEPS);
    float t = mix(0.038, traceLen, frac);
    vec3 rayP = originV + lDir * t;
    vec2 suv = rtProjectUV(rayP);
    if (suv.x < 0.002 || suv.x > 0.998 || suv.y < 0.002 || suv.y > 0.998) continue;
    float sDepth = min(readDepth(suv), 0.9996);
    float sceneZ = rtViewPos(suv, sDepth).z;
    float dz = sceneZ - rayP.z;
    if (dz > 0.020 && dz < 0.92) {
      float fall = 1.0 - frac * 0.38;
      occ = max(occ, fall * smoothstep(0.020, 0.068, dz));
    }
  }
  return occ * smoothstep(0.05, 0.22, ndl);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float depth = min(readDepth(uv), 0.9996);
  if (uStrength < 0.05 || depth > 0.9985) {
    outputColor = inputColor;
    return;
  }

  vec3 posV = rtViewPos(uv, depth);
  float distM = max(0.0, -posV.z);
  float distFade = 1.0 - smoothstep(28.0, uShadowFar, distM);
  if (distFade < 0.005) {
    outputColor = inputColor;
    return;
  }

  // Discontinuity-preserving 3D View-Space Normal reconstruction (zero black foreground halos)
  vec2 px = 1.0 / max(uResolution, vec2(640.0, 360.0));
  vec2 uvL = clamp(uv - vec2(px.x, 0.0), vec2(0.001), vec2(0.999));
  vec2 uvR = clamp(uv + vec2(px.x, 0.0), vec2(0.001), vec2(0.999));
  vec2 uvD = clamp(uv - vec2(0.0, px.y), vec2(0.001), vec2(0.999));
  vec2 uvU = clamp(uv + vec2(0.0, px.y), vec2(0.001), vec2(0.999));
  vec3 pL = rtViewPos(uvL, min(readDepth(uvL), 0.9996));
  vec3 pR = rtViewPos(uvR, min(readDepth(uvR), 0.9996));
  vec3 pD = rtViewPos(uvD, min(readDepth(uvD), 0.9996));
  vec3 pU = rtViewPos(uvU, min(readDepth(uvU), 0.9996));
  vec3 ddx = abs(pR.z - posV.z) < abs(posV.z - pL.z) ? (pR - posV) : (posV - pL);
  vec3 ddy = abs(pU.z - posV.z) < abs(posV.z - pD.z) ? (pU - posV) : (posV - pD);
  vec3 normV = normalize(cross(ddx, ddy));
  if (dot(normV, -posV) < 0.0) normV = -normV;

  // Orthonormal tangent basis oriented along real-time surface normal
  vec3 upRef = abs(normV.z) < 0.85 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tanX = normalize(cross(upRef, normV));
  vec3 tanY = cross(normV, tanX);

  float jitter = rtHash12(floor(uv * uResolution) + vec2(37.0, 91.0));
  float rotAng = jitter * 6.2831853;
  vec3 originV = posV + normV * 0.020;

  // 1. 12-Sample Multi-Ring Hemisphere SSAO + Micro-Crevice Cavity Occlusion + Warm Indirect Bounce
  float aoSum = 0.0;
  float aoWeight = 0.0;
  vec3 bounceAccum = vec3(0.0);
  const int AO_SAMPLES = 12;
  for (int i = 0; i < AO_SAMPLES; i++) {
    float fi = float(i);
    float phi = fi * 2.3999632 + rotAng;
    float cosTheta = mix(0.20, 0.94, (fi + 0.5) / float(AO_SAMPLES));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
    vec3 dirLocal = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
    vec3 dirV = tanX * dirLocal.x + tanY * dirLocal.y + normV * dirLocal.z;

    float radM = i < 4 ? mix(0.075, 0.24, fi / 3.0) : mix(0.28, 0.86, (fi - 4.0) / 7.0);
    vec3 sampleV = originV + dirV * radM;
    vec2 suv = rtProjectUV(sampleV);
    if (suv.x < 0.002 || suv.x > 0.998 || suv.y < 0.002 || suv.y > 0.998) continue;

    float sDepth = min(readDepth(suv), 0.9996);
    vec3 sceneS = rtViewPos(suv, sDepth);
    vec3 toOcc = sceneS - posV;
    float occDist = length(toOcc);
    if (occDist > 0.004 && occDist < 1.25 && sceneS.z >= sampleV.z + 0.012) {
      float steep = smoothstep(0.16, 0.54, dot(normV, toOcc / occDist));
      float rangeFall = 1.0 - smoothstep(0.12, 1.22, occDist);
      aoSum += steep * rangeFall;
      if (uStrength > 1.15 && (i & 1) == 0) {
        bounceAccum += texture2D(inputBuffer, suv).rgb * steep * rangeFall;
      }
    }
    aoWeight += 1.0;
  }
  float aoNorm = aoWeight > 0.0 ? clamp((aoSum / aoWeight) * 2.55, 0.0, 1.0) : 0.0;

  // 2. Real-Time Directional Contact Shadow Raymarch toward Nearest Active Ceiling Lights
  float rayShadow = 0.0;
  float totalLPow = max(0.001, uLightPow0 + uLightPow1);
  if (uLightPow0 > 0.02) rayShadow += rtTraceLight(originV + normV * 0.012, normV, uLightV0, jitter) * uLightPow0;
  if (uLightPow1 > 0.02) rayShadow += rtTraceLight(originV + normV * 0.012, normV, uLightV1, fract(jitter + 0.37)) * uLightPow1;
  rayShadow = clamp(rayShadow / totalLPow, 0.0, 1.0);

  // Shield emissive fluorescent panels from self-darkening + apply warm-tinted floor/wall contact shadow & Ultra bounce GI
  float luma = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  float emissiveShield = 1.0 - smoothstep(1.05, 2.6, luma);
  float occCombined = clamp(aoNorm * 0.68 + rayShadow * 0.56, 0.0, 1.0);
  float shadowAmt = clamp(pow(occCombined, 0.88) * 0.76 * clamp(uStrength, 0.0, 1.6), 0.0, 0.88) * distFade * emissiveShield;

  vec3 shaded = inputColor.rgb * mix(vec3(1.0), vec3(0.18, 0.16, 0.13), shadowAmt);
  if (uStrength > 1.15) {
    vec3 giBounce = min(vec3(0.24), bounceAccum * 0.085) * (1.0 - shadowAmt * 0.55) * distFade * emissiveShield;
    shaded += giBounce * vec3(1.06, 0.95, 0.68);
  }
  outputColor = vec4(shaded, inputColor.a);
}
`;

export class BackroomsRTShadowEffect extends Effect {
  constructor() {
    super('BackroomsRTShadowEffect', RT_SHADOW_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uProj', new THREE.Uniform(new THREE.Matrix4())],
        ['uInvProj', new THREE.Uniform(new THREE.Matrix4())],
        ['uResolution', new THREE.Uniform(new THREE.Vector2(1280, 720))],
        ['uStrength', new THREE.Uniform(1.0)],
        ['uShadowFar', new THREE.Uniform(46.0)],
        ['uLightV0', new THREE.Uniform(new THREE.Vector3(0, 2.5, -3))],
        ['uLightV1', new THREE.Uniform(new THREE.Vector3(4, 2.5, -6))],
        ['uLightPow0', new THREE.Uniform(1.0)],
        ['uLightPow1', new THREE.Uniform(0.5)]
      ])
    });
  }
}

export class BackroomsMotionBlurEffect extends Effect {
  constructor() {
    super('BackroomsMotionBlurEffect', MOTION_BLUR_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uReprojMatrix', new THREE.Uniform(new THREE.Matrix4())],
        ['uPrevFrame', new THREE.Uniform(null)],
        ['uVelocity', new THREE.Uniform(new THREE.Vector2(0, 0))],
        ['uShakeVelocity', new THREE.Uniform(new THREE.Vector2(0, 0))],
        ['uSpeedBlur', new THREE.Uniform(0)],
        ['uMBlurPower', new THREE.Uniform(1.38)],
        ['uShutterScale', new THREE.Uniform(1.0)],
        ['uTurnMix', new THREE.Uniform(0)],
        ['uShakeMix', new THREE.Uniform(0)],
        ['uTemporalMix', new THREE.Uniform(0)],
        ['uEnabled', new THREE.Uniform(1)],
        ['uDofAmount', new THREE.Uniform(1.0)],
        ['uCamNear', new THREE.Uniform(0.08)],
        ['uCamFar', new THREE.Uniform(115.0)],
        ['uAspect', new THREE.Uniform(16 / 9)]
      ])
    });
    this._currViewProj = new THREE.Matrix4();
    this._invCurrViewProj = new THREE.Matrix4();
    this._prevViewProj = new THREE.Matrix4();
    this._hasHistory = false;
    this._targetTemporalMix = 0.0;
  }

  resetHistory() {
    this._hasHistory = false;
    this.uniforms.get('uTemporalMix').value = 0.0;
  }

  updateMatrices(camera, dt) {
    if (!camera) return;
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    this._currViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.uniforms.get('uShutterScale').value = THREE.MathUtils.clamp(0.015 / Math.max(dt || 0.016, 0.004), 0.35, 1.35);
    this.uniforms.get('uCamNear').value = camera.near || 0.08;
    this.uniforms.get('uCamFar').value = camera.far || 115.0;
    this.uniforms.get('uAspect').value = camera.aspect || 16 / 9;
    if (!this._hasHistory) {
      this._prevViewProj.copy(this._currViewProj);
      this.uniforms.get('uReprojMatrix').value.identity();
      this.uniforms.get('uTemporalMix').value = 0.0;
    } else {
      this._invCurrViewProj.copy(this._currViewProj).invert();
      this.uniforms.get('uReprojMatrix').value.multiplyMatrices(this._prevViewProj, this._invCurrViewProj);
      this.uniforms.get('uTemporalMix').value = this._targetTemporalMix;
    }
  }

  commitFrame() {
    this._prevViewProj.copy(this._currViewProj);
    this._hasHistory = true;
  }
}

export class BackroomsCRTGradeEffect extends Effect {
  constructor() {
    super('BackroomsCRTGradeEffect', CRT_GRADE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uTime', new THREE.Uniform(0)],
        ['uCrtAmount', new THREE.Uniform(1.0)],
        ['uLensCurve', new THREE.Uniform(1.0)],
        ['uGrainAmount', new THREE.Uniform(1.0)],
        ['uScanlineAmount', new THREE.Uniform(1.0)],
        ['uVignetteAmount', new THREE.Uniform(1.0)],
        ['uVhsStrength', new THREE.Uniform(1.0)],
        ['uPanic', new THREE.Uniform(0)],
        ['uIsKiller', new THREE.Uniform(0)],
        ['uIs43', new THREE.Uniform(0)],
        ['uResolution', new THREE.Uniform(new THREE.Vector2(1280, 720))],
        ['uCrtNear', new THREE.Uniform(0.06)],
        ['uCrtFar', new THREE.Uniform(115.0)]
      ])
    });
  }
}

/**
 * Manages preset & per-effect Found-Footage Post-Processing:
 * Bloom runs BEFORE MotionBlur/DoF so overhead fluorescent light blooms smear smoothly during turns!
 */
export class GraphicsManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.presetKey = 'ultra';
    this.fx = getPresetDefaultFx('ultra');
    this.aspectMode = '4:3';
    this.composer = null;
    this.renderPass = null;
    this.rtShadowPass = null;
    this.bloomPass = null;
    this.mblurPass = null;
    this.savePass = null;
    this.crtPass = null;
    this._viewW = window.innerWidth;
    this._viewH = window.innerHeight;
    this._nearLights = null;
    this._tmpLightV = new THREE.Vector3();

    this.rtShadow = new BackroomsRTShadowEffect();

    // Pass 1: Bright Fluorescent Fixture & Iconic Level-0 Glow Bloom (keeps bright wall notes sharp & un-hazed)
    this.bloom = new BloomEffect({
      intensity: 1.55,
      luminanceThreshold: 0.50,
      luminanceSmoothing: 0.26,
      mipmapBlur: true,
      radius: 0.78
    });
    this.motionBlur = new BackroomsMotionBlurEffect();
    this.crtGrade = new BackroomsCRTGradeEffect();
    this.vignette = new VignetteEffect({
      eskil: false,
      offset: 0.31,
      darkness: 0.88
    });
    this.noise = new NoiseEffect({
      blendFunction: BlendFunction.OVERLAY,
      premultiply: true
    });
    this.noise.blendMode.opacity.value = 0.04;

    this._velX = 0;
    this._velY = 0;
    this._turnMix = 0;
    this._shakeVelX = 0;
    this._shakeVelY = 0;
    this._shakeMix = 0;
    this._speedBlur = 0;
  }

  _ensureComposer() {
    if (this.composer) return;
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType });
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
  }

  _clearEffectPasses() {
    if (!this.composer) return;
    for (const field of ['rtShadowPass', 'bloomPass', 'mblurPass', 'savePass', 'crtPass']) {
      if (this[field]) {
        this.composer.removePass(this[field]);
        this[field].dispose?.();
        this[field] = null;
      }
    }
  }

  setAspectMode(mode) {
    this.aspectMode = mode === '4:3' ? '4:3' : '16:9';
    this.crtGrade.uniforms.get('uIs43').value = this.aspectMode === '4:3' ? 1.0 : 0.0;
    this.motionBlur.resetHistory();
  }

  resetMotionHistory() {
    this._velX = 0;
    this._velY = 0;
    this._turnMix = 0;
    this._shakeVelX = 0;
    this._shakeVelY = 0;
    this._shakeMix = 0;
    this._speedBlur = 0;
    this.motionBlur.uniforms.get('uTurnMix').value = 0;
    this.motionBlur.uniforms.get('uShakeMix').value = 0;
    this.motionBlur.uniforms.get('uShakeVelocity').value.set(0, 0);
    this.motionBlur.resetHistory();
  }

  applyFx(fx, hemiLight = null, ambLight = null) {
    this.fx = { ...this.fx, ...fx };

    const dpr = Math.min(window.devicePixelRatio || 1, Number(this.fx.renderScale) || 1.0);
    this.renderer.setPixelRatio(Math.max(0.5, dpr));
    this.renderer.shadowMap.enabled = !!this.fx.shadows;

    const br = Number(this.fx.brightness) || 1.0;
    // Balanced lighting contrast: deep dark alcoves + radiant bright Level-0 halls
    this.renderer.toneMappingExposure = (this.fx.postFX ? 1.12 : 1.06) * br;
    if (hemiLight) hemiLight.intensity = this.fx.postFX ? 0.38 : 0.40;
    if (ambLight) ambLight.intensity = this.fx.postFX ? 0.14 : 0.16;

    if (this.fx.postFX) {
      this._ensureComposer();
      this._clearEffectPasses();

      const hasRtShadow = (this.fx.rtShadow ?? 0) > 0.05;
      const hasMBlur = this.fx.motionBlur > 0.01;
      const hasDof = this.fx.dofBlur > 0.01;
      const hasBloom = this.fx.bloom > 0.01;

      this.rtShadow.uniforms.get('uStrength').value = Math.max(0, this.fx.rtShadow ?? 0);
      this.bloom.intensity = 1.55 * Math.max(0, this.fx.bloom);
      this.motionBlur.uniforms.get('uEnabled').value = hasMBlur ? 1.0 : 0.0;
      this.motionBlur.uniforms.get('uDofAmount').value = Math.max(0, this.fx.dofBlur);
      this.crtGrade.uniforms.get('uCrtAmount').value = this.fx.lensCurve > 0.01 || this.fx.scanlines > 0.01 ? 1.0 : 0.0;
      this.crtGrade.uniforms.get('uLensCurve').value = Math.max(0, this.fx.lensCurve);
      this.crtGrade.uniforms.get('uGrainAmount').value = Math.max(0, this.fx.grain);
      this.crtGrade.uniforms.get('uScanlineAmount').value = Math.max(0, this.fx.scanlines);
      this.crtGrade.uniforms.get('uVignetteAmount').value = Math.max(0, this.fx.vignette);
      this.crtGrade.uniforms.get('uIs43').value = this.aspectMode === '4:3' ? 1.0 : 0.0;

      // TRUE SEPARATE MULTI-PASS PIPELINE:
      // RenderPass -> RTShadowPass (High/Ultra Real-Time Contact AO + Raymarched Wall Shadows) -> Bloom -> MotionBlur/DoF -> SavePass -> CRTGrade
      if (hasRtShadow) {
        this.rtShadowPass = new EffectPass(this.camera, this.rtShadow);
        this.composer.addPass(this.rtShadowPass);
      }
      if (hasBloom) {
        this.bloomPass = new EffectPass(this.camera, this.bloom);
        this.composer.addPass(this.bloomPass);
      }
      if (hasMBlur || hasDof) {
        this.savePass = new SavePass();
        this.motionBlur.uniforms.get('uPrevFrame').value = this.savePass.renderTarget.texture;
        this.mblurPass = new EffectPass(this.camera, this.motionBlur);
        this.composer.addPass(this.mblurPass);
        this.composer.addPass(this.savePass);
      }

      const crtEffects = [this.crtGrade, this.vignette];
      this.crtPass = new EffectPass(this.camera, ...crtEffects);
      this.composer.addPass(this.crtPass);

      this.resetMotionHistory();
      this.setSize(this._viewW, this._viewH);
    } else {
      this._clearEffectPasses();
      this.rtShadow.uniforms.get('uStrength').value = 0;
    }

    return this.fx;
  }

  applyPreset(key, hemiLight = null, ambLight = null) {
    const preset = GFX_PRESETS[key] || GFX_PRESETS.high;
    this.presetKey = key in GFX_PRESETS ? key : 'high';
    this.applyFx(getPresetDefaultFx(this.presetKey), hemiLight, ambLight);
    return preset;
  }

  setSize(w, h) {
    this._viewW = w;
    this._viewH = h;
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    this.crtGrade.uniforms.get('uResolution').value.set(w, h);
    this.rtShadow.uniforms.get('uResolution').value.set(w, h);
    this.motionBlur.resetHistory();
  }

  update(dt, { turnYawRate = 0, turnPitchRate = 0, shakeXRate = 0, shakeYRate = 0, speedRatio = 0, panic = 0, isKiller = false, elapsed = 0, nearLights = null }) {
    this._nearLights = nearLights;
    if (!this.fx.postFX) return;

    const mbU = this.motionBlur.uniforms;
    const mbScale = Math.max(0, this.fx.motionBlur || 0);
    const turnMag = Math.hypot(turnYawRate, turnPitchRate);
    const shakeMag = Math.hypot(shakeXRate, shakeYRate);
    const fdtT = Math.min(dt, 0.068);

    // Channel 1: Crisp Camera-Turn Motion Blur (high ceiling for cinematic whip-pans, snaps off cleanly when mouse halts)
    if (turnMag < 0.08 || mbScale < 0.01) {
      this._velX = 0;
      this._velY = 0;
      this._turnMix = 0;
    } else {
      const targetVx = THREE.MathUtils.clamp(-turnYawRate * 0.042, -0.26, 0.26);
      const targetVy = THREE.MathUtils.clamp(turnPitchRate * 0.038, -0.21, 0.21);
      const kAtkT = 1 - Math.exp(-44.0 * fdtT);
      const kRelT = 1 - Math.exp(-36.0 * fdtT);
      this._velX += (targetVx - this._velX) * (Math.abs(targetVx) > Math.abs(this._velX) ? kAtkT : kRelT);
      this._velY += (targetVy - this._velY) * (Math.abs(targetVy) > Math.abs(this._velY) ? kAtkT : kRelT);
      this._turnMix = THREE.MathUtils.clamp(turnMag / 1.25, 0.0, 1.0);
    }

    // Channel 2: Running Camera-Shake Motion Blur — noticeably lighter & >2.5x faster/snappier than camera turn
    const shakeScale = Math.min(mbScale, 1.5);
    if (shakeMag < 0.10 || shakeScale < 0.01) {
      this._shakeVelX = 0;
      this._shakeVelY = 0;
      this._shakeMix = 0;
    } else {
      const targetSx = THREE.MathUtils.clamp(-shakeXRate * 0.0052 * shakeScale, -0.020 * shakeScale, 0.020 * shakeScale);
      const targetSy = THREE.MathUtils.clamp(shakeYRate * 0.0048 * shakeScale, -0.018 * shakeScale, 0.018 * shakeScale);
      const kAtkS = 1 - Math.exp(-85.0 * fdtT);
      const kRelS = 1 - Math.exp(-75.0 * fdtT);
      this._shakeVelX += (targetSx - this._shakeVelX) * (Math.abs(targetSx) > Math.abs(this._shakeVelX) ? kAtkS : kRelS);
      this._shakeVelY += (targetSy - this._shakeVelY) * (Math.abs(targetSy) > Math.abs(this._shakeVelY) ? kAtkS : kRelS);
      this._shakeMix = THREE.MathUtils.clamp(shakeMag / 1.45, 0.0, 1.0);
    }

    // Light fast peripheral sprint feel so forward movement never smudges close inspection
    const targetSpd = THREE.MathUtils.clamp(speedRatio * 0.0055 * shakeScale, 0, 0.008 * shakeScale);
    const kSpd = 1 - Math.exp(-28.0 * fdtT);
    this._speedBlur += (targetSpd - this._speedBlur) * kSpd;

    mbU.get('uVelocity').value.set(this._velX, this._velY);
    mbU.get('uShakeVelocity').value.set(this._shakeVelX, this._shakeVelY);
    mbU.get('uSpeedBlur').value = this._speedBlur;
    mbU.get('uTurnMix').value = this._turnMix || 0;
    mbU.get('uShakeMix').value = this._shakeMix || 0;
    mbU.get('uMBlurPower').value = (isKiller ? 1.15 : 1.75) * mbScale;

    const crtU = this.crtGrade.uniforms;
    crtU.get('uTime').value = elapsed;
    crtU.get('uPanic').value = THREE.MathUtils.clamp(panic, 0, 1);
    crtU.get('uIsKiller').value = isKiller ? 1.0 : 0.0;
    crtU.get('uVhsStrength').value = isKiller ? 0.65 : 1.25;
    crtU.get('uCrtNear').value = this.camera.near || 0.06;
    crtU.get('uCrtFar').value = this.camera.far || 115.0;

    const p = THREE.MathUtils.clamp(panic, 0, 1);
    const vigMul = Math.max(0, this.fx.vignette ?? 1.28);
    const grainMul = Math.max(0, this.fx.grain ?? 1.0);
    this.vignette.darkness = Math.min(0.98, (0.86 + p * 0.14) * Math.min(vigMul, 1.5));
    this.noise.blendMode.opacity.value = ((isKiller ? 0.022 : 0.040) + p * 0.09) * grainMul;
  }

  render(dt) {
    if (this.fx.postFX && this.composer) {
      if (this.rtShadowPass) {
        this.camera.updateMatrixWorld(true);
        this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
        const rtU = this.rtShadow.uniforms;
        rtU.get('uProj').value.copy(this.camera.projectionMatrix);
        rtU.get('uInvProj').value.copy(this.camera.projectionMatrixInverse);
        let lIdx = 0;
        rtU.get('uLightPow0').value = 0.0;
        rtU.get('uLightPow1').value = 0.0;
        if (this._nearLights) {
          for (let i = 0; i < this._nearLights.length && lIdx < 2; i++) {
            const pl = this._nearLights[i];
            if (!pl || pl.intensity <= 0.05) continue;
            this._tmpLightV.copy(pl.position).applyMatrix4(this.camera.matrixWorldInverse);
            rtU.get(lIdx === 0 ? 'uLightV0' : 'uLightV1').value.copy(this._tmpLightV);
            rtU.get(lIdx === 0 ? 'uLightPow0' : 'uLightPow1').value = THREE.MathUtils.clamp(pl.intensity / 6.0, 0.15, 1.0);
            lIdx++;
          }
        }
      }
      if (this.mblurPass) {
        this.motionBlur.updateMatrices(this.camera, dt);
      }
      this.composer.render(dt);
      if (this.mblurPass) {
        this.motionBlur.commitFrame();
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
