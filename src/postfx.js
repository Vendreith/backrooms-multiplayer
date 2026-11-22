/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

import {
  THREE,
  Pass,
  Effect,
  EffectAttribute,
  EffectComposer,
  RenderPass,
  EffectPass,
  SavePass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction,
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  PredicationMode,
  FXAAEffect
} from './engine.js';
import { GFX_PRESETS, FOOTAGE_FILTER_PRESETS, EYE_ADAPT_PRESETS, getPresetDefaultFx } from './constants.js';

const EXP_METER_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// 12x12 HDR spatial metering pass (runs BEFORE bloom, vignette, scanlines, grain & CRT distortion)
const EXP_METER_FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uTexelSize;
varying vec2 vUv;

float safeLuma(vec2 sUv) {
  vec3 c = texture2D(tInput, clamp(sUv, vec2(0.05), vec2(0.95))).rgb;
  c = clamp(c, vec3(0.0), vec3(64.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return (l >= 0.0 && l <= 128.0) ? l : 0.24;
}

void main() {
  // Keep metering inside active camera viewport (skip outer dark CRT bezel margins)
  vec2 baseUv = mix(vec2(0.08), vec2(0.92), vUv);
  vec2 d = max(uTexelSize * 2.5, vec2(0.012));
  float l0 = safeLuma(baseUv + vec2(-d.x, -d.y));
  float l1 = safeLuma(baseUv + vec2( d.x, -d.y));
  float l2 = safeLuma(baseUv + vec2(-d.x,  d.y));
  float l3 = safeLuma(baseUv + vec2( d.x,  d.y));
  float avgL = 0.25 * (l0 + l1 + l2 + l3);
  float logL = clamp(log2(max(avgL, 0.0005)), -10.0, 6.5);
  vec2 p = baseUv - vec2(0.5);
  float wCenter = mix(0.32, 1.0, exp(-dot(p, p) * 4.8));
  float brightCover = smoothstep(0.18, 0.42, avgL);
  gl_FragColor = vec4(logL, wCenter, brightCover, 1.0);
}`;

// 1x1 Temporal Eye Adaptation ping-pong pass (single pixel per frame, zero CPU stalls)
const EXP_ADAPT_FRAG = /* glsl */ `
uniform sampler2D tMeter;
uniform sampler2D tPrev;
uniform float uDt;
uniform float uBrightTau;
uniform float uDarkTau;
uniform float uStrength;
uniform float uCompEv;
uniform float uMinExp;
uniform float uMaxExp;
uniform float uDeadband;
uniform float uReset;
uniform float uEnabled;
varying vec2 vUv;

void main() {
  vec4 prev = texture2D(tPrev, vec2(0.5));
  float prevExp = (prev.r >= 0.05 && prev.r <= 8.0) ? prev.r : 1.0;

  if (uEnabled < 0.5) {
    float baseExp = clamp(exp2(uCompEv), 0.15, 4.0);
    gl_FragColor = vec4(baseExp, 0.24, baseExp, 0.0);
    return;
  }

  float sumW = 0.0;
  float sumLog = 0.0;
  float brightCovW = 0.0;
  for (int iy = 0; iy < 12; iy++) {
    float vy = (float(iy) + 0.5) / 12.0;
    for (int ix = 0; ix < 12; ix++) {
      float vx = (float(ix) + 0.5) / 12.0;
      vec4 m = texture2D(tMeter, vec2(vx, vy));
      sumLog += m.r * m.g;
      brightCovW += m.b * m.g;
      sumW += m.g;
    }
  }
  float roughLog = sumLog / max(sumW, 0.001);
  float brightFrac = brightCovW / max(sumW, 0.001);

  // Robust outlier rejection: suppress tiny isolated ceiling bulbs / flashlight glints
  // while letting wide sunlit windows or bright halls dominate normally.
  float rSumW = 0.0;
  float rSumLog = 0.0;
  float spikeTol = mix(1.8, 3.8, smoothstep(0.05, 0.22, brightFrac));
  for (int iy = 0; iy < 12; iy++) {
    float vy = (float(iy) + 0.5) / 12.0;
    for (int ix = 0; ix < 12; ix++) {
      float vx = (float(ix) + 0.5) / 12.0;
      vec4 m = texture2D(tMeter, vec2(vx, vy));
      float diff = m.r - roughLog;
      float outlierW = diff > spikeTol ? mix(0.16, 1.0, smoothstep(0.08, 0.26, brightFrac)) : 1.0;
      float lowOutlierW = diff < -3.2 ? 0.45 : 1.0;
      float w = m.g * outlierW * lowOutlierW;
      rSumLog += m.r * w;
      rSumW += w;
    }
  }

  float robustLog = rSumLog / max(rSumW, 0.001);
  float sceneLuma = clamp(exp2(robustLog), 0.002, 48.0);

  // Physically inspired Stevens-compressed EV exposure curve calibrated to linear PBR luminance:
  // Normal indoor corridor (~0.10-0.12) ~ 1.0x; deep dark tunnel (~0.025) lifts up to maxExp;
  // bright sunlit Poolrooms hall/windows (~0.25-0.75) adapt smoothly down without blowing out details.
  float rawExp = pow(0.115 / max(sceneLuma, 0.008), 0.68) * exp2(uCompEv);
  float clampedRaw = clamp(rawExp, uMinExp, uMaxExp);
  float strengthExp = uStrength <= 1.0
    ? mix(1.0, clampedRaw, max(uStrength, 0.0))
    : clamp(pow(max(clampedRaw, 0.05), uStrength), max(0.18, uMinExp * 0.80), min(4.8, uMaxExp * 1.18));

  float delta = abs(strengthExp - prevExp);
  float deadbandScale = smoothstep(uDeadband * 0.25, uDeadband * 1.65, delta);
  float tau = (strengthExp < prevExp) ? max(uBrightTau, 0.05) : max(uDarkTau, 0.05);
  float alpha = 1.0 - exp(-clamp(uDt, 0.0, 0.12) / tau);
  float nextExp = uReset > 0.005
    ? mix(prevExp, strengthExp, clamp(uReset, 0.0, 1.0))
    : mix(prevExp, strengthExp, clamp(alpha * mix(0.15, 1.0, deadbandScale), 0.0, 1.0));
  nextExp = clamp(nextExp, max(0.15, uMinExp * 0.75), min(5.0, uMaxExp * 1.25));

  gl_FragColor = vec4(nextExp, sceneLuma, strengthExp, brightFrac);
}`;

const EXP_APPLY_FRAG = /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tAdapt;
uniform float uEnabled;
uniform float uBrightness;
uniform float uCompEv;
varying vec2 vUv;

void main() {
  vec4 src = texture2D(tInput, vUv);
  vec4 ad = texture2D(tAdapt, vec2(0.5));
  float expMul = uEnabled > 0.5 ? ad.r : exp2(uCompEv);
  float safeExp = (expMul >= 0.05 && expMul <= 8.0) ? expMul : 1.0;
  vec3 col = max(src.rgb, vec3(0.0)) * safeExp * max(uBrightness, 0.1);
  gl_FragColor = vec4(col, src.a);
}`;

const EXP_READBACK_FRAG = /* glsl */ `
uniform sampler2D tAdapt;
void main() {
  vec4 ad = texture2D(tAdapt, vec2(0.5));
  gl_FragColor = vec4(
    clamp(ad.r / 4.5, 0.0, 1.0),
    clamp(ad.g / 6.0, 0.0, 1.0),
    clamp(ad.b / 4.5, 0.0, 1.0),
    clamp(ad.a, 0.0, 1.0)
  );
}`;

export class AdaptiveExposurePass extends Pass {
  constructor() {
    super('AdaptiveExposurePass');
    this.needsSwap = true;
    this.eyeEnabled = true;
    this._resetVal = 0.0;
    this._meterRT = null;
    this._adaptRT = null;
    this._readbackRT = null;
    this._ping = 0;

    this._meterMat = new THREE.ShaderMaterial({
      vertexShader: EXP_METER_VERT,
      fragmentShader: EXP_METER_FRAG,
      uniforms: {
        tInput: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 1280, 1 / 720) }
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this._adaptMat = new THREE.ShaderMaterial({
      vertexShader: EXP_METER_VERT,
      fragmentShader: EXP_ADAPT_FRAG,
      uniforms: {
        tMeter: { value: null },
        tPrev: { value: null },
        uDt: { value: 0.016 },
        uBrightTau: { value: 0.75 },
        uDarkTau: { value: 2.35 },
        uStrength: { value: 1.0 },
        uCompEv: { value: 0.0 },
        uMinExp: { value: 0.42 },
        uMaxExp: { value: 2.45 },
        uDeadband: { value: 0.015 },
        uReset: { value: 0.0 },
        uEnabled: { value: 1.0 }
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this._initMat = new THREE.ShaderMaterial({
      vertexShader: EXP_METER_VERT,
      fragmentShader: 'void main(){gl_FragColor=vec4(1.0,0.24,1.0,0.0);}',
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this._applyMat = new THREE.ShaderMaterial({
      vertexShader: EXP_METER_VERT,
      fragmentShader: EXP_APPLY_FRAG,
      uniforms: {
        tInput: { value: null },
        tAdapt: { value: null },
        uEnabled: { value: 1.0 },
        uBrightness: { value: 1.0 },
        uCompEv: { value: 0.0 }
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this._readbackMat = new THREE.ShaderMaterial({
      vertexShader: EXP_METER_VERT,
      fragmentShader: EXP_READBACK_FRAG,
      uniforms: { tAdapt: { value: null } },
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.fullscreenMaterial = this._applyMat;
  }

  _ensureTargets(renderer) {
    if (this._meterRT) return;
    const rtOpts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false
    };
    this._meterRT = new THREE.WebGLRenderTarget(12, 12, rtOpts);
    this._adaptRT = [
      new THREE.WebGLRenderTarget(1, 1, rtOpts),
      new THREE.WebGLRenderTarget(1, 1, rtOpts)
    ];
    this._ping = 0;
    const prevTarget = renderer.getRenderTarget();
    this.fullscreenMaterial = this._initMat;
    renderer.setRenderTarget(this._adaptRT[0]);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(this._adaptRT[1]);
    renderer.render(this.scene, this.camera);
    this.fullscreenMaterial = this._applyMat;
    renderer.setRenderTarget(prevTarget);
  }

  configure(cfg = {}) {
    this.eyeEnabled = cfg.enabled !== false;
    const au = this._adaptMat.uniforms;
    const apu = this._applyMat.uniforms;
    au.uEnabled.value = this.eyeEnabled ? 1.0 : 0.0;
    au.uBrightTau.value = THREE.MathUtils.clamp(Number(cfg.brightSpeed ?? 0.75), 0.15, 3.0);
    au.uDarkTau.value = THREE.MathUtils.clamp(Number(cfg.darkSpeed ?? 2.35), 0.35, 6.5);
    au.uStrength.value = THREE.MathUtils.clamp(Number(cfg.strength ?? 1.0), 0.0, 2.0);
    au.uCompEv.value = THREE.MathUtils.clamp(Number(cfg.comp ?? 0.0), -2.0, 2.0);
    const minExp = THREE.MathUtils.clamp(Number(cfg.minExp ?? 0.42), 0.15, 1.0);
    const maxExp = Math.max(minExp + 0.15, THREE.MathUtils.clamp(Number(cfg.maxExp ?? 2.45), 1.0, 4.5));
    au.uMinExp.value = minExp;
    au.uMaxExp.value = maxExp;
    apu.uEnabled.value = this.eyeEnabled ? 1.0 : 0.0;
    apu.uBrightness.value = THREE.MathUtils.clamp(Number(cfg.brightness ?? 1.0), 0.35, 2.5);
    apu.uCompEv.value = au.uCompEv.value;
  }

  requestReset(snapFraction = 0.85) {
    this._resetVal = Math.max(this._resetVal, THREE.MathUtils.clamp(snapFraction, 0, 1));
  }

  setSize(w, h) {
    this._meterMat.uniforms.uTexelSize.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
  }

  render(renderer, inputBuffer, outputBuffer, deltaTime) {
    this._ensureTargets(renderer);
    if (this.eyeEnabled && inputBuffer) {
      this._meterMat.uniforms.tInput.value = inputBuffer.texture;
      this.fullscreenMaterial = this._meterMat;
      renderer.setRenderTarget(this._meterRT);
      renderer.render(this.scene, this.camera);

      const prevRT = this._adaptRT[this._ping];
      const nextIdx = 1 - this._ping;
      const nextRT = this._adaptRT[nextIdx];
      const au = this._adaptMat.uniforms;
      au.tMeter.value = this._meterRT.texture;
      au.tPrev.value = prevRT.texture;
      au.uDt.value = THREE.MathUtils.clamp(deltaTime || 0.016, 0.001, 0.12);
      au.uReset.value = this._resetVal;
      this.fullscreenMaterial = this._adaptMat;
      renderer.setRenderTarget(nextRT);
      renderer.render(this.scene, this.camera);
      this._ping = nextIdx;
      this._resetVal = 0.0;
    }

    this._applyMat.uniforms.tInput.value = inputBuffer ? inputBuffer.texture : null;
    this._applyMat.uniforms.tAdapt.value = this._adaptRT[this._ping].texture;
    this.fullscreenMaterial = this._applyMat;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  async readStateAsync(renderer) {
    if (!renderer || !this._adaptRT) return null;
    if (!this._readbackRT) {
      this._readbackRT = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false
      });
    }
    const prevTarget = renderer.getRenderTarget();
    this._readbackMat.uniforms.tAdapt.value = this._adaptRT[this._ping].texture;
    this.fullscreenMaterial = this._readbackMat;
    renderer.setRenderTarget(this._readbackRT);
    renderer.render(this.scene, this.camera);
    this.fullscreenMaterial = this._applyMat;
    renderer.setRenderTarget(prevTarget);
    const buf = new Uint8Array(4);
    await renderer.readRenderTargetPixelsAsync(this._readbackRT, 0, 0, 1, 1, buf);
    return {
      enabled: this.eyeEnabled,
      adaptedExp: +(buf[0] / 255 * 4.5).toFixed(3),
      meteredLuma: +(buf[1] / 255 * 6.0).toFixed(4),
      targetExp: +(buf[2] / 255 * 4.5).toFixed(3),
      brightFraction: +(buf[3] / 255).toFixed(3)
    };
  }

  disposePermanent() {
    this._meterRT?.dispose();
    this._adaptRT?.[0]?.dispose();
    this._adaptRT?.[1]?.dispose();
    this._readbackRT?.dispose();
    this._meterMat.dispose();
    this._adaptMat.dispose();
    this._initMat.dispose();
    this._applyMat.dispose();
    this._readbackMat.dispose();
    this._meterRT = null;
    this._adaptRT = null;
    this._readbackRT = null;
    super.dispose();
  }
}

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
uniform float uSoftDefocus;
uniform float uTaaMix;
uniform float uEdgeAa;
uniform float uExternalAa;
uniform float uLensSoftness;
uniform float uHasHistory;
uniform vec2 uTexelSize;
uniform vec2 uBufferRes;
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

  float mbEnabled = step(0.5, uEnabled);
  float turnMask = clamp(uTurnMix, 0.0, 1.0) * mbEnabled;
  float shakeMask = clamp(uShakeMix, 0.0, 1.0) * mbEnabled;

  // 1. Real 3D Depth-Buffer Camera Reprojection Velocity (works for ALL camera motion: mouse turn, WASD move, inertia, shake, any FPS)
  vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 prevClip = uReprojMatrix * clipPos;
  vec2 rawReproj = vec2(0.0);
  vec2 reprojPrevUV = uv;
  bool hasPrevReproj = prevClip.w > 0.0002;
  if (hasPrevReproj && uHasHistory > 0.5) {
    reprojPrevUV = (prevClip.xy / prevClip.w) * 0.5 + 0.5;
    rawReproj = clamp(reprojPrevUV - uv, vec2(-0.35), vec2(0.35));
  }

  // Keep immediate FP handheld flashlight/claws near <0.4m crisp while world walls/props >=0.4m receive full motion blur
  float nearWorldMask = mix(0.20, 1.0, smoothstep(0.18, 0.42, viewDistM));
  vec2 baseReprojTrail = rawReproj * (uShutterScale * 0.62 * nearWorldMask * uMBlurPower * mbEnabled);

  // 2. Angular velocity fallback for first history frame or ultra-fast synthetic whip-pans
  float turnEdgeMask = mix(0.85, 1.35, smoothstep(0.05, 0.50, dist));
  vec2 rotTrail = uVelocity * turnEdgeMask * turnMask;
  float rotComplement = 1.0 - smoothstep(0.002, 0.012, length(rawReproj));
  vec2 turnTrail = baseReprojTrail + rotTrail * (uMBlurPower * 0.45 * rotComplement);

  float shakeEdgeMask = mix(0.75, 1.15, smoothstep(0.08, 0.50, dist));
  float shakeCloseEase = mix(0.65, 1.0, smoothstep(0.50, 2.0, viewDistM));
  vec2 shakeTrail = uShakeVelocity * shakeEdgeMask * shakeMask * shakeCloseEase;

  float cornerEdge = smoothstep(0.38, 0.68, dist);
  vec2 radialInward = dist > 0.0001 ? -normalize(centered) * (dist * uSpeedBlur * cornerEdge * mbEnabled) : vec2(0.0);

  vec2 totalTrail = turnTrail + shakeTrail + radialInward;
  float rawMag = length(totalTrail);
  float softCap = clamp(0.055 + 0.032 * min(uMBlurPower, 3.6), 0.055, 0.165);
  float mag = rawMag > 0.00001 ? softCap * (rawMag / (rawMag + softCap * 0.72)) : 0.0;
  if (rawMag > 0.00001) totalTrail *= (mag / rawMag);

  // Early exit when motion blur, distant DoF, soft optical defocus, TAA softness, fallback edge AA, and lens softness are all off
  float activeFallbackEdgeAa = (uExternalAa < 0.5) ? uEdgeAa : 0.0;
  if (mag < 0.0012 && dofCurve < 0.0015 && uSoftDefocus < 0.001 && uTaaMix < 0.001 && activeFallbackEdgeAa < 0.001 && uLensSoftness < 0.001) {
    outputColor = inputColor;
    return;
  }

  vec3 blurred = inputColor.rgb;
  if (mag >= 0.0012 || dofCurve >= 0.0015) {
    vec4 accum = inputColor;
    float totalWeight = 1.0;
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy + vec2(uSpeedBlur * 47.0, uVelocity.x * 131.0), vec2(0.06711056, 0.00583715))));
    const int SAMPLES = 28;
    float aspectInv = 1.0 / max(uAspect, 0.5);
    float dofRad = 0.042 * dofCurve;
    float dofMotionFade = 1.0 - smoothstep(0.0025, 0.016, mag);
    float dofGate = smoothstep(0.0, 0.14, dofCurve) * dofMotionFade;

    for (int i = 1; i <= SAMPLES; i++) {
      float fi = float(i);
      float uStep = (fi - 0.5 + (ign - 0.5) * 0.85) / float(SAMPLES);
      float tMotion = mix(-0.32, 0.68, uStep);
      // Golden-Angle Poisson Bokeh disc spread for silky-smooth >15m distance optical blur when stationary/slow
      float ang = fi * 2.3999632 + ign * 6.28318;
      float rDisc = sqrt((fi - 0.35) / float(SAMPLES));
      vec2 bokehOffset = vec2(cos(ang) * aspectInv, sin(ang)) * (dofRad * rDisc * dofMotionFade);
      vec2 motionOffset = totalTrail * tMotion;

      vec2 suv = clamp(uv + motionOffset + bokehOffset, vec2(0.002), vec2(0.998));
      vec4 sCol = texture2D(inputBuffer, suv);

      // Continuous foreground bleed-guard so 15m transition never forms hard cutout seams
      float bleedGuard = 1.0;
      if (dofGate > 0.005) {
        float sDistM = linearizeDist(min(readDepth(suv), 0.9994), uCamNear, uCamFar);
        float bleedMask = mix(0.06, 1.0, smoothstep(12.0, 20.5, sDistM));
        bleedGuard = mix(1.0, bleedMask, dofGate);
      }

      // Uniform shutter-window weighting across dark walls, midtones, and highlights alike
      float winW = max(1.0 - abs(tMotion - 0.18) * 0.55, 0.25);
      float w = winW * bleedGuard;
      accum += sCol * w;
      totalWeight += w;
    }
    blurred = accum.rgb / max(totalWeight, 0.0001);
  }

  // Stage A Fallback: Subpixel Directional Edge Anti-Aliasing (skipped when dedicated SMAA/FXAA/MSAA pass is active)
  if (activeFallbackEdgeAa > 0.001) {
    vec2 pxAa = max(uTexelSize, vec2(0.0005));
    vec3 cN = texture2D(inputBuffer, clamp(uv + vec2(0.0, pxAa.y), vec2(0.002), vec2(0.998))).rgb;
    vec3 cS = texture2D(inputBuffer, clamp(uv - vec2(0.0, pxAa.y), vec2(0.002), vec2(0.998))).rgb;
    vec3 cE = texture2D(inputBuffer, clamp(uv + vec2(pxAa.x, 0.0), vec2(0.002), vec2(0.998))).rgb;
    vec3 cW = texture2D(inputBuffer, clamp(uv - vec2(pxAa.x, 0.0), vec2(0.002), vec2(0.998))).rgb;
    vec3 cNE = texture2D(inputBuffer, clamp(uv + pxAa, vec2(0.002), vec2(0.998))).rgb;
    vec3 cNW = texture2D(inputBuffer, clamp(uv + vec2(-pxAa.x, pxAa.y), vec2(0.002), vec2(0.998))).rgb;
    vec3 cSE = texture2D(inputBuffer, clamp(uv + vec2(pxAa.x, -pxAa.y), vec2(0.002), vec2(0.998))).rgb;
    vec3 cSW = texture2D(inputBuffer, clamp(uv - pxAa, vec2(0.002), vec2(0.998))).rgb;
    const vec3 kLuma = vec3(0.299, 0.587, 0.114);
    float lC = dot(blurred, kLuma);
    float lN = dot(cN, kLuma);
    float lS = dot(cS, kLuma);
    float lE = dot(cE, kLuma);
    float lW = dot(cW, kLuma);
    float lNE = dot(cNE, kLuma);
    float lNW = dot(cNW, kLuma);
    float lSE = dot(cSE, kLuma);
    float lSW = dot(cSW, kLuma);
    float lMin = min(lC, min(min(lN, lS), min(lE, lW)));
    float lMax = max(lC, max(max(lN, lS), max(lE, lW)));
    float lRange = lMax - lMin;
    vec2 grad = vec2(
      (lE - lW) + 0.5 * ((lNE - lNW) + (lSE - lSW)),
      (lN - lS) + 0.5 * ((lNE - lSE) + (lNW - lSW))
    );
    float gradLen = length(grad);
    if (lRange > 0.022 && gradLen > 0.001) {
      vec2 tangent = vec2(-grad.y, grad.x) / gradLen;
      vec2 uv1 = clamp(uv + tangent * pxAa * 0.55, vec2(0.002), vec2(0.998));
      vec2 uv2 = clamp(uv - tangent * pxAa * 0.55, vec2(0.002), vec2(0.998));
      vec2 uv3 = clamp(uv + tangent * pxAa * 1.25, vec2(0.002), vec2(0.998));
      vec2 uv4 = clamp(uv - tangent * pxAa * 1.25, vec2(0.002), vec2(0.998));
      float d1 = exp(-abs(min(readDepth(uv1), 0.9994) - depth) * 160.0);
      float d2 = exp(-abs(min(readDepth(uv2), 0.9994) - depth) * 160.0);
      float d3 = exp(-abs(min(readDepth(uv3), 0.9994) - depth) * 160.0) * 0.65;
      float d4 = exp(-abs(min(readDepth(uv4), 0.9994) - depth) * 160.0) * 0.65;
      vec3 aaSum = blurred * 0.8 + texture2D(inputBuffer, uv1).rgb * d1 + texture2D(inputBuffer, uv2).rgb * d2 + texture2D(inputBuffer, uv3).rgb * d3 + texture2D(inputBuffer, uv4).rgb * d4;
      float aaW = 0.8 + d1 + d2 + d3 + d4;
      vec3 aaCol = aaSum / max(aaW, 0.001);
      vec3 boxMin = min(blurred, min(min(cN, cS), min(cE, cW)));
      vec3 boxMax = max(blurred, max(max(cN, cS), max(cE, cW)));
      aaCol = clamp(aaCol, boxMin, boxMax);
      float edgeWeight = smoothstep(0.022, 0.24, lRange) * clamp(activeFallbackEdgeAa, 0.0, 1.0) * 0.78;
      blurred = mix(blurred, aaCol, edgeWeight);
    }
  }

  // Stage B: Separable Directional/Horizontal Subpixel Optical Lens Softness (0% - 300%) & Footage Defocus
  if (uLensSoftness > 0.001 || uSoftDefocus > 0.001) {
    bool isDream = uLensSoftness > 0.001;
    float softVal = clamp(uLensSoftness, 0.0, 3.2);
    float pxStep = isDream
      ? (0.42 + min(softVal, 1.5) * 0.42 + max(0.0, softVal - 1.5) * 0.65 + uSoftDefocus * 0.35)
      : (1.05 + uSoftDefocus * 1.95);
    vec2 pxL = max(uTexelSize, vec2(0.0005)) * pxStep;
    vec2 dL = pxL * 0.7071;
    vec2 luv0 = clamp(uv + vec2(pxL.x, 0.0), vec2(0.002), vec2(0.998));
    vec2 luv1 = clamp(uv - vec2(pxL.x, 0.0), vec2(0.002), vec2(0.998));
    vec2 luv2 = clamp(uv + vec2(0.0, pxL.y), vec2(0.002), vec2(0.998));
    vec2 luv3 = clamp(uv - vec2(0.0, pxL.y), vec2(0.002), vec2(0.998));
    vec2 luv4 = clamp(uv + dL, vec2(0.002), vec2(0.998));
    vec2 luv5 = clamp(uv - dL, vec2(0.002), vec2(0.998));
    vec2 luv6 = clamp(uv + vec2(dL.x, -dL.y), vec2(0.002), vec2(0.998));
    vec2 luv7 = clamp(uv + vec2(-dL.x, dL.y), vec2(0.002), vec2(0.998));
    float dGate = isDream ? mix(130.0, 52.0, smoothstep(0.65, 3.0, softVal)) : 0.0;
    float w0 = isDream ? exp(-abs(min(readDepth(luv0), 0.9994) - depth) * dGate) : 1.0;
    float w1 = isDream ? exp(-abs(min(readDepth(luv1), 0.9994) - depth) * dGate) : 1.0;
    float w2 = isDream ? exp(-abs(min(readDepth(luv2), 0.9994) - depth) * dGate) : 1.0;
    float w3 = isDream ? exp(-abs(min(readDepth(luv3), 0.9994) - depth) * dGate) : 1.0;
    float w4 = (isDream ? exp(-abs(min(readDepth(luv4), 0.9994) - depth) * dGate) : 1.0) * 0.75;
    float w5 = (isDream ? exp(-abs(min(readDepth(luv5), 0.9994) - depth) * dGate) : 1.0) * 0.75;
    float w6 = (isDream ? exp(-abs(min(readDepth(luv6), 0.9994) - depth) * dGate) : 1.0) * 0.75;
    float w7 = (isDream ? exp(-abs(min(readDepth(luv7), 0.9994) - depth) * dGate) : 1.0) * 0.75;
    vec3 lensCol = blurred * 1.40
      + texture2D(inputBuffer, luv0).rgb * w0 + texture2D(inputBuffer, luv1).rgb * w1
      + texture2D(inputBuffer, luv2).rgb * w2 + texture2D(inputBuffer, luv3).rgb * w3
      + texture2D(inputBuffer, luv4).rgb * w4 + texture2D(inputBuffer, luv5).rgb * w5
      + texture2D(inputBuffer, luv6).rgb * w6 + texture2D(inputBuffer, luv7).rgb * w7;
    float lensW = 1.40 + w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7;
    float blendAmt = isDream
      ? clamp(softVal * 0.34 + max(0.0, softVal - 1.2) * 0.16 + uSoftDefocus * 0.16, 0.0, 0.86)
      : clamp(uSoftDefocus, 0.0, 0.78);
    blurred = mix(blurred, lensCol / max(lensW, 0.001), blendAmt);
  }

  // Motion-rejected temporal micro-stabilization (strict pixel velocity rejection prevents ghosting/smearing)
  if (uTaaMix > 0.001 && uHasHistory > 0.5 && hasPrevReproj &&
      reprojPrevUV.x >= 0.0 && reprojPrevUV.x <= 1.0 &&
      reprojPrevUV.y >= 0.0 && reprojPrevUV.y <= 1.0) {
    vec2 px = max(uTexelSize, vec2(0.0005));
    vec2 bufRes = max(uBufferRes, vec2(640.0, 360.0));
    vec2 histUv = clamp(reprojPrevUV, vec2(0.002), vec2(0.998));
    vec3 histCol = texture2D(uPrevFrame, histUv).rgb;
    vec3 n0 = texture2D(inputBuffer, clamp(uv + vec2(px.x, 0.0), vec2(0.002), vec2(0.998))).rgb;
    vec3 n1 = texture2D(inputBuffer, clamp(uv - vec2(px.x, 0.0), vec2(0.002), vec2(0.998))).rgb;
    vec3 n2 = texture2D(inputBuffer, clamp(uv + vec2(0.0, px.y), vec2(0.002), vec2(0.998))).rgb;
    vec3 n3 = texture2D(inputBuffer, clamp(uv - vec2(0.0, px.y), vec2(0.002), vec2(0.998))).rgb;
    vec3 cMin = min(blurred, min(min(n0, n1), min(n2, n3)));
    vec3 cMax = max(blurred, max(max(n0, n1), max(n2, n3)));
    vec3 margin = (cMax - cMin) * 0.10 + vec3(0.006);
    histCol = clamp(histCol, max(cMin - margin, vec3(0.0)), cMax + margin);
    float velPx = length((reprojPrevUV - uv) * bufRes);
    float motionReject = 1.0 - smoothstep(0.15, 1.35, velPx);
    float taaWeight = clamp(uTaaMix * motionReject * (uExternalAa > 0.5 ? 0.55 : 0.85), 0.0, 0.36);
    blurred = mix(blurred, histCol, taaWeight);
  }

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
uniform float uBaseGrain;
uniform float uGrainAmount;
uniform float uScanlineAmount;
uniform float uVignetteAmount;
uniform float uVhsStrength;
uniform float uPanic;
uniform float uIsKiller;
uniform float uIs43;
uniform vec2 uResolution;
uniform vec2 uBufferRes;
uniform float uCrtNear;
uniform float uCrtFar;
uniform float uStreamMix;
uniform float uSoftUpscale;
uniform float uSubResH;
uniform float uCaBoost;
uniform float uCompressAmt;
uniform float uAutoExpAmt;
uniform float uGradeHaze;
uniform float uSensorNoise;
uniform float uDisableSharpen;
uniform float uContrast;
uniform float uGamma;
uniform float uHue;
uniform float uSaturation;
uniform float uScanlineMask;
uniform float uCoolGrade;
uniform float uDaylightMix;
uniform float uBicubicMode;
uniform float uLensSoftness;
uniform float uHalationAmt;
uniform float uChromaSoftness;
uniform float uClarity;

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

// True 4x4 Cubic B-Spline hardware-bilinear upscaling (zero negative-lobe ringing/overshoot) + optical subpixel softness
vec3 sampleBicubicSoft(sampler2D buf, vec2 suv, vec2 subDims, float softness) {
  vec2 res = max(subDims, vec2(160.0));
  vec2 invRes = 1.0 / res;
  vec2 tc = suv * res - 0.5;
  vec2 iTc = floor(tc);
  vec2 f = tc - iTc;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;

  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) * (1.0 / 6.0);
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) * (1.0 / 6.0);
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) * (1.0 / 6.0);
  vec2 w3 = f3 * (1.0 / 6.0);

  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 h0 = ((iTc - 0.5 + w1 / max(g0, vec2(1e-5))) + 0.5) * invRes;
  vec2 h1 = ((iTc + 1.5 + w3 / max(g1, vec2(1e-5))) + 0.5) * invRes;

  vec3 s00 = texture2D(buf, clamp(vec2(h0.x, h0.y), vec2(0.004), vec2(0.996))).rgb;
  vec3 s10 = texture2D(buf, clamp(vec2(h1.x, h0.y), vec2(0.004), vec2(0.996))).rgb;
  vec3 s01 = texture2D(buf, clamp(vec2(h0.x, h1.y), vec2(0.004), vec2(0.996))).rgb;
  vec3 s11 = texture2D(buf, clamp(vec2(h1.x, h1.y), vec2(0.004), vec2(0.996))).rgb;
  vec3 row0 = mix(s10, s00, g0.x);
  vec3 row1 = mix(s11, s01, g0.x);
  return max(mix(row1, row0, g0.y), vec3(0.0));
}

// Smooth bilinear-tent & bicubic-spline reconstruction (zero nearest-neighbor stair-step quantization)
vec3 sampleSoftRes(sampler2D buf, vec2 suv, vec2 subDims, float softAmt) {
  if (uBicubicMode > 0.5) {
    return sampleBicubicSoft(buf, suv, subDims, clamp(uLensSoftness, 0.0, 1.5) * softAmt);
  }
  vec2 px = (0.48 / max(subDims, vec2(240.0))) * (0.65 + 0.50 * clamp(softAmt, 0.0, 1.0));
  vec3 cCenter = texture2D(buf, clamp(suv, vec2(0.006), vec2(0.994))).rgb;
  vec3 c0 = texture2D(buf, clamp(suv + vec2(px.x, px.y), vec2(0.006), vec2(0.994))).rgb;
  vec3 c1 = texture2D(buf, clamp(suv + vec2(-px.x, px.y), vec2(0.006), vec2(0.994))).rgb;
  vec3 c2 = texture2D(buf, clamp(suv + vec2(px.x, -px.y), vec2(0.006), vec2(0.994))).rgb;
  vec3 c3 = texture2D(buf, clamp(suv + vec2(-px.x, -px.y), vec2(0.006), vec2(0.994))).rgb;
  vec3 tent = cCenter * 0.40 + (c0 + c1 + c2 + c3) * 0.15;
  return max(mix(cCenter, tent, clamp(softAmt, 0.0, 1.0)), vec3(0.0));
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

  // 1. Strongly Curved Wide-Angle CRT/Camcorder Barrel Lens (0-150% classic CRT, 150-300% extreme fisheye bodycam)
  float scanAmt = max(uScanlineAmount, 0.0);
  float curveScale = clamp(uLensCurve, 0.0, 3.0);
  float extraCurve = clamp((curveScale - 1.5) / 1.5, 0.0, 1.0);
  float baseZoom = mix(1.0, mix(0.76, 0.70, uIs43), clamp(curveScale, 0.0, 1.0)) - extraCurve * mix(0.30, 0.32, uIs43);
  float lensPow = mix(0.66, 1.06, uIs43) * mix(1.0, 0.48, uIsKiller) * curveScale;
  float r4Term = r4 * lensPow * (0.58 + extraCurve * 0.45);
  vec2 cuv = mix(uv, vec2(0.5) + p * (baseZoom + r2 * lensPow + r4Term), clamp(curveScale, 0.0, 1.0));

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
  float hMask = clamp(uScanlineMask, 0.0, 1.0);
  float vhs = uVhsStrength * scanAmt;
  float sweep = sin(cuv.y * 7.0 - uTime * 2.4 + sin(uTime * 11.0));
  float sweepLine = smoothstep(0.965, 1.0, sweep);
  float bottomNoise = smoothstep(0.045, 0.0, cuv.y) * 0.65;
  float tearFreq = (0.00022 + sweepLine * 0.0065 + bottomNoise * 0.008 + uPanic * 0.016) * vhs * hMask * mix(1.0, 0.08, nearFocus);
  float lineNoise = (hash12(vec2(floor(cuv.y * 260.0), floor(uTime * 24.0))) - 0.5);
  float tearGate = smoothstep(0.00045, 0.0020, tearFreq);
  cuv.x = clamp(cuv.x + lineNoise * tearFreq * tearGate, 0.006, 0.994);

  // 3. Clean Optical Lens Dispersion + Soft Low-Res Upscale + Film Halation across HDR blurred inputBuffer
  vec2 clampedCuv = clamp(cuv, vec2(0.006), vec2(0.994));
  vec2 resPx = max(uResolution.xy, vec2(640.0, 360.0));
  vec2 bufPx = max(uBufferRes.xy, vec2(320.0, 180.0));
  float tgtH = clamp(uSubResH > 10.0 ? uSubResH : bufPx.y, 180.0, 1080.0);
  vec2 recDims = (uBicubicMode > 0.5) ? min(bufPx, vec2(max(tgtH * (resPx.x / resPx.y), 320.0), tgtH)) : vec2(max(tgtH * (resPx.x / resPx.y), 240.0), tgtH);
  vec2 subDims = max(recDims, vec2(240.0, 180.0));

  float streamCa = (0.00055 + r2 * 0.0022) * uCaBoost;
  float shift = ((0.00068 + r2 * 0.0030 + uPanic * 0.0026 * vhs) * scanAmt * mix(0.35, 1.0, clamp(curveScale, 0.0, 1.0)) + streamCa) * mix(1.0, 0.14 * (1.0 - clamp(uStreamMix * 0.85, 0.0, 0.85)), nearFocus);
  float softAmt = clamp(uSoftUpscale, 0.0, 1.0);
  vec3 col = vec3(0.0);
  if (softAmt > 0.01) {
    vec3 cCenter = sampleSoftRes(inputBuffer, clampedCuv, subDims, softAmt);
    if (uBicubicMode > 0.5) {
      float cR = shift > 0.00025 ? sampleBicubicSoft(inputBuffer, clamp(clampedCuv + vec2(shift, 0.0), vec2(0.006), vec2(0.994)), subDims, softAmt * 0.65).r : cCenter.r;
      float cB = shift > 0.00025 ? sampleBicubicSoft(inputBuffer, clamp(clampedCuv - vec2(shift, 0.0), vec2(0.006), vec2(0.994)), subDims, softAmt * 0.65).b : cCenter.b;
      col = max(vec3(cR, cCenter.g, cB), vec3(0.0));
    } else {
      float cR = sampleSoftRes(inputBuffer, clamp(clampedCuv + vec2(shift, 0.0), vec2(0.006), vec2(0.994)), subDims, softAmt * 0.65).r;
      float cB = sampleSoftRes(inputBuffer, clamp(clampedCuv - vec2(shift, 0.0), vec2(0.006), vec2(0.994)), subDims, softAmt * 0.65).b;
      col = max(vec3(cR, cCenter.g, cB), vec3(0.0));
    }
  } else {
    float colR = max(0.0, texture2D(inputBuffer, clamp(clampedCuv + vec2(shift, 0.0), vec2(0.006), vec2(0.994))).r);
    float colG = max(0.0, texture2D(inputBuffer, clampedCuv).g);
    float colB = max(0.0, texture2D(inputBuffer, clamp(clampedCuv - vec2(shift, 0.0), vec2(0.006), vec2(0.994))).b);
    col = vec3(colR, colG, colB);
  }

  // Vertical separable reconstruction soften stage (pairs cleanly with MotionBlur horizontal stage up to 300%)
  if (uLensSoftness > 0.65) {
    float vExtra = clamp((uLensSoftness - 0.65) / 2.35, 0.0, 1.0);
    float vStep = mix(0.9, 2.5, vExtra) / resPx.y;
    vec3 vA = max(texture2D(inputBuffer, clamp(clampedCuv + vec2(0.0, vStep), vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 vB = max(texture2D(inputBuffer, clamp(clampedCuv - vec2(0.0, vStep), vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    float lC0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float lVA = dot(vA, vec3(0.2126, 0.7152, 0.0722));
    float lVB = dot(vB, vec3(0.2126, 0.7152, 0.0722));
    float wVA = exp(-abs(lVA - lC0) * mix(1.4, 0.55, vExtra)) * 0.65;
    float wVB = exp(-abs(lVB - lC0) * mix(1.4, 0.55, vExtra)) * 0.65;
    vec3 vSoft = (col + vA * wVA + vB * wVB) / max(1.0 + wVA + wVB, 0.001);
    col = mix(col, vSoft, vExtra * 0.68);
  }

  // 3B. Clarity Enhancement (mid-frequency local contrast BEFORE Halation, Grain, Compression & Scanlines)
  if (abs(uClarity) > 0.005) {
    vec2 cl1 = 2.4 / resPx;
    vec2 cl2 = 5.4 / resPx;
    const vec3 kCl = vec3(0.2126, 0.7152, 0.0722);
    float cL = dot(col, kCl);
    float lN  = dot(max(texture2D(inputBuffer, clamp(clampedCuv + vec2(0.0, cl1.y), vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lS  = dot(max(texture2D(inputBuffer, clamp(clampedCuv - vec2(0.0, cl1.y), vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lE  = dot(max(texture2D(inputBuffer, clamp(clampedCuv + vec2(cl1.x, 0.0), vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lW  = dot(max(texture2D(inputBuffer, clamp(clampedCuv - vec2(cl1.x, 0.0), vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lNE = dot(max(texture2D(inputBuffer, clamp(clampedCuv + cl2 * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lSW = dot(max(texture2D(inputBuffer, clamp(clampedCuv - cl2 * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lNW = dot(max(texture2D(inputBuffer, clamp(clampedCuv + vec2(-cl2.x, cl2.y) * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lSE = dot(max(texture2D(inputBuffer, clamp(clampedCuv + vec2(cl2.x, -cl2.y) * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0)), kCl);
    float lMean = (lN + lS + lE + lW) * 0.15 + (lNE + lSW + lNW + lSE) * 0.10;
    float lSpan = max(max(lN, lS), max(lE, lW)) - min(min(lN, lS), min(lE, lW));
    float diff = cL - lMean;
    if (uClarity > 0.0) {
      float noiseGate = smoothstep(0.005, 0.026, abs(diff));
      float haloGuard = 1.0 - smoothstep(0.20, 0.65, lSpan);
      float shaped = diff / (1.0 + abs(diff) * 3.6);
      float newL = max(cL + shaped * clamp(uClarity, 0.0, 1.0) * 1.24 * noiseGate * mix(0.28, 1.0, haloGuard), 0.0);
      float ratio = clamp(newL / max(cL, 0.002), 0.40, 1.75);
      col = max(col * ratio, vec3(0.0));
    } else {
      float silGuard = 1.0 - smoothstep(0.24, 0.75, lSpan) * 0.55;
      float newL = max(mix(cL, lMean, clamp(-uClarity, 0.0, 1.0) * 0.72 * silGuard), 0.0);
      float ratio = clamp(newL / max(cL, 0.002), 0.42, 1.55);
      col = max(col * ratio, vec3(0.0));
    }
  }

  // Selective Optical Highlight Halation (extended up to 250%, strict luminance selectivity without white borders)
  if (uHalationAmt > 0.001) {
    float halGain = clamp(uHalationAmt, 0.0, 2.8);
    vec2 outPx = 1.0 / resPx;
    float halSpread = 1.0 + max(0.0, halGain - 0.25) * 0.42;
    vec2 r1 = outPx * (1.35 * halSpread);
    vec2 r2h = outPx * (2.85 * halSpread);
    const vec3 kHalLuma = vec3(0.2126, 0.7152, 0.0722);
    vec3 hAccum = vec3(0.0);
    vec3 hs0 = max(texture2D(inputBuffer, clamp(clampedCuv + vec2(r1.x, 0.0), vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs1 = max(texture2D(inputBuffer, clamp(clampedCuv - vec2(r1.x, 0.0), vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs2 = max(texture2D(inputBuffer, clamp(clampedCuv + vec2(0.0, r1.y), vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs3 = max(texture2D(inputBuffer, clamp(clampedCuv - vec2(0.0, r1.y), vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs4 = max(texture2D(inputBuffer, clamp(clampedCuv + r2h * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs5 = max(texture2D(inputBuffer, clamp(clampedCuv - r2h * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs6 = max(texture2D(inputBuffer, clamp(clampedCuv + vec2(r2h.x, -r2h.y) * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    vec3 hs7 = max(texture2D(inputBuffer, clamp(clampedCuv + vec2(-r2h.x, r2h.y) * 0.7071, vec2(0.006), vec2(0.994))).rgb, vec3(0.0));
    hAccum += hs0 * smoothstep(0.60, 1.52, dot(hs0, kHalLuma)) * 0.15;
    hAccum += hs1 * smoothstep(0.60, 1.52, dot(hs1, kHalLuma)) * 0.15;
    hAccum += hs2 * smoothstep(0.60, 1.52, dot(hs2, kHalLuma)) * 0.15;
    hAccum += hs3 * smoothstep(0.60, 1.52, dot(hs3, kHalLuma)) * 0.15;
    hAccum += hs4 * smoothstep(0.60, 1.52, dot(hs4, kHalLuma)) * 0.10;
    hAccum += hs5 * smoothstep(0.60, 1.52, dot(hs5, kHalLuma)) * 0.10;
    hAccum += hs6 * smoothstep(0.60, 1.52, dot(hs6, kHalLuma)) * 0.10;
    hAccum += hs7 * smoothstep(0.60, 1.52, dot(hs7, kHalLuma)) * 0.10;
    vec3 warmEmulsion = vec3(1.12, 0.80, 0.56);
    vec3 coolEmulsion = vec3(0.78, 0.97, 1.06);
    vec3 optHalTint = mix(warmEmulsion, coolEmulsion, clamp(uCoolGrade, 0.0, 1.0));
    col += hAccum * optHalTint * (0.42 * halGain);
  } else {
    // Subtle Analog Camcorder Halation (warm amber-red bloom rim around bright fluorescent tubes)
    vec2 halStep = vec2(0.0032, 0.0022);
    vec3 halSample = 0.25 * (
      texture2D(inputBuffer, clamp(clampedCuv + halStep, vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv - halStep, vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(halStep.x, -halStep.y), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(-halStep.x, halStep.y), vec2(0.006), vec2(0.994))).rgb
    );
    float halLuma = dot(halSample, vec3(0.299, 0.587, 0.114));
    vec3 halTint = mix(vec3(1.0, 0.48, 0.16), vec3(0.75, 0.96, 1.0), clamp(uCoolGrade, 0.0, 1.0));
    col += halTint * smoothstep(0.72, 1.85, halLuma) * 0.14 * clamp(uCrtAmount, 0.0, 1.0);
  }

  // Bypass close-up sharpening whenever low-res Footage / Stream filter is active (sharpen near zero)
  if (nearFocus > 0.01 && uDisableSharpen < 0.5) {
    vec2 pxStep = 1.0 / resPx;
    vec3 nb = 0.25 * (
      texture2D(inputBuffer, clamp(clampedCuv + vec2(pxStep.x, 0.0), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv - vec2(pxStep.x, 0.0), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(0.0, pxStep.y), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv - vec2(0.0, pxStep.y), vec2(0.006), vec2(0.994))).rgb
    );
    vec3 sharpDelta = clamp(col - nb, vec3(-0.24), vec3(0.24));
    col = max(vec3(0.0), col + sharpDelta * (nearFocus * 0.82));
  }

  // 4. HDR Color Grade, Auto-Exposure Instability & Filmic ACES Tone Mapping
  float autoExpDrift = (sin(uTime * 1.15) * 0.5 + sin(uTime * 2.7 + 1.3) * 0.3 + sin(uTime * 6.4) * 0.2) * 0.10 * clamp(uAutoExpAmt, 0.0, 1.6);
  float uneasyBreathe = max(0.55, mix(1.0 + sin(uTime * 0.68) * 0.025 + sin(uTime * 2.1) * 0.012 * uPanic, 1.0, uIsKiller) * (1.0 + autoExpDrift));
  col = pow(max(col * uneasyBreathe, vec3(0.0)), vec3(1.04 + clamp(uGradeHaze, 0.0, 1.8) * 0.05));

  float preLumaHdr = dot(col, vec3(0.299, 0.587, 0.114));
  float coolMix = clamp(uCoolGrade, 0.0, 1.0);
  vec3 deepAmberShadow = mix(vec3(0.82, 0.66, 0.24), vec3(0.82, 0.93, 0.92), coolMix);
  vec3 sicklyYellowHi = mix(vec3(1.26, 1.08, 0.48), vec3(1.03, 1.05, 1.01), coolMix);
  vec3 grade = mix(deepAmberShadow, sicklyYellowHi, smoothstep(0.03, 0.58, preLumaHdr));
  col *= grade;

  if (uIsKiller > 0.5) {
    col *= vec3(1.10, 0.92, 0.80);
  }
  col = mix(col, col * vec3(1.24, 0.76, 0.62), uPanic * 0.52);

  // Subtle footage haze / highlight clip push / slight cool-fluorescent tint
  float hazeAmt = clamp(uGradeHaze, 0.0, 2.4);
  if (hazeAmt > 0.01) {
    col += vec3(0.008, 0.009, 0.011) * min(hazeAmt, 1.6);
    col *= mix(vec3(1.0), vec3(0.97, 1.01, 0.99), min(hazeAmt * 0.45, 0.72));
    col *= 1.0 + 0.04 * min(hazeAmt, 2.0);
  }

  // Filmic ACES rolloff
  col *= 0.84;
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), vec3(0.0), vec3(1.0));

  // 4A. Film & Camera Grain Layers
  // (a) Bright-light highlight optical grain (grain -> uGrainAmount)
  float preLuma = dot(col, vec3(0.299, 0.587, 0.114));
  float lightGrainBoost = smoothstep(0.24, 0.86, preLuma);
  vec2 rotPx = mat2(0.8, -0.6, 0.6, 0.8) * (clampedCuv * resPx);
  float tSeedA = floor(fract(uTime * 0.73) * 48.0);
  float tSeedB = floor(fract(uTime * 0.59 + 0.37) * 48.0);
  float gRoundA = roundGrainLayer(clampedCuv * resPx * 0.72, tSeedA);
  float gRoundB = roundGrainLayer(rotPx * 1.24, tSeedB);
  float gMix = clamp((gRoundA * 0.56 + gRoundB * 0.44) * 0.55, -0.55, 0.55);
  float grainMul = max(uGrainAmount, 0.0);
  if (grainMul > 0.005) {
    float hiBase = (mix(0.048, 0.026, uIsKiller) + uPanic * 0.048) * grainMul;
    float closeGrainEase = mix(1.0, 0.24, nearFocus);
    float lightGrain = hiBase * (0.22 + lightGrainBoost * 5.8) * closeGrainEase;
    float darkBite = max(0.0, -gMix) * lightGrainBoost * mix(0.62, 0.32, uIsKiller) * min(grainMul, 1.5) * mix(1.0, 0.16, nearFocus);
    vec3 grainTint = mix(vec3(1.12, 1.00, 0.76), vec3(0.95, 1.00, 1.05), clamp(uCoolGrade, 0.0, 1.0));
    col = clamp(col * max(0.28, 1.0 - darkBite) + vec3(gMix) * lightGrain * grainTint, vec3(0.0), vec3(1.0));
  }

  // (b) Always-present uniform basic full-screen film/sensor grain (baseGrain -> uBaseGrain, independent of lights)
  float baseGrainAmt = max(uBaseGrain, 0.0);
  if (baseGrainAmt > 0.005) {
    float bgLuma = dot(col, vec3(0.299, 0.587, 0.114));
    vec2 bgPx = clampedCuv * max(resPx, vec2(640.0, 360.0));
    float bgTick = floor(uTime * 24.0);
    vec3 bgRandA = hash32(floor(bgPx) + vec2(bgTick * 17.3, bgTick * 31.7)) - 0.5;
    vec3 bgRandB = hash32(floor(bgPx * 0.55) + vec2(bgTick * 23.1 + 7.9, bgTick * 13.7 + 3.1)) - 0.5;
    float bgNoise = bgRandA.x * 0.68 + bgRandB.y * 0.32;
    float bgShadowLift = mix(0.90, 1.12, 1.0 - smoothstep(0.05, 0.55, bgLuma));
    float bgBlackGuard = mix(0.45, 1.0, smoothstep(0.002, 0.032, bgLuma));
    float bgAmp = (0.044 + uPanic * 0.030) * baseGrainAmt * mix(1.0, 0.48, nearFocus) * bgBlackGuard;
    vec3 bgChroma = (bgRandA - vec3(dot(bgRandA, vec3(0.3333)))) * (0.016 * baseGrainAmt * mix(0.40, 1.0, 1.0 - smoothstep(0.08, 0.65, bgLuma)) * bgBlackGuard);
    col = clamp(col + vec3(bgNoise * bgAmp * bgShadowLift) + bgChroma, vec3(0.0), vec3(1.0));
  }

  // (c) Footage-preset digital sensor low-light noise (scaled directly by user's Base Grain setting)
  if (uSensorNoise > 0.005 && baseGrainAmt > 0.005) {
    vec2 nGrid = floor(clampedCuv * max(resPx, vec2(640.0, 360.0)) * 0.92);
    float tTick = floor(uTime * 24.0);
    vec3 n3 = hash32(nGrid + vec2(tTick * 19.1, tTick * 7.3)) - 0.5;
    float pLuma = dot(col, vec3(0.299, 0.587, 0.114));
    float darkZone = 1.0 - smoothstep(0.03, 0.44, pLuma);
    float sensScale = uSensorNoise * min(baseGrainAmt, 1.6);
    float lumaN = (n3.x * 0.65 + n3.y * 0.35) * (0.022 + darkZone * 0.044) * sensScale;
    vec3 chromaN = (n3 - vec3(dot(n3, vec3(0.3333)))) * (darkZone * 0.046 * sensScale);
    col = clamp(col + vec3(lumaN) + chromaN, vec3(0.0), vec3(1.0));
  }

  // VHS horizontal tape snow spikes on tracking / Entity proximity (calmed over close-up inspection)
  float snowTrigger = smoothstep(0.92 - uPanic * 0.25, 1.0, hash12(vec2(cuv.x * 180.0, floor(cuv.y * 220.0 + uTime * 42.0))));
  col += vec3(0.75, 0.68, 0.42) * snowTrigger * (0.045 + sweepLine * 0.09 + uPanic * 0.22) * vhs * hMask * mix(1.0, 0.14, nearFocus);

  // Bounded [0,1] contrast S-curve + footage crushed shadows / clipped highlights
  float sCurveWeight = clamp(0.24 + hazeAmt * 0.14, 0.24, 0.44);
  col = mix(col, col * col * (3.0 - 2.0 * col), sCurveWeight);
  if (hazeAmt > 0.01) {
    float cLuma = dot(col, vec3(0.299, 0.587, 0.114));
    float toeCrush = smoothstep(0.0, 0.16 * min(hazeAmt, 1.2), cLuma);
    col *= mix(1.0, mix(0.84, 1.0, toeCrush), min(hazeAmt * 0.7, 0.85));
  }

  // 4B. Analog YCbCr Chroma Softness (softens color bleed while keeping luma edges intact)
  if (uChromaSoftness > 0.005) {
    vec2 cOff = 2.0 / max(subDims, vec2(240.0));
    vec3 cWide = 0.25 * (
      texture2D(inputBuffer, clamp(clampedCuv + vec2(cOff.x, cOff.y), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(-cOff.x, cOff.y), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(cOff.x, -cOff.y), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(clampedCuv + vec2(-cOff.x, -cOff.y), vec2(0.006), vec2(0.994))).rgb
    );
    vec3 kScale = uIsKiller > 0.5 ? vec3(1.10, 0.92, 0.80) : vec3(1.0);
    vec3 widePow = pow(max(cWide * uneasyBreathe, vec3(0.0)), vec3(1.04 + clamp(uGradeHaze, 0.0, 1.2) * 0.05));
    vec3 widePre = widePow * grade * kScale * 0.84 * (1.0 + 0.04 * hazeAmt);
    vec3 wideTone = clamp((widePre * (2.51 * widePre + 0.03)) / (widePre * (2.43 * widePre + 0.59) + 0.14), vec3(0.0), vec3(1.0));
    wideTone = mix(wideTone, wideTone * wideTone * (3.0 - 2.0 * wideTone), sCurveWeight);
    float cY = dot(col, vec3(0.299, 0.587, 0.114));
    float cCb = (col.b - cY) * 0.564;
    float cCr = (col.r - cY) * 0.713;
    float wY = dot(wideTone, vec3(0.299, 0.587, 0.114));
    float wCb = (wideTone.b - wY) * 0.564;
    float wCr = (wideTone.r - wY) * 0.713;
    float chMix = clamp(uChromaSoftness, 0.0, 0.65);
    float cbOut = mix(cCb, wCb, chMix);
    float crOut = mix(cCr, wCr, chMix);
    col = clamp(vec3(
      cY + 1.402 * crOut,
      cY - 0.344136 * cbOut - 0.714136 * crOut,
      cY + 1.772 * cbOut
    ), vec3(0.0), vec3(1.0));
  }

  // 4C. Final H.264 / Stream / VOD Low-Bitrate Compression Simulation (Macroblocks only on non-Dreamcam presets)
  if (uCompressAmt > 0.005 && uBicubicMode < 0.5) {
    vec2 encRes = max(mix(resPx * 0.65, subDims * 1.15, 0.60), vec2(426.0, 240.0));
    vec2 mbStep = 8.0 / encRes;
    vec2 mbCoord = clampedCuv * encRes / 8.0;
    vec2 mbCenter = (floor(mbCoord) + 0.5) * mbStep;
    vec2 mbFrac = fract(mbCoord);
    vec2 chromaCenter = (floor(clampedCuv * encRes / 4.0) + 0.5) * (4.0 / encRes);

    vec3 mbRaw = texture2D(inputBuffer, clamp(mbCenter, vec2(0.006), vec2(0.994))).rgb;
    vec3 chRaw = 0.5 * (
      texture2D(inputBuffer, clamp(chromaCenter + vec2(3.0 / encRes.x, 0.0), vec2(0.006), vec2(0.994))).rgb +
      texture2D(inputBuffer, clamp(chromaCenter - vec2(3.0 / encRes.x, 0.0), vec2(0.006), vec2(0.994))).rgb
    );
    vec3 killerScale = uIsKiller > 0.5 ? vec3(1.10, 0.92, 0.80) : vec3(1.0);
    vec3 mbTone = grade * uneasyBreathe * killerScale * 0.84 * (1.0 + 0.04 * hazeAmt);
    vec3 mbPre = mbRaw * mbTone;
    vec3 chPre = chRaw * mbTone;
    vec3 mbEst = clamp((mbPre * (2.51 * mbPre + 0.03)) / (mbPre * (2.43 * mbPre + 0.59) + 0.14), vec3(0.0), vec3(1.0));
    vec3 chEst = clamp((chPre * (2.51 * chPre + 0.03)) / (chPre * (2.43 * chPre + 0.59) + 0.14), vec3(0.0), vec3(1.0));

    float cY = dot(col, vec3(0.299, 0.587, 0.114));
    float cCb = (col.b - cY) * 0.564;
    float cCr = (col.r - cY) * 0.713;

    float bY = dot(mbEst, vec3(0.299, 0.587, 0.114));
    float sY = dot(chEst, vec3(0.299, 0.587, 0.114));
    float sCb = (chEst.b - sY) * 0.564;
    float sCr = (chEst.r - sY) * 0.713;

    float cmp = clamp(uCompressAmt, 0.0, 3.2);
    float detailDiff = abs(cY - bY);
    float flatZone = 1.0 - smoothstep(0.025, 0.16, detailDiff);
    float darkMask = 1.0 - smoothstep(0.02, 0.38, bY);
    float blockMix = clamp(cmp * (0.18 + 0.42 * flatZone) * (0.45 + 0.55 * darkMask), 0.0, 0.88);
    float yOut = mix(cY, bY, blockMix);

    // Shadow gradient posterization & banding
    float qLevels = mix(64.0, 22.0, clamp(cmp * 0.65, 0.0, 0.92));
    float yQuant = floor(yOut * qLevels + 0.35) / qLevels;
    yOut = mix(yOut, yQuant, clamp(cmp * (0.18 + 0.34 * darkMask), 0.0, 0.58));

    // Crushed black floor & low-bitrate dark muddiness
    yOut *= mix(1.0, smoothstep(0.0, 0.065 * min(cmp, 1.4), yOut), clamp(cmp * 0.55, 0.0, 0.72));

    // Subtle 8x8 DCT mosquito ringing around high-contrast edges
    float edgeRing = smoothstep(0.06, 0.24, detailDiff) * cmp * 0.018;
    float dctWave = cos(mbFrac.x * 9.42477) * cos(mbFrac.y * 6.28318);
    yOut = clamp(yOut + dctWave * edgeRing, 0.0, 1.0);

    // YUV 4:2:0 chroma subsampling smear
    float cSmear = clamp(cmp * 0.52, 0.0, 0.85);
    float cbOut = mix(cCb, sCb, cSmear) * mix(1.0, 0.92, clamp(cmp * 0.35, 0.0, 0.4));
    float crOut = mix(cCr, sCr, cSmear) * mix(1.0, 0.92, clamp(cmp * 0.35, 0.0, 0.4));

    col = clamp(vec3(
      yOut + 1.402 * crOut,
      yOut - 0.344136 * cbOut - 0.714136 * crOut,
      yOut + 1.772 * cbOut
    ), vec3(0.0), vec3(1.0));
  } else if (uCompressAmt > 0.005) {
    // Dreamcam subtle highlight-knee smoothness without 8x8 macroblocks or dark shadow banding
    float softCmp = clamp(uCompressAmt * 0.65, 0.0, 0.18);
    col = mix(col, col / (vec3(1.0) + max(col - vec3(0.72), vec3(0.0)) * 0.28), softCmp);
  }

  // 5. Pronounced CRT Scanlines & Aperture Grille (eased smoothly up close so small text stays crisp)
  float scan = sin(clampedCuv.y * max(uResolution.y, 480.0) * 1.1) * 0.5 + 0.5;
  float scanMul = mix(1.0 - (mix(0.14, 0.18, uIs43) * scanAmt * hMask) * (1.0 - scan), 1.0, nearFocus * 0.58);
  float triad = sin(clampedCuv.x * max(uResolution.x, 640.0) * 1.65) * 0.5 + 0.5;
  float triadMul = mix(1.0 - (0.040 * scanAmt * hMask) * triad, 1.0, nearFocus * 0.58);
  col *= scanMul * triadMul;

  // 5B. User Color Adjustments: Contrast, Gamma, Hue Rotation, Saturation (before vignette)
  if (abs(uContrast - 1.0) > 0.005) {
    col = clamp((col - 0.5) * uContrast + 0.5, vec3(0.0), vec3(1.0));
  }
  if (abs(uGamma - 1.0) > 0.005) {
    col = pow(max(col, vec3(0.0)), vec3(1.0 / max(uGamma, 0.25)));
  }
  if (abs(uHue) > 0.002) {
    const vec3 kAxis = vec3(0.57735027);
    float cH = cos(uHue);
    float sH = sin(uHue);
    col = clamp(col * cH + cross(kAxis, col) * sH + kAxis * dot(kAxis, col) * (1.0 - cH), vec3(0.0), vec3(1.0));
  }
  if (abs(uSaturation - 1.0) > 0.005) {
    float satLuma = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(satLuma), col, uSaturation), vec3(0.0), vec3(1.0));
  }

  // 6. Strong Deep Camcorder Optical Vignette + Curved Bezel Glass Roll-Off
  float vigAmt = max(uVignetteAmount, 0.0);
  float bezel = smoothstep(mix(0.60, 0.50, uIs43), 0.12, r2);
  float outerDarkGrad = pow(clamp(smoothstep(mix(0.54, 0.46, uIs43), 0.05, r2), 0.0, 1.0), 1.48);
  float cornerCrush = smoothstep(mix(0.42, 0.34, uIs43), 0.14, r2);
  col *= mix(1.0, (0.32 + 0.68 * bezel) * mix(1.0, bezelFeather, 0.92), clamp(curveScale, 0.0, 1.0) * clamp(vigAmt, 0.2, 1.4));
  col *= mix(1.0, mix(0.025, 1.0, outerDarkGrad * (0.72 + 0.28 * cornerCrush)), clamp(vigAmt * 0.85, 0.0, 1.65));

  col=mix(col,max(inputColor.rgb,vec3(0.0)),clamp(uDaylightMix,0.0,1.0));
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
        ['uSoftDefocus', new THREE.Uniform(0)],
        ['uTaaMix', new THREE.Uniform(0)],
        ['uEdgeAa', new THREE.Uniform(0)],
        ['uExternalAa', new THREE.Uniform(0)],
        ['uLensSoftness', new THREE.Uniform(0)],
        ['uHasHistory', new THREE.Uniform(0)],
        ['uTexelSize', new THREE.Uniform(new THREE.Vector2(1 / 1280, 1 / 720))],
        ['uBufferRes', new THREE.Uniform(new THREE.Vector2(1280, 720))],
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
    this._prevCamPos = new THREE.Vector3();
    this._hasHistory = false;
    this._targetTemporalMix = 0.0;
  }

  resetHistory() {
    this._hasHistory = false;
    this.uniforms.get('uTemporalMix').value = 0.0;
    this.uniforms.get('uHasHistory').value = 0.0;
  }

  updateMatrices(camera, dt) {
    if (!camera) return;
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    this._currViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (this._hasHistory && this._prevCamPos.distanceToSquared(camera.position) > 36.0) {
      // Discard camera reprojection across >6m instant teleports so geometry never smears across frames
      this._hasHistory = false;
    }
    this.uniforms.get('uShutterScale').value = THREE.MathUtils.clamp(0.022 / Math.max(dt || 0.016, 0.006), 0.55, 1.45);
    this.uniforms.get('uCamNear').value = camera.near || 0.08;
    this.uniforms.get('uCamFar').value = camera.far || 115.0;
    this.uniforms.get('uAspect').value = camera.aspect || 16 / 9;
    this.uniforms.get('uHasHistory').value = this._hasHistory ? 1.0 : 0.0;
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

  commitFrame(camera) {
    this._prevViewProj.copy(this._currViewProj);
    if (camera) this._prevCamPos.copy(camera.position);
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
        ['uBaseGrain', new THREE.Uniform(1.0)],
        ['uGrainAmount', new THREE.Uniform(1.0)],
        ['uScanlineAmount', new THREE.Uniform(1.0)],
        ['uVignetteAmount', new THREE.Uniform(1.0)],
        ['uDaylightMix', new THREE.Uniform(0)],
        ['uVhsStrength', new THREE.Uniform(1.0)],
        ['uPanic', new THREE.Uniform(0)],
        ['uIsKiller', new THREE.Uniform(0)],
        ['uIs43', new THREE.Uniform(0)],
        ['uResolution', new THREE.Uniform(new THREE.Vector2(1280, 720))],
        ['uBufferRes', new THREE.Uniform(new THREE.Vector2(1280, 720))],
        ['uCrtNear', new THREE.Uniform(0.06)],
        ['uCrtFar', new THREE.Uniform(115.0)],
        ['uStreamMix', new THREE.Uniform(0.0)],
        ['uSoftUpscale', new THREE.Uniform(0.0)],
        ['uSubResH', new THREE.Uniform(1080.0)],
        ['uCaBoost', new THREE.Uniform(0.0)],
        ['uCompressAmt', new THREE.Uniform(0.0)],
        ['uAutoExpAmt', new THREE.Uniform(0.0)],
        ['uGradeHaze', new THREE.Uniform(0.0)],
        ['uSensorNoise', new THREE.Uniform(0.0)],
        ['uDisableSharpen', new THREE.Uniform(0.0)],
        ['uContrast', new THREE.Uniform(1.0)],
        ['uGamma', new THREE.Uniform(1.0)],
        ['uHue', new THREE.Uniform(0.0)],
        ['uSaturation', new THREE.Uniform(1.0)],
        ['uScanlineMask', new THREE.Uniform(1.0)],
        ['uCoolGrade', new THREE.Uniform(0.0)],
        ['uBicubicMode', new THREE.Uniform(0.0)],
        ['uLensSoftness', new THREE.Uniform(0.0)],
        ['uHalationAmt', new THREE.Uniform(0.0)],
        ['uChromaSoftness', new THREE.Uniform(0.0)],
        ['uClarity', new THREE.Uniform(0.0)]
      ])
    });
  }
}

function createPerceptualSmaaEffect() {
  const smaa = new SMAAEffect({
    preset: SMAAPreset.HIGH,
    edgeDetectionMode: EdgeDetectionMode.COLOR,
    predicationMode: PredicationMode.DEPTH
  });
  const ed = smaa.edgeDetectionMaterial;
  ed.edgeDetectionThreshold = 0.065;
  ed.localContrastAdaptationFactor = 2.0;
  ed.predicationThreshold = 0.008;
  ed.predicationScale = 2.0;
  ed.predicationStrength = 0.45;
  const wm = smaa.weightsMaterial;
  wm.orthogonalSearchSteps = 20;
  wm.diagonalSearchSteps = 10;
  wm.cornerRounding = 25;
  wm.diagonalDetection = true;
  wm.cornerDetection = true;
  // Transform linear HDR color samples to perceptual space solely for SMAA edge detection,
  // preserving linear HDR color integrity across downstream Bloom & ACES tone mapping.
  if (ed.fragmentShader && !ed.fragmentShader.includes('brSmaaPercep')) {
    ed.fragmentShader = ed.fragmentShader
      .replace(
        'void main(){',
        'vec3 brSmaaPercep(vec3 x){vec3 p=max(x,vec3(0.0));return pow(p/(1.0+p*0.85),vec3(0.4545));}\nvoid main(){'
      )
      .replace(
        'vec3 c=texture2D(inputBuffer,vUv).rgb;vec3 cLeft=texture2D(inputBuffer,vUv0).rgb;vec3 t=abs(c-cLeft);delta.x=max(max(t.r,t.g),t.b);vec3 cTop=texture2D(inputBuffer,vUv1).rgb;t=abs(c-cTop);delta.y=max(max(t.r,t.g),t.b);vec2 edges=step(threshold,delta.xy);if(dot(edges,vec2(1.0))==0.0){discard;}vec3 cRight=texture2D(inputBuffer,vUv2).rgb;t=abs(c-cRight);delta.z=max(max(t.r,t.g),t.b);vec3 cBottom=texture2D(inputBuffer,vUv3).rgb;t=abs(c-cBottom);delta.w=max(max(t.r,t.g),t.b);vec2 maxDelta=max(delta.xy,delta.zw);vec3 cLeftLeft=texture2D(inputBuffer,vUv4).rgb;t=abs(c-cLeftLeft);delta.z=max(max(t.r,t.g),t.b);vec3 cTopTop=texture2D(inputBuffer,vUv5).rgb;',
        'vec3 c=brSmaaPercep(texture2D(inputBuffer,vUv).rgb);vec3 cLeft=brSmaaPercep(texture2D(inputBuffer,vUv0).rgb);vec3 t=abs(c-cLeft);delta.x=max(max(t.r,t.g),t.b);vec3 cTop=brSmaaPercep(texture2D(inputBuffer,vUv1).rgb);t=abs(c-cTop);delta.y=max(max(t.r,t.g),t.b);vec2 edges=step(threshold,delta.xy);if(dot(edges,vec2(1.0))==0.0){discard;}vec3 cRight=brSmaaPercep(texture2D(inputBuffer,vUv2).rgb);t=abs(c-cRight);delta.z=max(max(t.r,t.g),t.b);vec3 cBottom=brSmaaPercep(texture2D(inputBuffer,vUv3).rgb);t=abs(c-cBottom);delta.w=max(max(t.r,t.g),t.b);vec2 maxDelta=max(delta.xy,delta.zw);vec3 cLeftLeft=brSmaaPercep(texture2D(inputBuffer,vUv4).rgb);t=abs(c-cLeftLeft);delta.z=max(max(t.r,t.g),t.b);vec3 cTopTop=brSmaaPercep(texture2D(inputBuffer,vUv5).rgb);'
      );
    ed.needsUpdate = true;
  }
  smaa._lutReady = false;
  smaa.addEventListener?.('load', () => { smaa._lutReady = true; });
  return smaa;
}

function createPerceptualFxaaEffect() {
  const fxaa = new FXAAEffect({ blendFunction: BlendFunction.SRC });
  fxaa.minEdgeThreshold = 0.0312;
  fxaa.maxEdgeThreshold = 0.125;
  fxaa.subpixelQuality = 0.82;
  if (fxaa.fragmentShader && !fxaa.fragmentShader.includes('brFxaaLuma')) {
    fxaa.fragmentShader = fxaa.fragmentShader
      .replace(
        'vec4 fxaa(',
        'float brFxaaLuma(vec3 x){vec3 p=max(x,vec3(0.0));float l=dot(p,vec3(0.2126,0.7152,0.0722));return sqrt(clamp(l/(1.0+l*0.65),0.0,1.0));}\nvec4 fxaa('
      )
      .replaceAll('luminance(', 'brFxaaLuma(');
  }
  return fxaa;
}

/**
 * Manages preset & per-effect Found-Footage Post-Processing:
 * Pipeline order: Scene (optional HW MSAA) -> RTShadow -> SMAA/FXAA -> Bloom -> MotionBlur/DoF -> SavePass -> CRT/SoftUpscale
 */
export class GraphicsManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.presetKey = 'ultra';
    this.fx = getPresetDefaultFx('ultra');
    this.aspectMode = '4:3';
    this.aaMode = this.fx.aaMode || 'smaa';
    this.activeAaMode = 'off';
    this.msaaSamples = 0;
    this.composer = null;
    this.renderPass = null;
    this.rtShadowPass = null;
    this.aaPass = null;
    this.exposurePass = new AdaptiveExposurePass();
    this.bloomPass = null;
    this.mblurPass = null;
    this.savePass = null;
    this.crtPass = null;
    this._viewW = window.innerWidth;
    this._viewH = window.innerHeight;
    this._nearLights = null;
    this._tmpLightV = new THREE.Vector3();

    this.rtShadow = new BackroomsRTShadowEffect();
    this.smaa = createPerceptualSmaaEffect();
    this.fxaa = createPerceptualFxaaEffect();

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
    this._footagePreset = FOOTAGE_FILTER_PRESETS.off;
    this._footageStr = 0;
    this._effVig = 1.28;
    this._effGrain = 1.0;
  }

  _ensureComposer(samples = 0) {
    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer, {
        frameBufferType: THREE.HalfFloatType,
        multisampling: samples
      });
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);
    } else if (this.composer.multisampling !== samples) {
      this.composer.multisampling = samples;
    }
  }

  _clearEffectPasses() {
    if (!this.composer) return;
    for (const field of ['rtShadowPass', 'aaPass', 'exposurePass', 'bloomPass', 'mblurPass', 'savePass', 'crtPass']) {
      if (this[field]) {
        this.composer.removePass(this[field]);
        if (field !== 'aaPass' && field !== 'exposurePass') {
          this[field].dispose?.();
          this[field] = null;
        } else if (field === 'aaPass') {
          this[field] = null;
        }
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

    const fKey = (this.fx.footageFilterMode in FOOTAGE_FILTER_PRESETS) ? this.fx.footageFilterMode : 'off';
    const fPreset = FOOTAGE_FILTER_PRESETS[fKey] || FOOTAGE_FILTER_PRESETS.off;
    const fStr = fPreset.id > 0 ? THREE.MathUtils.clamp(Number(this.fx.footageFilterStrength ?? 1.0), 0, 4.0) : 0.0;
    const fMix01 = Math.min(fStr, 1.0);
    const fOver = fStr <= 1.0 ? fStr : 1.0 + Math.pow((fStr - 1.0) / 3.0, 0.85) * 2.25;
    this._footagePreset = fPreset;
    this._footageStr = fStr;
    this._footageOver = fOver;

    const baseScale = Number(this.fx.renderScale) || 1.0;
    const isDreamcam = (fPreset.bicubicMode || 0) > 0.5;
    const dreamTargetScale = baseScale >= 1.25 ? 0.90 : (baseScale >= 0.85 ? 0.85 : 0.72);
    const targetInternalScale = isDreamcam ? dreamTargetScale : fPreset.internalScale;
    const effScale = fMix01 > 0.001
      ? Math.min(baseScale, THREE.MathUtils.lerp(baseScale, targetInternalScale, fMix01))
      : baseScale;
    const sysDpr = Math.min(2.0, Math.max(1.0, window.devicePixelRatio || 1));
    const dpr = effScale <= 1.0
      ? Math.max(0.45, effScale * (1.0 + (sysDpr - 1.0) * 0.45))
      : Math.min(2.0, Math.max(sysDpr, 1.0 + (effScale - 1.0) * 0.5) * (1.0 + (sysDpr - 1.0) * 0.35));
    this.renderer.setPixelRatio(Math.max(0.45, Math.min(2.0, dpr)));
    this.renderer.shadowMap.enabled = !!this.fx.shadows;

    const br = Number(this.fx.brightness) || 1.0;
    // When PostFX + Adaptive Exposure is active, exposure & brightness multiply cleanly in HDR pipeline before ACES
    const eyeAdaptOn = !!this.fx.eyeAdaptEnabled && this.fx.eyeAdaptPreset !== 'off';
    this.renderer.toneMappingExposure = this.fx.postFX ? 1.0 : 1.06 * br * Math.pow(2, Number(this.fx.eyeAdaptComp ?? 0));
    if (hemiLight) hemiLight.intensity = this.fx.postFX ? 0.38 : 0.40;
    if (ambLight) ambLight.intensity = this.fx.postFX ? 0.14 : 0.16;

    const reqAa = ['off', 'fxaa', 'smaa', 'msaa'].includes(this.fx.aaMode) ? this.fx.aaMode : 'smaa';
    this.aaMode = reqAa;
    const maxHwSamples = Math.min(4, this.renderer.capabilities?.maxSamples || 0);

    if (this.fx.postFX) {
      let resolvedAa = reqAa;
      if (resolvedAa === 'msaa' && maxHwSamples < 2) {
        resolvedAa = 'smaa';
      }
      const targetSamples = resolvedAa === 'msaa' ? maxHwSamples : 0;
      this.activeAaMode = resolvedAa;
      this.msaaSamples = targetSamples;
      this._ensureComposer(targetSamples);
      this._clearEffectPasses();

      const hasRtShadow = (this.fx.rtShadow ?? 0) > 0.05;
      const hasMBlur = this.fx.motionBlur > 0.01;
      const hasDof = this.fx.dofBlur > 0.01;
      const hasTaa = fStr > 0.01 && fPreset.taaMix > 0.005;
      const hasSoftDefocus = fStr > 0.01 && fPreset.softDefocus > 0.005;
      const hasFootageMotion = fStr > 0.01 && fPreset.motionBoost > 0.01;
      const hasEdgeAa = fStr > 0.01 && (fPreset.edgeAa || 0) > 0.01;

      const userSoftness = THREE.MathUtils.clamp(Number(this.fx.upscaleSoftness ?? 0.65), 0, 3.0);
      const presetLensSoft = (fStr > 0.01 && (fPreset.lensSoftness || 0) > 0.01)
        ? (fPreset.lensSoftness || 0) * (userSoftness / 0.65) * Math.min(fOver, 1.85)
        : 0.0;
      const extraSoftness = Math.max(0, userSoftness - 0.65) * 0.92;
      const effLensSoftness = THREE.MathUtils.clamp(Math.max(presetLensSoft, extraSoftness), 0, 3.0);
      const hasLensSoftness = effLensSoftness > 0.005;

      const userHalation = THREE.MathUtils.clamp(Number(this.fx.halation ?? 0.25), 0, 2.5);
      const presetHal = (fStr > 0.01 && (fPreset.halation || 0) > 0.01)
        ? (fPreset.halation || 0) * (userHalation / 0.25) * Math.min(fOver, 1.85)
        : 0.0;
      const extraHalation = Math.max(0, userHalation - 0.25) * 0.85;
      const effHalation = THREE.MathUtils.clamp(Math.max(presetHal, extraHalation), 0, 2.8);

      const userClarity = THREE.MathUtils.clamp(Number(this.fx.clarity ?? 0.0), -1.0, 1.0);
      const hasBloom = this.fx.bloom > 0.01 || (fStr > 0.01 && fPreset.bloomBoost > 0.01);

      const userLens = Math.max(0, this.fx.lensCurve);
      const userScan = Math.max(0, this.fx.scanlines);
      const userBaseGrain = THREE.MathUtils.clamp(Number(this.fx.baseGrain ?? 1.0), 0, 2.0);
      const userGrain = Math.max(0, this.fx.grain);
      const userVig = Math.max(0, this.fx.vignette);

      const manual=key=>this._hillsPresentation && this.fx.userFxKeys?.includes(key);
      const effLens = !manual('lensCurve') && fMix01 > 0.01 && (fPreset.minLensCurve || 0) > 0
        ? Math.max(userLens, THREE.MathUtils.lerp(userLens, Math.min(3.0, fPreset.minLensCurve * (1 + (fOver - 1) * 0.2)), fMix01))
        : userLens;
      const effScan = !manual('scanlines') && fMix01 > 0.01 && fPreset.scanTarget !== null
        ? THREE.MathUtils.lerp(userScan, fPreset.scanTarget * Math.max(0.25, userScan / 1.5) * Math.min(fOver, 1.65), fMix01)
        : userScan;
      const effGrain = !manual('grain') && fMix01 > 0.01 && fPreset.grainTarget !== null
        ? THREE.MathUtils.lerp(userGrain, fPreset.grainTarget * Math.max(0.35, userGrain / 1.5) * Math.min(fOver, 1.5), fMix01)
        : userGrain;
      const effVig = !manual('vignette') && fMix01 > 0.01 && fPreset.vignetteTarget !== null
        ? THREE.MathUtils.lerp(userVig, fPreset.vignetteTarget * Math.max(0.5, userVig / 1.5), fMix01)
        : userVig;
      this._effVig = effVig;
      this._effGrain = effGrain;

      this.exposurePass.configure({
        enabled: eyeAdaptOn,
        strength: Number(this.fx.eyeAdaptStrength ?? 1.0),
        brightSpeed: Number(this.fx.eyeAdaptBrightSpeed ?? 0.75),
        darkSpeed: Number(this.fx.eyeAdaptDarkSpeed ?? 2.35),
        comp: Number(this.fx.eyeAdaptComp ?? 0.0),
        minExp: this._hillsDefault('eyeAdaptPreset','eyeAdaptMinExp')?.84:Number(this.fx.eyeAdaptMinExp ?? 0.42),
        maxExp: this._hillsDefault('eyeAdaptPreset','eyeAdaptMaxExp')?1.3:Math.min(Number(this.fx.eyeAdaptMaxExp ?? 2.45),this.localExposureMax??Infinity),
        brightness: br
      });

      this.rtShadow.uniforms.get('uStrength').value = Math.max(0, this.fx.rtShadow ?? 0);
      this.bloom.intensity = 1.18 * (Math.max(0, this.fx.bloom) + (!manual('bloom') && fStr > 0.01 ? Math.min(2.6, fPreset.bloomBoost * fOver) : 0.0));
      if (this.bloom.luminanceMaterial) {
        this.bloom.luminanceMaterial.threshold = fMix01 > 0.01
          ? Math.max(0.22, THREE.MathUtils.lerp(0.56, fPreset.bloomThreshold, fMix01) - Math.max(0, fOver - 1.0) * 0.04)
          : 0.56;
        this.bloom.luminanceMaterial.smoothing = (fMix01 > 0.01 && isDreamcam)
          ? THREE.MathUtils.lerp(0.26, 0.58, fMix01)
          : 0.26;
      }
      if (this.bloom.mipmapBlurPass) {
        const targetRad = isDreamcam ? 0.82 : 0.88;
        const baseRad = fMix01 > 0.01 ? THREE.MathUtils.lerp(0.78, targetRad, fMix01) : 0.78;
        const extraRad = Math.max(0, (Number(this.fx.bloom) || 0) - 1.6) * 0.055;
        this.bloom.mipmapBlurPass.radius = Math.min(0.95, baseRad + extraRad);
      }

      const mbU = this.motionBlur.uniforms;
      mbU.get('uEnabled').value = (hasMBlur || hasFootageMotion) ? 1.0 : 0.0;
      mbU.get('uDofAmount').value = Math.max(0, this.fx.dofBlur);
      mbU.get('uSoftDefocus').value = hasSoftDefocus ? THREE.MathUtils.clamp(fPreset.softDefocus * fOver, 0, 1.15) : 0.0;
      mbU.get('uTaaMix').value = hasTaa ? THREE.MathUtils.clamp(fPreset.taaMix * Math.min(fOver, 1.4), 0, 0.55) : 0.0;
      mbU.get('uEdgeAa').value = hasEdgeAa ? THREE.MathUtils.clamp((fPreset.edgeAa || 0) * fMix01, 0, 1.0) : 0.0;
      mbU.get('uExternalAa').value = this.activeAaMode !== 'off' ? 1.0 : 0.0;
      mbU.get('uLensSoftness').value = effLensSoftness;

      const crtU = this.crtGrade.uniforms;
      crtU.get('uCrtAmount').value = effLens > 0.01 || effScan > 0.01 || fStr > 0.01 || effHalation > 0.01 ? 1.0 : 0.0;
      crtU.get('uLensCurve').value = effLens;
      crtU.get('uBaseGrain').value = userBaseGrain;
      crtU.get('uGrainAmount').value = effGrain;
      crtU.get('uScanlineAmount').value = effScan;
      crtU.get('uVignetteAmount').value = effVig;
      crtU.get('uIs43').value = this.aspectMode === '4:3' ? 1.0 : 0.0;

      // Multi-layer low-quality found-footage / stream / VOD / Dreamcam pipeline uniforms (scaled safely to 400%)
      crtU.get('uStreamMix').value = fMix01;
      crtU.get('uSoftUpscale').value = fStr > 0.01 ? THREE.MathUtils.clamp(fPreset.softUpscale * (0.55 + 0.45 * Math.min(fOver, 1.8)), 0, 1.0) : 0.0;
      const dreamSubH = Math.round(Math.max(480, Math.min(900, (this._viewH || 720) * Math.min(1.0, effScale))));
      const presetSubH = isDreamcam ? dreamSubH : fPreset.subResH;
      crtU.get('uSubResH').value = fMix01 > 0.01 ? THREE.MathUtils.lerp(1080, presetSubH / Math.max(0.75, Math.min(2.1, fStr > 1 ? 0.85 + 0.15 * fOver : 1.0)), fMix01) : 1080.0;
      crtU.get('uCaBoost').value = fStr > 0.01 ? Math.min(1.65, fPreset.caBoost * fOver) : 0.0;
      crtU.get('uCompressAmt').value = fStr > 0.01 ? THREE.MathUtils.clamp(fPreset.compressAmt * fOver, 0, 3.2) : 0.0;
      crtU.get('uAutoExpAmt').value = fStr > 0.01 ? THREE.MathUtils.clamp(fPreset.autoExpAmt * fOver, 0, 1.6) : 0.0;
      crtU.get('uGradeHaze').value = fStr > 0.01 ? THREE.MathUtils.clamp(fPreset.gradeHaze * fOver, 0, 2.4) : 0.0;
      crtU.get('uSensorNoise').value = fStr > 0.01 ? THREE.MathUtils.clamp(fPreset.sensorNoise * fOver, 0, 2.4) : 0.0;
      crtU.get('uDisableSharpen').value = (fStr > 0.01 && fPreset.disableSharpen) ? 1.0 : 0.0;
      crtU.get('uBicubicMode').value = (fStr > 0.01 && isDreamcam) ? fMix01 : 0.0;
      crtU.get('uLensSoftness').value = effLensSoftness;
      crtU.get('uHalationAmt').value = effHalation;
      crtU.get('uChromaSoftness').value = fStr > 0.01 ? THREE.MathUtils.clamp((fPreset.chromaSoftness || 0) * Math.min(fOver, 1.8), 0, 0.65) : 0.0;
      crtU.get('uClarity').value = userClarity;
      this._presentationBase = {
        bloom: this.bloom.intensity,
        lens: effLensSoftness,
        halation: effHalation,
        chroma: crtU.get('uChromaSoftness').value,
        haze: crtU.get('uGradeHaze').value
      };
      crtU.get('uScanlineMask').value = this.fx.crtScanlines === false ? 0.0 : 1.0;
      crtU.get('uContrast').value = THREE.MathUtils.clamp(Number(this.fx.contrast ?? 1.0), 0.80, 1.25);
      crtU.get('uGamma').value = THREE.MathUtils.clamp(Number(this.fx.gamma ?? 1.0), 0.80, 1.25);
      crtU.get('uHue').value = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(Number(this.fx.hue ?? 0), -35, 35));
      crtU.get('uSaturation').value = THREE.MathUtils.clamp(Number(this.fx.saturation ?? 1.0), 0.65, 1.30);

      // TRUE SEPARATE MULTI-PASS PIPELINE:
      // RenderPass (opt HW MSAA) -> RTShadowPass -> SMAA/FXAA -> AdaptiveExposure -> MotionBlur/DoF -> SavePass -> Bloom -> CRT(Clarity+Halation+ACES+Grain)
      if (hasRtShadow) {
        this.rtShadowPass = new EffectPass(this.camera, this.rtShadow);
        this.composer.addPass(this.rtShadowPass);
      }
      if (this.activeAaMode === 'smaa') {
        this.aaPass = new EffectPass(this.camera, this.smaa);
        this.composer.addPass(this.aaPass);
      } else if (this.activeAaMode === 'fxaa') {
        this.aaPass = new EffectPass(this.camera, this.fxaa);
        this.composer.addPass(this.aaPass);
      }
      this.composer.addPass(this.exposurePass);
      if (hasMBlur || hasDof || hasTaa || hasSoftDefocus || hasFootageMotion || (hasEdgeAa && this.activeAaMode === 'off') || hasLensSoftness) {
        this.savePass = new SavePass();
        this.motionBlur.uniforms.get('uPrevFrame').value = this.savePass.renderTarget.texture;
        this.mblurPass = new EffectPass(this.camera, this.motionBlur);
        this.composer.addPass(this.mblurPass);
        this.composer.addPass(this.savePass);
      }
      if (hasBloom) {
        this.bloomPass = new EffectPass(this.camera, this.bloom);
        this.composer.addPass(this.bloomPass);
      }

      const crtEffects = [this.crtGrade, this.vignette];
      this.crtPass = new EffectPass(this.camera, ...crtEffects);
      this.composer.addPass(this.crtPass);

      this.resetMotionHistory();
      this.setSize(this._viewW, this._viewH);
    } else {
      this._clearEffectPasses();
      if (this.composer) this.composer.multisampling = 0;
      this.activeAaMode = 'off';
      this.msaaSamples = 0;
      this.rtShadow.uniforms.get('uStrength').value = 0;
      this.setSize(this._viewW, this._viewH);
    }

    return this.fx;
  }

  applyPreset(key, hemiLight = null, ambLight = null) {
    const preset = GFX_PRESETS[key] || GFX_PRESETS.high;
    this.presetKey = key in GFX_PRESETS ? key : 'high';
    this.applyFx(getPresetDefaultFx(this.presetKey), hemiLight, ambLight);
    return preset;
  }

  setCoolGrade(val = 0.0) {
    const u = this.crtGrade?.uniforms?.get('uCoolGrade');
    if (u) u.value = THREE.MathUtils.clamp(val, 0, 1);
  }

  setLocalExposureLimit(max=Infinity){
    this.localExposureMax=Number.isFinite(max)?Math.max(1,max):Infinity;
    const u=this.exposurePass?._adaptMat?.uniforms;
    const maxExp=this._hillsDefault('eyeAdaptPreset','eyeAdaptMaxExp')?1.3:Number(this.fx.eyeAdaptMaxExp??2.45);
    if(u)u.uMaxExp.value=Math.max(u.uMinExp.value+.15,Math.min(maxExp,this.localExposureMax));
  }

  _hillsDefault(...keys) {
    return this._hillsPresentation && !keys.some(key => this.fx.userFxKeys?.includes(key));
  }

  setEnvironmentProfile(levelId) {
    const hills=levelId==='level94'||levelId==='level94d',changed=hills!==this._hillsPresentation;
    this._hillsPresentation=hills;this._poolroomsPresentation=levelId==='level37';
    if(this._poolroomsPresentation)this.setCoolGrade(.92);
    // Restore every preset uniform that the daylight profile temporarily caps.
    if(changed&&!hills)this.applyFx({});
    if(changed&&this.exposurePass)this.exposurePass.configure({enabled:this.fx.eyeAdaptEnabled&&this.fx.eyeAdaptPreset!=='off',strength:this.fx.eyeAdaptStrength??1,brightSpeed:this.fx.eyeAdaptBrightSpeed??.75,darkSpeed:this.fx.eyeAdaptDarkSpeed??2.35,comp:this.fx.eyeAdaptComp??0,minExp:this._hillsDefault('eyeAdaptPreset','eyeAdaptMinExp')?.84:(this.fx.eyeAdaptMinExp??.42),maxExp:this._hillsDefault('eyeAdaptPreset','eyeAdaptMaxExp')?1.3:(this.fx.eyeAdaptMaxExp??2.45),brightness:this.fx.brightness??1});
  }

  setSize(w, h) {
    this._viewW = w;
    this._viewH = h;
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    const dbSize = new THREE.Vector2();
    if (this.renderer.getDrawingBufferSize) {
      this.renderer.getDrawingBufferSize(dbSize);
    } else {
      const pr = this.renderer.getPixelRatio ? (this.renderer.getPixelRatio() || 1) : 1;
      dbSize.set(w * pr, h * pr);
    }
    const bw = Math.max(dbSize.x, 320);
    const bh = Math.max(dbSize.y, 180);
    this.motionBlur.uniforms.get('uTexelSize').value.set(1 / bw, 1 / bh);
    this.motionBlur.uniforms.get('uBufferRes').value.set(bw, bh);
    this.crtGrade.uniforms.get('uResolution').value.set(w, h);
    this.crtGrade.uniforms.get('uBufferRes').value.set(bw, bh);
    this.rtShadow.uniforms.get('uResolution').value.set(w, h);
    this.exposurePass?.setSize(bw, bh);
    this.motionBlur.resetHistory();
  }

  update(dt, { turnYawRate = 0, turnPitchRate = 0, shakeXRate = 0, shakeYRate = 0, speedRatio = 0, panic = 0, isKiller = false, elapsed = 0, nearLights = null }) {
    this._nearLights = nearLights;
    if (!this.fx.postFX) return;

    const mbU = this.motionBlur.uniforms;
    const fBoost = this._footageStr > 0.01 ? (this._footagePreset.motionBoost || 0) * this._footageStr : 0;
    const baseMb = Math.max(0, this.fx.motionBlur || 0);
    const mbScale = baseMb > 0.01 ? (baseMb + fBoost * 0.25) : fBoost;
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
    const vigMul = this._footageStr > 0.01 ? (this._effVig ?? 0.85) : Math.max(0, this.fx.vignette ?? 1.28);
    const grainMul = this._footageStr > 0.01 ? (this._effGrain ?? 0.40) : Math.max(0, this.fx.grain ?? 1.0);
    const hills=this._hillsPresentation;
    const pool=this._poolroomsPresentation;
    const fOver = this._footageOver ?? this._footageStr ?? 0;
    mbU.get('uDofAmount').value=Math.max(0,this.fx.dofBlur)*(pool ? .10 : 1);
    mbU.get('uSoftDefocus').value=(this._footageStr>.01?THREE.MathUtils.clamp(this._footagePreset.softDefocus*fOver,0,1.15):0)*(pool ? .35 : 1);
    const optics=this._presentationBase;
    if(optics){
      const softScale = pool ? (optics.lens > 0.70 ? THREE.MathUtils.lerp(0.4, 0.92, Math.min(1, (optics.lens - 0.70) / 1.5)) : 0.4) : 1.0;
      const halScale = pool ? (optics.halation > 0.30 ? THREE.MathUtils.lerp(0.25, 0.92, Math.min(1, (optics.halation - 0.30) / 1.5)) : 0.25) : 1.0;
      this.bloom.intensity=optics.bloom*(pool ? .42 : 1);
      crtU.get('uLensSoftness').value=optics.lens*softScale;
      mbU.get('uLensSoftness').value=optics.lens*softScale;
      crtU.get('uHalationAmt').value=optics.halation*halScale;
      crtU.get('uChromaSoftness').value=optics.chroma*(pool ? .5 : 1);
      crtU.get('uGradeHaze').value=optics.haze*(pool ? .3 : 1);
    }
    crtU.get('uVignetteAmount').value=vigMul*(pool ? .32 : 1);
    crtU.get('uBaseGrain').value=THREE.MathUtils.clamp(Number(this.fx.baseGrain ?? 1.0), 0, 2.0)*(pool ? .78 : 1);
    crtU.get('uGrainAmount').value=grainMul*(pool ? .32 : 1);
    crtU.get('uSensorNoise').value=this._footageStr>.01?THREE.MathUtils.clamp(this._footagePreset.sensorNoise*fOver,0,2.4)*(pool ? .35 : 1):0;
    crtU.get('uGamma').value=THREE.MathUtils.clamp(Number(this.fx.gamma??1)+(pool ? .08 : 0),.8,1.3);
    this.rtShadow.uniforms.get('uStrength').value=Math.max(0,this.fx.rtShadow??0)*(pool ? .45 : 1);
    this.vignette.darkness=Math.min(pool ? .45 : .98,(.86+p*.14)*Math.min(vigMul,1.5)*(pool ? .45 : 1));
    // Daylight is the map's default look. Explicit menu edits take precedence;
    // choosing a footage preset uses that preset's complete filter pipeline.
    const defaults=(...keys)=>this._hillsDefault('footageFilterMode','footageFilterStrength',...keys);
    const manualGrade=['bloom','rtShadow','dofBlur','motionBlur','upscaleSoftness','halation','clarity','vignette','grain','baseGrain','lensCurve','scanlines','gamma','contrast','hue','saturation'];
    crtU.get('uDaylightMix').value=defaults(...manualGrade)?.58:0;
    if(hills){
      if(defaults('bloom'))this.bloom.intensity=Math.min(.18,(this._presentationBase?.bloom||0)*.12);
      if(defaults('rtShadow'))this.rtShadow.uniforms.get('uStrength').value=Math.min(.4,Math.max(0,this.fx.rtShadow??0)*.4);
      if(defaults('dofBlur'))mbU.get('uDofAmount').value=0;
      if(defaults('upscaleSoftness')){mbU.get('uSoftDefocus').value=0;mbU.get('uLensSoftness').value=.01;crtU.get('uLensSoftness').value=.01;}
      if(defaults()){
        mbU.get('uTaaMix').value=.025;
        crtU.get('uStreamMix').value=Math.min(.18,this._footageStr*.2);
        crtU.get('uSubResH').value=Math.max(900,this._viewH||900);
        crtU.get('uAutoExpAmt').value=0;crtU.get('uSoftUpscale').value=.015;
        crtU.get('uBicubicMode').value=0;crtU.get('uGradeHaze').value=.015;
        crtU.get('uCompressAmt').value=.08;crtU.get('uChromaSoftness').value=.035;
        crtU.get('uSensorNoise').value=.055;
      }
      if(defaults('halation'))crtU.get('uHalationAmt').value=.065;
      if(defaults('vignette')){crtU.get('uVignetteAmount').value=Math.min(.23,vigMul*.17);this.vignette.darkness=Math.min(.18,vigMul*.13);}
      if(defaults('grain'))crtU.get('uGrainAmount').value=Math.min(.12,grainMul*.16);
      if(defaults('baseGrain'))crtU.get('uBaseGrain').value=.24;
      if(defaults('lensCurve'))crtU.get('uLensCurve').value=Math.min(.12,Number(this.fx.lensCurve||0)*.12);
      if(defaults('scanlines'))crtU.get('uScanlineAmount').value=Math.min(.08,Number(this.fx.scanlines||0)*.1);
      if(defaults('gamma'))crtU.get('uGamma').value=Math.max(1.06,Number(this.fx.gamma||1));
      if(defaults('hue','saturation'))crtU.get('uCoolGrade').value=.5;
    }
    this.noise.blendMode.opacity.value=((isKiller ? .022 : .040)+p*.09)*grainMul*(defaults('grain') ? .15 : pool ? .32 : 1);
  }

  resetExposure(snapFraction = 0.85) {
    this.exposurePass?.requestReset(snapFraction);
  }

  async readExposureTelemetryAsync() {
    if (!this.exposurePass || !this.renderer) return null;
    return this.exposurePass.readStateAsync(this.renderer);
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
      const prevAutoReset = this.renderer.info.autoReset;
      this.renderer.info.autoReset = false;
      this.renderer.info.reset();
      this.composer.render(dt);
      this.renderer.info.autoReset = prevAutoReset;
      if (this.mblurPass) {
        this.motionBlur.commitFrame(this.camera);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
