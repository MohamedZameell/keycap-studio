import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import Keycap, { PROFILE_SPECS, normalizeProfile } from './Keycap';
import KeyboardChassis from './KeyboardChassis';
import { getLayoutForFormFactor, formFactorToLayoutKey } from '../data/layouts';
import { Text } from '@react-three/drei';

const KEY_UNIT = 1.05;

export default function KeyboardRenderer({ onKeyClick, pressedKeys = new Set(), layout: externalLayout }) {
  const formFactor = useStore(s => s.selectedFormFactor);
  const selectedKey = useStore(s => s.selectedKey);
  const setSelectedKey = useStore(s => s.setSelectedKey);
  const selectedProfile = useStore(s => s.selectedProfile) || 'cherry';

  // Get profile-specific row heights and tilts
  const normalizedProfile = normalizeProfile(selectedProfile);
  const profileSpec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
  const rowHeights = profileSpec.rowHeights;
  const rowTilts = profileSpec.rowTilts;
  
  const layout = useMemo(() => {
    try {
      const res = getLayoutForFormFactor(formFactorToLayoutKey(formFactor));
      return res && res.length ? res : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [formFactor]);

  const { totalW, totalH, minX, minZ, maxW, maxH } = useMemo(() => {
    if (!layout.length) return { totalW:0, totalH:0, minX:0, minZ:0, maxW:0, maxH:0 };
    
    const safeLayout = layout.map(k => ({
      ...k,
      w: Math.max(0.5, Math.min(8, Number(k.w) || 1)),
      h: Math.max(0.5, Math.min(3, Number(k.h) || 1))
    }));

    const minX = Math.min(...safeLayout.map(k => Number(k.x)));
    const minZ = Math.min(...safeLayout.map(k => Number(k.y)));
    const maxX = Math.max(...safeLayout.map(k => Number(k.x) + (Number(k.w) || 1)));
    const maxZ = Math.max(...safeLayout.map(k => Number(k.y) + (Number(k.h) || 1)));
    
    const maxW = maxX - minX;
    const maxH = maxZ - minZ;
    const totalW = maxW * KEY_UNIT;
    const totalH = maxH * KEY_UNIT;
    
    return { totalW, totalH, minX, minZ, maxW, maxH };
  }, [layout]);

  const isPerformanceMode = layout.length > 80;

  // === Shared image texture (ONE texture for all keycaps) ===
  // Pan/zoom is applied on the canvas, so transparent areas naturally appear
  const imageMode = useStore(s => s.keyboardImageMode);
  const imageUrl = useStore(s => s.keyboardImageUrl);
  const keyboardImages = useStore(s => s.keyboardImages);
  const globalOffsetX = useStore(s => s.keyboardImageOffsetX) || 0;
  const globalOffsetY = useStore(s => s.keyboardImageOffsetY) || 0;
  const globalScale = useStore(s => s.keyboardImageScale) || 1;

  const enabledImages = useMemo(() =>
    keyboardImages.filter(img => img.enabled && img.url),
    [keyboardImages]
  );

  // Step 1: Load images when URLs change (async, cached)
  const cachedImagesRef = useRef([]);
  const [imagesLoaded, setImagesLoaded] = useState(0); // counter to trigger recomposite

  const imageUrlsKey = useMemo(() => {
    if (imageMode !== 'wrap') return '';
    if (imageUrl && enabledImages.length === 0) return `legacy:${imageUrl}`;
    return enabledImages.map(img => img.url).join('|');
  }, [imageMode, imageUrl, enabledImages]);

  useEffect(() => {
    if (!imageUrlsKey) {
      cachedImagesRef.current = [];
      setImagesLoaded(0);
      return;
    }
    let cancelled = false;
    const isLegacy = imageUrlsKey.startsWith('legacy:');
    const urls = isLegacy
      ? [{ id: 'legacy', url: imageUrl }]
      : enabledImages.map(img => ({ id: img.id, url: img.url }));

    Promise.all(urls.map(({ id, url }) =>
      new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ id, img });
        img.onerror = () => resolve(null);
        img.src = url;
      })
    )).then(results => {
      if (cancelled) return;
      cachedImagesRef.current = results.filter(Boolean);
      setImagesLoaded(n => n + 1);
    });
    return () => { cancelled = true; };
  }, [imageUrlsKey]);

  // Step 2: Composite canvas (sync, fast — just drawImage from cached elements)
  const canvasRef = useRef(null);
  const textureRef = useRef(null);
  const [sharedImageTexture, setSharedImageTexture] = useState(null);

  // Dispose Three.js texture and drop the canvas + cached HTMLImageElements when
  // the renderer unmounts (e.g. user navigates away from Studio). Without this,
  // re-entering Studio creates fresh ones each time and memory grows per visit.
  useEffect(() => () => {
    if (textureRef.current?.dispose) {
      try { textureRef.current.dispose(); } catch (e) { /* ignore */ }
    }
    textureRef.current = null;
    canvasRef.current = null;
    cachedImagesRef.current = [];
  }, []);

  const compositeKey = useMemo(() => {
    if (imageMode !== 'wrap') return '';
    const layerProps = enabledImages.map(img =>
      `${img.id}-${img.scale}-${img.offsetX}-${img.offsetY}-${img.opacity}`
    ).join('|');
    return `${globalOffsetX}-${globalOffsetY}-${globalScale}-${layerProps}-${imagesLoaded}`;
  }, [imageMode, globalOffsetX, globalOffsetY, globalScale, enabledImages, imagesLoaded]);

  useEffect(() => {
    if (imageMode !== 'wrap' || cachedImagesRef.current.length === 0) {
      if (sharedImageTexture) setSharedImageTexture(null);
      return;
    }

    const size = 2048;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = size;
      canvasRef.current.height = size;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    const isLegacy = imageUrl && enabledImages.length === 0;

    if (isLegacy) {
      const cached = cachedImagesRef.current[0];
      if (!cached) return;
      const s = globalScale;
      const drawW = size * s;
      const drawH = size * s;
      const drawX = (size - drawW) / 2 + globalOffsetX * size * 0.5;
      const drawY = (size - drawH) / 2 + globalOffsetY * size * 0.5;
      ctx.drawImage(cached.img, drawX, drawY, drawW, drawH);
    } else {
      enabledImages.forEach(layer => {
        const cached = cachedImagesRef.current.find(c => c.id === layer.id);
        if (!cached) return;
        ctx.globalAlpha = layer.opacity ?? 1;
        const s = layer.scale ?? 1;
        const drawW = size * s;
        const drawH = size * s;
        const drawX = (size - drawW) / 2 + (layer.offsetX ?? 0) * size * 0.5;
        const drawY = (size - drawH) / 2 + (layer.offsetY ?? 0) * size * 0.5;
        ctx.drawImage(cached.img, drawX, drawY, drawW, drawH);
      });
      ctx.globalAlpha = 1;
    }

    if (!textureRef.current) {
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      textureRef.current = tex;
      setSharedImageTexture(tex);
    } else {
      textureRef.current.needsUpdate = true;
      if (!sharedImageTexture) setSharedImageTexture(textureRef.current);
    }
  }, [compositeKey]);

  if (!layout || layout.length === 0) {
    return (
      <group position={[0, 0, 0]}>
        <Keycap keyId="placeholder" label="?" w={2} h={1} profile={selectedProfile} />
        <Text position={[0, 1.5, 0]} fontSize={0.4} color="#888899" anchorX="center" anchorY="middle">
          Select a keyboard to begin
        </Text>
      </group>
    );
  }

  return (
    <group position={[0, 0, 0]}>
      {/* Keyboard Chassis (replaces old flat base plate) */}
      <KeyboardChassis totalW={maxW} totalH={maxH} />

      {/* Keys calculate their offset natively to match the parent 0,0 center */}
      {layout.map((key) => {
        const kw = Math.max(0.5, Math.min(8, Number(key.w) || 1));
        const kh = Math.max(0.5, Math.min(3, Number(key.h) || 1));
        
        const gridX = Number(key.x) - minX - maxW / 2 + kw / 2;
        const gridZ = Number(key.y) - minZ - maxH / 2 + kh / 2;

        // UV offsets for wrap image mode
        const uvOffsetX = maxW > 0 ? (Number(key.x) - minX) / maxW : 0;
        const uvOffsetY = maxH > 0 ? (Number(key.y) - minZ) / maxH : 0;
        const uvScaleX = maxW > 0 ? kw / maxW : 1;
        const uvScaleY = maxH > 0 ? kh / maxH : 1;

        return (
          <Keycap
            key={key.id}
            keyId={key.id}
            label={key.label}
            x={gridX}
            y={gridZ}
            w={kw}
            h={kh}
            rowHeight={rowHeights[key.row] ?? 1.0}
            rowTilt={rowTilts[key.row] ?? 0}
            uvOffset={[uvOffsetX, uvOffsetY]}
            uvScale={[uvScaleX, uvScaleY]}
            isSelected={selectedKey === key.id}
            isPressed={pressedKeys.has(key.id)}
            isPerformanceMode={isPerformanceMode}
            onClick={() => onKeyClick ? onKeyClick(key.id) : setSelectedKey(key.id)}
            profile={selectedProfile}
            sharedImageTexture={sharedImageTexture}
          />
        );
      })}
    </group>
  );
}
