import React, { useState, useRef, useEffect } from 'react';
import { 
    Video, Play, Pause, Scissors, FlipHorizontal, 
    Download, Camera, SkipBack, SkipForward, Upload, 
    Clock, Move, ZoomIn, ZoomOut, Grid, Maximize, 
    Save, History, Trash2, X, RefreshCw, Languages, Activity, Film,
    Volume2, Lock, Unlock
} from 'lucide-react';

const initialVideoState = {
    file: null, url: '', duration: 1, in: 0, out: 1, 
    mirror: false, pan: { x: 50, y: 50 }, vw: 1, vh: 1, scale: 1, 
};

const COLORS = {
    deepGreen: '#0A261D', cream: '#F6F3E6', orange: '#E27546', lightGreen: '#E2E8D5'
};

// --- 本地动作库全集 ---
const VIDEO_PRESETS = [
    { 
        id: 'forehand_1', 
        zh: '德约科维奇正手', 
        en: 'Djokovic-Forehand', 
        url: '/presets/forehand/djokovic_forehand.mp4' 
    },
    { 
        id: 'forehand_2', 
        zh: '辛纳正手', 
        en: 'Sinner-Forehand', 
        url: '/presets/forehand/sinner_forehand.mp4' 
    },
    { 
        id: 'backhand_1', 
        zh: '反手', 
        en: 'Backhand', 
        url: '/presets/backhand.mp4' 
    },
    { 
        id: 'serve_1', 
        zh: '莱巴金娜发球', 
        en: 'Rybakina-Serve', 
        url: '/presets/serve/rybakina_serve.mp4'    
    }
];

const translations = {
    en: {
        heroLine1: "UNLOCK YOUR", heroLine2: "FULL", heroLine3: "POTENTIAL",
        subtitle: "TENNIS SWING SYNC ANALYZER", recordsBtn: "RECORDS", ratio: "RATIO",
        ratios: { "1:1": "1:1 SQUARE", "4:3": "4:3 CLASSIC", "16:9": "16:9 WIDE", "9:16": "9:16 PORTRAIT", "3:4": "3:4 VERTICAL" },
        grid: "GRID", on: "ON", off: "OFF", refTitle: "REFERENCE", myFormTitle: "MY FORM",
        upload: "UPLOAD VIDEO", dragScroll: "DRAG / SCROLL", reset: "RESET",
        range: "RANGE", time: "TIME", start: "START", end: "END", mirror: "MIRROR",
        start0: "START 0%", end100: "END 100%", targetDuration: "TARGET DURATION",
        sec: "SEC", saveRecord: "SAVE RECORD", snapshot: "SNAPSHOT", exportMp4: "EXPORT MP4",
        exportCombined: "EXPORT SYNC", exportV1: "EXPORT PRO", exportV2: "EXPORT ME",
        archives: "ARCHIVES", noRecords: "NO RECORDS FOUND", load: "LOAD",
        exporting: "EXPORTING...", rendering: "Rendering frames. Please do not close.",
        pro: "PRO", me: "ME", skeleton: "AI SKELETON",
        skelModes: { off: "OFF", swing: "SWING CHAIN", power: "POWER CORE", torso: "TORSO AXIS" },
        uploadBtn: "UPLOAD LOCAL VIDEO",
        importFromLib: "IMPORT FROM T-MIRROR LIBRARY",
        libraryTitle: "T-MIRROR LIBRARY",
        selectVideo: "SELECT",
        lockView: "LOCK VIEW",
        unlockView: "UNLOCK",
        audioPro: "AUDIO: PRO",
        audioMe: "AUDIO: ME"
    },
    zh: {
        heroLine1: "释放你的", heroLine2: "无限", heroLine3: "潜能",
        subtitle: "网球动作同步分析工具", recordsBtn: "记录库", ratio: "画面比例",
        ratios: { "1:1": "1:1 方形", "4:3": "4:3 标准", "16:9": "16:9 宽屏", "9:16": "9:16 竖屏", "3:4": "3:4 竖排" },
        grid: "辅助线", on: "开", off: "关", refTitle: "参考动作", myFormTitle: "我的动作",
        upload: "上传视频", dragScroll: "拖拽调整 / 滚轮缩放", reset: "重新上传",
        range: "区间", time: "耗时", start: "起点", end: "终点", mirror: "镜像",
        start0: "动作起点 0%", end100: "动作终点 100%", targetDuration: "设定同步总时长",
        sec: "秒", saveRecord: "存入记录库", snapshot: "保存截屏", exportMp4: "导出合成视频",
        exportCombined: "导出对比", exportV1: "导出专业", exportV2: "导出自己",
        archives: "对比记录库", noRecords: "暂未保存任何记录", load: "加载记录",
        exporting: "正在导出视频...", rendering: "系统正在逐帧渲染，请勿离开当前页面。",
        pro: "专业", me: "自己", skeleton: "AI 骨架追踪",
        skelModes: { off: "关闭", swing: "击球链(手臂)", power: "动力链(腿部)", torso: "躯干轴(中心)" },
        uploadBtn: "选择本地视频文件",
        importFromLib: "从 T-MIRROR 动作库导入",
        libraryTitle: "T-MIRROR 动作库",
        selectVideo: "选择载入",
        lockView: "锁定画面",
        unlockView: "解锁",
        audioPro: "音轨: 专业",
        audioMe: "音轨: 自己"
    }
};

// --- 全局共享的 MediaPipe 加载锁与初始化机制 ---
let poseScriptPromise = null;
const loadPoseScript = () => {
    if (!poseScriptPromise) {
        poseScriptPromise = new Promise((resolve, reject) => {
            if (window.Pose) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    return poseScriptPromise;
};

let initMutex = Promise.resolve();

// --- 高级贝塞尔曲线渲染算法 ---
const drawSmoothCurve = (ctx, points, color) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
        let xc = (points[i].x + points[i + 1].x) / 2;
        let yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    if (points.length > 2) {
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    } else {
        ctx.lineTo(points[1].x, points[1].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
};

const VideoBox = ({ videoId, activeAudio, isViewLocked, title, vState, setVState, vRef, badgeText, isPlaying, isPlayingRef, ratioKey, showGrid, t, skelMode, lang, onOpenLibrary }) => {
    const [localTime, setLocalTime] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 50, panY: 50, w: 1, h: 1, startScale: 1 });
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const isProcessingRef = useRef(false); 
    const [isLocalPlaying, setIsLocalPlaying] = useState(false);
    const localAnimRef = useRef(null);
    
    const skelModeRef = useRef(skelMode);
    useEffect(() => {
        skelModeRef.current = skelMode;
    }, [skelMode]);

    useEffect(() => {
        let isMounted = true;
        let pose = null;

        const setupPose = async () => {
            try {
                await loadPoseScript();
                if (!isMounted) return;

                initMutex = initMutex.then(async () => {
                    if (!isMounted) return;
                    const p = new window.Pose({
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                    });
                    
                    p.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                    
                    p.onResults((results) => {
                        const canvas = canvasRef.current;
                        const ctx = canvas?.getContext('2d');
                        if (!ctx || !canvas || !results.poseLandmarks) {
                            if(ctx) ctx.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
                            return;
                        }
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        const currentMode = skelModeRef.current;
                        if (currentMode === 'off') return;

                        const landmarks = results.poseLandmarks;
                        const w = canvas.width; const h = canvas.height;
                        const getPoint = (i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h, vis: landmarks[i].visibility });

                        const drawGroup = (indices, color) => {
                            const pts = indices.map(getPoint).filter(p => p.vis > 0.5);
                            drawSmoothCurve(ctx, pts, color);
                            pts.forEach(p => {
                                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
                                ctx.fillStyle = '#F6F3E6'; ctx.fill();
                            });
                        };

                        if (currentMode === 'swing') {
                            drawGroup([11, 13, 15], COLORS.orange);
                            drawGroup([12, 14, 16], COLORS.orange);
                        } else if (currentMode === 'power') {
                            drawGroup([23, 25, 27], COLORS.orange);
                            drawGroup([24, 26, 28], COLORS.orange);
                            drawGroup([23, 24], COLORS.cream);
                        } else if (currentMode === 'torso') {
                            drawGroup([11, 12, 24, 23, 11], COLORS.orange); 
                            drawGroup([11, 24], COLORS.cream); 
                            drawGroup([12, 23], COLORS.cream); 
                            
                            const p0 = getPoint(0); const p11 = getPoint(11); const p12 = getPoint(12);
                            if (p0.vis > 0.5 && p11.vis > 0.5 && p12.vis > 0.5) {
                                const midShoulder = { x: (p11.x + p12.x) / 2, y: (p11.y + p12.y) / 2 };
                                drawSmoothCurve(ctx, [p0, midShoulder], COLORS.orange); 
                                
                                [p0, midShoulder].forEach(p => {
                                    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
                                    ctx.fillStyle = '#F6F3E6'; ctx.fill();
                                });
                            }
                        }
                    });

                    await p.initialize();
                    if (isMounted) { poseRef.current = p; pose = p; } 
                    else { p.close(); }
                });
            } catch (err) { console.error("AI Model Init Error:", err); }
        };

        setupPose();
        return () => { isMounted = false; if (pose) pose.close(); };
    }, []); 

    const processFrame = async () => {
        const currentMode = skelModeRef.current;
        if (isProcessingRef.current) return; 
        if (currentMode !== 'off' && vRef.current && vRef.current.readyState >= 2 && poseRef.current) {
            isProcessingRef.current = true;
            try { await poseRef.current.send({ image: vRef.current }); } 
            catch (e) { } 
            finally { isProcessingRef.current = false; }
        } else if (currentMode === 'off' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    useEffect(() => { processFrame(); }, [localTime, skelMode, vState.pan, vState.scale, vState.mirror]);

    useEffect(() => {
        let active = true;
        const playLoop = async () => {
            if (!active || !isPlaying) return;
            await processFrame();
            if (active && isPlaying) requestAnimationFrame(playLoop);
        };
        if (isPlaying) playLoop();
        return () => { active = false; };
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying && isLocalPlaying) { setIsLocalPlaying(false); cancelAnimationFrame(localAnimRef.current); }
    }, [isPlaying, isLocalPlaying]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleNativeWheel = (e) => {
            if (!vState.url || isViewLocked) return; 
            e.preventDefault(); 
            setVState(p => ({ ...p, scale: Math.max(1, Math.min(5, p.scale + (e.deltaY < 0 ? 0.1 : -0.1))) }));
        };
        container.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleNativeWheel);
    }, [vState.url, setVState, isViewLocked]);

    const handleZoom = (delta) => setVState(p => ({ ...p, scale: Math.max(1, Math.min(5, p.scale + delta)) }));
    const handleTimeUpdate = () => {
        if (!isPlayingRef.current && !isLocalPlaying && vRef.current) setLocalTime(vRef.current.currentTime);
    };

    const setIn = () => { if(vRef.current) setVState(p => ({ ...p, in: vRef.current.currentTime, out: Math.max(p.out, vRef.current.currentTime + 0.1) })); };
    const setOut = () => { if(vRef.current) setVState(p => ({ ...p, out: vRef.current.currentTime, in: Math.min(p.in, vRef.current.currentTime - 0.1) })); };

    const toggleLocalPlay = () => {
        if (isPlaying) return; 
        if (isLocalPlaying) {
            vRef.current.pause(); setIsLocalPlaying(false); cancelAnimationFrame(localAnimRef.current);
        } else {
            if (vRef.current.currentTime >= vState.out - 0.05) vRef.current.currentTime = vState.in;
            vRef.current.playbackRate = 1; vRef.current.play().catch(e => console.error(e));
            setIsLocalPlaying(true);
            const checkEnd = () => {
                if (!vRef.current) return;
                setLocalTime(vRef.current.currentTime);
                processFrame(); 
                if (vRef.current.currentTime >= vState.out) {
                    vRef.current.pause(); vRef.current.currentTime = vState.out;
                    setLocalTime(vState.out); setIsLocalPlaying(false); return;
                }
                localAnimRef.current = requestAnimationFrame(checkEnd);
            };
            localAnimRef.current = requestAnimationFrame(checkEnd);
        }
    };

    const handlePointerDown = (e) => {
        if (!vState.url || isPlaying || isLocalPlaying || isViewLocked) return; 
        setIsDragging(true);
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        dragStartRef.current = { x: clientX, y: clientY, panX: vState.pan.x, panY: vState.pan.y, w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight, startScale: vState.scale };
    };

    const handlePointerMove = (e) => {
        if (!isDragging || !vState.url || isViewLocked) return; 
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        const dx = clientX - dragStartRef.current.x;
        const dy = clientY - dragStartRef.current.y;
        const effectiveDx = vState.mirror ? -dx : dx;
        const [rW, rH] = ratioKey.split(':').map(Number);
        const aspectContainer = rW / rH;
        const aspectVideo = vState.vh > 0 ? vState.vw / vState.vh : 1;
        
        let baseW_pct, baseH_pct;
        if (aspectVideo > aspectContainer) { baseH_pct = 100; baseW_pct = (aspectVideo / aspectContainer) * 100; } 
        else { baseW_pct = 100; baseH_pct = (aspectContainer / aspectVideo) * 100; }
        
        const finalW_pct = baseW_pct * dragStartRef.current.startScale;
        const finalH_pct = baseH_pct * dragStartRef.current.startScale;
        const excessW_pixels = (finalW_pct / 100) * dragStartRef.current.w - dragStartRef.current.w;
        const excessH_pixels = (finalH_pct / 100) * dragStartRef.current.h - dragStartRef.current.h;

        let deltaPanX = excessW_pixels > 0 ? (effectiveDx / excessW_pixels) * 100 : 0;
        let deltaPanY = excessH_pixels > 0 ? (dy / excessH_pixels) * 100 : 0;
        setVState(p => ({ ...p, pan: { x: Math.max(0, Math.min(100, dragStartRef.current.panX - deltaPanX)), y: Math.max(0, Math.min(100, dragStartRef.current.panY - deltaPanY)) } }));
    };

    const handlePointerUp = () => setIsDragging(false);

    const percentageIn = (vState.in / vState.duration) * 100 || 0;
    const percentageWidth = ((vState.out - vState.in) / vState.duration) * 100 || 0;

    const [rW, rH] = ratioKey.split(':').map(Number);
    const aspectContainer = rW / rH;
    const aspectVideo = vState.vh > 0 ? vState.vw / vState.vh : 1;
    let baseW_pct, baseH_pct;
    if (aspectVideo > aspectContainer) { baseH_pct = 100; baseW_pct = (aspectVideo / aspectContainer) * 100; } 
    else { baseW_pct = 100; baseH_pct = (aspectContainer / aspectVideo) * 100; }
    const finalW_pct = baseW_pct * vState.scale; const finalH_pct = baseH_pct * vState.scale;
    const excessW_pct = finalW_pct - 100; const excessH_pct = finalH_pct - 100;
    const left_pct = excessW_pct > 0 ? -(excessW_pct * (vState.pan.x / 100)) : 0;
    const top_pct = excessH_pct > 0 ? -(excessH_pct * (vState.pan.y / 100)) : 0;

    const isMuted = isLocalPlaying ? false : (activeAudio !== videoId);

    return (
        <div className="bg-[#F6F3E6] rounded-lg md:rounded-xl border-2 md:border-[3px] border-[#0A261D] overflow-hidden flex flex-col shadow-[2px_2px_0px_#0A261D] md:shadow-[4px_4px_0px_#0A261D] transition-transform relative z-10 w-full">
            <div className="bg-[#0A261D] px-2 py-2 md:px-4 md:py-3 border-b-2 border-[#0A261D] flex justify-between items-center">
                <h2 className="text-[11px] sm:text-sm md:text-base font-bold text-[#F6F3E6] tracking-wider uppercase flex items-center gap-1.5 md:gap-2">
                    <Video className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E27546]" /> {title}
                </h2>
                <span className="text-[9px] md:text-xs font-black bg-[#E27546] text-[#0A261D] px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-widest">{badgeText}</span>
            </div>

            <div 
                ref={containerRef} className="relative bg-[#0A261D] group overflow-hidden touch-none w-full"
                style={{ aspectRatio: ratioKey.replace(':', '/') }}
                onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
            >
                {!vState.url ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A261D] p-3 text-center overflow-y-auto">
                        
                        <div className="relative border-2 border-dashed border-[#F6F3E6]/30 hover:border-[#E27546] rounded-lg p-4 w-full max-w-[280px] flex flex-col items-center justify-center transition-colors group/upload cursor-pointer">
                            <Upload className="w-8 h-8 mb-2 text-[#F6F3E6]/60 group-hover/upload:text-[#E27546] transition-colors" />
                            <p className="text-[11px] font-bold text-[#F6F3E6] uppercase tracking-wider">{t.uploadBtn}</p>
                            <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                                const file = e.target.files[0];
                                if(file) { if(vState.url) URL.revokeObjectURL(vState.url); setVState(p => ({ ...p, file, url: URL.createObjectURL(file), in: 0, out: 1, pan: { x: 50, y: 50 }, scale: 1 })); }
                            }} />
                        </div>

                        <div className="w-full max-w-[280px] mt-4 pt-4 border-t border-[#F6F3E6]/10">
                            <button 
                                onClick={onOpenLibrary}
                                className="w-full text-left px-4 py-3 bg-[#F6F3E6]/5 hover:bg-[#E27546] border-2 border-[#F6F3E6]/20 hover:border-[#0A261D] rounded-xl transition-all flex items-center justify-center gap-2 group/lib shadow-[2px_2px_0px_rgba(246,243,230,0.2)] hover:shadow-[4px_4px_0px_#0A261D]"
                            >
                                <Film className="w-4 h-4 text-[#F6F3E6] group-hover/lib:text-[#0A261D] transition-colors" />
                                <span className="text-[11px] font-black text-[#F6F3E6] group-hover/lib:text-[#0A261D] tracking-widest uppercase transition-colors">
                                    {t.importFromLib}
                                </span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ width: '100%', height: '100%', transform: vState.mirror ? 'scaleX(-1)' : 'none', position: 'relative' }}>
                            <video 
                                ref={vRef} src={vState.url} draggable={false} crossOrigin="anonymous"
                                style={{ position: 'absolute', width: `${finalW_pct}%`, height: `${finalH_pct}%`, left: `${left_pct}%`, top: `${top_pct}%`, objectFit: 'cover', maxWidth: 'none', maxHeight: 'none' }}
                                className={`cursor-move`} playsInline muted={isMuted}
                                onLoadedMetadata={(e) => setVState(p => ({ ...p, duration: vRef.current.duration || 1, out: vRef.current.duration || 1, vw: e.target.videoWidth || 1, vh: e.target.videoHeight || 1 }))}
                                onTimeUpdate={handleTimeUpdate}
                            />
                            <canvas 
                                ref={canvasRef} 
                                width={vState.vw || 1000} height={vState.vh || 1000} 
                                style={{ position: 'absolute', width: `${finalW_pct}%`, height: `${finalH_pct}%`, left: `${left_pct}%`, top: `${top_pct}%`, pointerEvents: 'none', zIndex: 15 }}
                            />
                        </div>

                        {showGrid && (
                            <div className="absolute inset-0 z-20 pointer-events-none mix-blend-difference">
                                <div className="absolute top-1/3 left-0 w-full h-[1px] bg-white/70" />
                                <div className="absolute top-2/3 left-0 w-full h-[1px] bg-white/70" />
                                <div className="absolute top-0 left-1/3 w-[1px] h-full bg-white/70" />
                                <div className="absolute top-0 left-2/3 w-[1px] h-full bg-white/70" />
                            </div>
                        )}
                        
                        {!isPlaying && !isLocalPlaying && !isViewLocked && (
                            <>
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A261D]/20 z-30">
                                    <div className="bg-[#0A261D] text-[#F6F3E6] border border-[#F6F3E6]/20 px-2 py-1 md:px-4 md:py-2 rounded-full backdrop-blur-md flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs font-bold uppercase tracking-wider">
                                        <Move className="w-3 h-3 md:w-4 md:h-4 text-[#E27546]" /> <span className="hidden sm:inline">{t.dragScroll}</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-40">
                                    <button onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }} className="p-1.5 md:p-2 bg-[#F6F3E6] text-[#0A261D] hover:bg-[#E27546] hover:text-[#0A261D] rounded-full border-2 border-[#0A261D] transition-colors"><ZoomIn className="w-3 h-3 md:w-4 md:h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }} className="p-1.5 md:p-2 bg-[#F6F3E6] text-[#0A261D] hover:bg-[#E27546] hover:text-[#0A261D] rounded-full border-2 border-[#0A261D] transition-colors"><ZoomOut className="w-3 h-3 md:w-4 md:h-4" /></button>
                                </div>
                            </>
                        )}
                        <button onClick={() => { if(!isPlaying && !isLocalPlaying) { if(vState.url && !vState.url.startsWith('/presets')) URL.revokeObjectURL(vState.url); setVState(initialVideoState); } }} disabled={isPlaying || isLocalPlaying} className="absolute top-2 right-2 md:top-3 md:right-3 bg-[#E27546] text-[#0A261D] border-2 border-[#0A261D] font-bold text-[9px] md:text-xs px-2 py-1 md:px-3 md:py-1.5 rounded-full opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity disabled:hidden z-30 uppercase tracking-widest hover:bg-[#F6F3E6]">{t.reset}</button>
                    </>
                )}
            </div>

            {vState.url && (
                <div className="p-2 sm:p-3 md:p-5 space-y-3 md:space-y-5 bg-[#F6F3E6]">
                    <div className="relative w-full h-6 md:h-8 group flex items-center">
                        <div className="absolute w-full h-1.5 md:h-2 bg-[#0A261D]/10 rounded-full pointer-events-none"></div>
                        <div className="absolute h-1.5 md:h-2 bg-[#E27546]/30 pointer-events-none rounded-sm border-x-2 border-[#E27546]" style={{ left: `${percentageIn}%`, width: `${percentageWidth}%` }}></div>
                        <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-[#E27546] border-2 border-[#0A261D] rounded-full shadow pointer-events-none transform -translate-x-1/2" style={{ left: `${(localTime / vState.duration) * 100 || 0}%` }}></div>
                        <input type="range" min="0" max={vState.duration || 1} step="0.01" value={localTime} onChange={e => { const t_val = parseFloat(e.target.value); vRef.current.currentTime = t_val; setLocalTime(t_val); }} disabled={isPlaying || isLocalPlaying} className="absolute left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-2 md:gap-3">
                        <button onClick={toggleLocalPlay} disabled={isPlaying} className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full border-2 border-[#0A261D] flex items-center justify-center transition-colors ${isLocalPlaying ? 'bg-[#E27546] text-[#0A261D]' : 'bg-transparent text-[#0A261D] hover:bg-[#0A261D] hover:text-[#F6F3E6]'}`}>
                            {isLocalPlaying ? <Pause className="w-3 h-3 md:w-4 md:h-4 fill-current" /> : <Play className="w-3 h-3 md:w-4 md:h-4 fill-current ml-0.5" />}
                        </button>
                        <div className="flex items-center gap-1 md:gap-2">
                            <button onClick={setIn} disabled={isPlaying || isLocalPlaying} className="p-1.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5 bg-transparent text-[#0A261D] hover:bg-[#0A261D] hover:text-[#F6F3E6] rounded-full text-[10px] md:text-xs font-bold border-2 border-[#0A261D] flex items-center gap-1 disabled:opacity-50 transition-colors uppercase"><Scissors className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden lg:inline">{t.start}</span></button>
                            <button onClick={setOut} disabled={isPlaying || isLocalPlaying} className="p-1.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5 bg-transparent text-[#0A261D] hover:bg-[#0A261D] hover:text-[#F6F3E6] rounded-full text-[10px] md:text-xs font-bold border-2 border-[#0A261D] flex items-center gap-1 disabled:opacity-50 transition-colors uppercase"><Scissors className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden lg:inline">{t.end}</span></button>
                        </div>
                        <button onClick={() => setVState(p => ({ ...p, mirror: !p.mirror }))} disabled={isPlaying || isLocalPlaying} className={`p-1.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1 border-2 border-[#0A261D] transition-colors disabled:opacity-50 sm:ml-auto uppercase ${vState.mirror ? 'bg-[#0A261D] text-[#F6F3E6]' : 'bg-transparent text-[#0A261D] hover:bg-[#0A261D]/10'}`}><FlipHorizontal className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden lg:inline">{t.mirror}</span></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function TennisSyncApp() {
    const [lang, setLang] = useState('zh');
    const t = translations[lang];
    const [v1, setV1] = useState(initialVideoState); const [v2, setV2] = useState(initialVideoState);
    const v1Ref = useRef(null); const v2Ref = useRef(null);
    const [ratioKey, setRatioKey] = useState('3:4');
    const [showGrid, setShowGrid] = useState(false);
    const [skelMode, setSkelMode] = useState('off'); 
    
    const [isViewLocked, setIsViewLocked] = useState(false); 
    const [activeAudio, setActiveAudio] = useState('v1'); 

    const [masterProgress, setMasterProgress] = useState(0); 
    const [isPlaying, setIsPlaying] = useState(false);
    const isPlayingRef = useRef(false); const animationRef = useRef(null);
    const [targetTime, setTargetTime] = useState(6.0); 
    const [isExporting, setIsExporting] = useState(false);
    
    const [records, setRecords] = useState([]); 
    const [showRecords, setShowRecords] = useState(false);
    const [libraryTarget, setLibraryTarget] = useState(null); 

    const syncVideosToProgress = (p) => {
        if (v1Ref.current && v1.url) v1Ref.current.currentTime = v1.in + p * (v1.out - v1.in);
        if (v2Ref.current && v2.url) v2Ref.current.currentTime = v2.in + p * (v2.out - v2.in);
    };

    const togglePlay = () => {
        const safeTargetTime = parseFloat(targetTime) || 6;
        if (isPlaying) {
            setIsPlaying(false); isPlayingRef.current = false;
            if (v1Ref.current) v1Ref.current.pause(); if (v2Ref.current) v2Ref.current.pause();
            cancelAnimationFrame(animationRef.current);
        } else {
            setIsPlaying(true); isPlayingRef.current = true;
            let startP = masterProgress;
            if (masterProgress >= 1) { startP = 0; setMasterProgress(0); syncVideosToProgress(0); }
            if (v1Ref.current) { const r1 = safeTargetTime > 0 && (v1.out - v1.in) > 0 ? (v1.out - v1.in) / safeTargetTime : 1; v1Ref.current.playbackRate = r1; v1Ref.current.play().catch(e => console.error(e)); }
            if (v2Ref.current) { const r2 = safeTargetTime > 0 && (v2.out - v2.in) > 0 ? (v2.out - v2.in) / safeTargetTime : 1; v2Ref.current.playbackRate = r2; v2Ref.current.play().catch(e => console.error(e)); }
            const currentV1In = v1.in; const currentV1Out = v1.out;
            const loop = () => {
                if (!v1Ref.current || !isPlayingRef.current) return;
                let p = (v1Ref.current.currentTime - currentV1In) / (currentV1Out - currentV1In);
                if (p >= 1) { p = 1; setMasterProgress(1); setIsPlaying(false); isPlayingRef.current = false; v1Ref.current.pause(); if(v2Ref.current) v2Ref.current.pause(); return; }
                setMasterProgress(p); animationRef.current = requestAnimationFrame(loop);
            };
            animationRef.current = requestAnimationFrame(loop);
        }
    };

    const drawVideoToRect = (ctx, video, mirror, pan, scale, x, y, w, h) => {
        if (!video || video.readyState < 2) return;
        const vw = video.videoWidth; const vh = video.videoHeight;
        if (vw === 0 || vh === 0) return;
        const baseScale = Math.max(w / vw, h / vh);
        const finalScale = baseScale * scale;
        const nw = vw * finalScale; const nh = vh * finalScale;
        const excessX = nw - w; const excessY = nh - h;
        const dx = x - excessX * (pan.x / 100); const dy = y - excessY * (pan.y / 100);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); 
        if (mirror) {
            const centerX = x + w / 2; ctx.translate(centerX, 0); ctx.scale(-1, 1); ctx.translate(-centerX, 0);
        }
        ctx.drawImage(video, dx, dy, nw, nh); ctx.restore();
    };

    const handleSaveRecord = () => {
        if (!v1.url || !v2.url) return;
        const canvas = document.createElement('canvas');
        const [rW, rH] = ratioKey.split(':').map(Number);
        const singleW = 400; const singleH = (singleW * rH) / rW;
        canvas.width = singleW * 2; canvas.height = singleH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = COLORS.deepGreen; ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawVideoToRect(ctx, v1Ref.current, v1.mirror, v1.pan, v1.scale, 0, 0, singleW, singleH);
        drawVideoToRect(ctx, v2Ref.current, v2.mirror, v2.pan, v2.scale, singleW, 0, singleW, singleH);
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
        const safeTargetTime = parseFloat(targetTime) || 6;
        const newRecord = {
            id: Date.now(), time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(),
            thumbnail: thumbUrl, ratioKey, targetTime: safeTargetTime,
            v1: { file: v1.file, in: v1.in, out: v1.out, pan: v1.pan, scale: v1.scale, mirror: v1.mirror, url: v1.url },
            v2: { file: v2.file, in: v2.in, out: v2.out, pan: v2.pan, scale: v2.scale, mirror: v2.mirror, url: v2.url }
        };
        setRecords(prev => [newRecord, ...prev]); setShowRecords(true); 
    };

    const loadRecord = (record) => {
        if (isPlaying) togglePlay();
        if (v1.url && !v1.url.startsWith('/presets')) URL.revokeObjectURL(v1.url); 
        if (v2.url && !v2.url.startsWith('/presets')) URL.revokeObjectURL(v2.url);
        
        const getUrl = (v) => v.file ? URL.createObjectURL(v.file) : v.url;
        setV1({ ...initialVideoState, ...record.v1, url: getUrl(record.v1) });
        setV2({ ...initialVideoState, ...record.v2, url: getUrl(record.v2) });
        setRatioKey(record.ratioKey); setTargetTime(record.targetTime); setMasterProgress(0); setShowRecords(false);
    };

    const deleteRecord = (id) => setRecords(prev => prev.filter(r => r.id !== id));

    const handleScreenshot = () => {
        const canvas = document.createElement('canvas');
        const [rW, rH] = ratioKey.split(':').map(Number);
        const singleW = 960; const singleH = (singleW * rH) / rW;
        canvas.width = 1920; canvas.height = singleH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = COLORS.deepGreen; ctx.fillRect(0, 0, 1920, singleH);
        drawVideoToRect(ctx, v1Ref.current, v1.mirror, v1.pan, v1.scale, 0, 0, singleW, singleH);
        drawVideoToRect(ctx, v2Ref.current, v2.mirror, v2.pan, v2.scale, singleW, 0, singleW, singleH);
        const link = document.createElement('a'); link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.download = `SYNC_${new Date().getTime()}.jpg`; link.click();
    };

    const handleExportVideo = (mode = 'combined') => {
        if(isPlaying) togglePlay(); setIsExporting(true);
        const safeTargetTime = parseFloat(targetTime) || 6;
        const canvas = document.createElement('canvas');
        const [rW, rH] = ratioKey.split(':').map(Number);
        const singleW = 960; const singleH = (singleW * rH) / rW;
        canvas.width = mode === 'combined' ? 1920 : 960; canvas.height = singleH + 20; 
        const ctx = canvas.getContext('2d');
        let mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        
        const stream = canvas.captureStream(30); 
        
        try {
            const addAudioTracks = (videoNode) => {
                if (!videoNode) return;
                let vStream = null;
                if (videoNode.captureStream) vStream = videoNode.captureStream();
                else if (videoNode.mozCaptureStream) vStream = videoNode.mozCaptureStream();
                
                if (vStream) {
                    vStream.getAudioTracks().forEach(track => stream.addTrack(track));
                }
            };
            if (mode === 'combined' || mode === 'v1') addAudioTracks(v1Ref.current);
            if (mode === 'combined' || mode === 'v2') addAudioTracks(v2Ref.current);
        } catch (err) { console.warn("Audio mixing failed:", err); }

        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        
        const fallbackDownload = (blob, filename) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); 
            link.href = url; link.download = filename;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
        };

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = async () => {
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const filename = `SYNC_${mode.toUpperCase()}_${new Date().getTime()}.${ext}`;
            const blob = new Blob(chunks, { type: mimeType });
            const file = new File([blob], filename, { type: mimeType });
            
            setIsExporting(false);
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ files: [file], title: 'T-MIRROR Sync Video' }); } 
                catch (err) { fallbackDownload(blob, filename); }
            } else { fallbackDownload(blob, filename); }
        };

        if (v1Ref.current && v1.url) { v1Ref.current.currentTime = v1.in; v1Ref.current.playbackRate = safeTargetTime > 0 ? (v1.out - v1.in) / safeTargetTime : 1; }
        if (v2Ref.current && v2.url) { v2Ref.current.currentTime = v2.in; v2Ref.current.playbackRate = safeTargetTime > 0 ? (v2.out - v2.in) / safeTargetTime : 1; }

        setTimeout(() => {
            recorder.start();
            if (v1Ref.current && v1.url) v1Ref.current.play().catch(e => console.error(e));
            if (v2Ref.current && v2.url) v2Ref.current.play().catch(e => console.error(e));
            let p = 0; const durationMs = safeTargetTime * 1000; let startTime = performance.now();
            ctx.fillStyle = COLORS.deepGreen; ctx.fillRect(0, 0, canvas.width, singleH + 20);

            const exportLoop = (now) => {
                let elapsed = now - startTime; p = Math.min(elapsed / durationMs, 1); setMasterProgress(p);
                ctx.fillStyle = COLORS.deepGreen; ctx.fillRect(0, 0, canvas.width, singleH + 20);
                
                if (mode === 'combined' || mode === 'v1') drawVideoToRect(ctx, v1Ref.current, v1.mirror, v1.pan, v1.scale, 0, 0, singleW, singleH);
                if (mode === 'combined') drawVideoToRect(ctx, v2Ref.current, v2.mirror, v2.pan, v2.scale, singleW, 0, singleW, singleH);
                else if (mode === 'v2') drawVideoToRect(ctx, v2Ref.current, v2.mirror, v2.pan, v2.scale, 0, 0, singleW, singleH);

                ctx.fillStyle = COLORS.orange; ctx.fillRect(0, singleH, canvas.width * p, 20); 
                if (p < 1) { requestAnimationFrame(exportLoop); } 
                else {
                    if (v1Ref.current) v1Ref.current.pause(); if (v2Ref.current) v2Ref.current.pause();
                    setTimeout(() => recorder.stop(), 300); 
                }
            };
            requestAnimationFrame(exportLoop);
        }, 500);
    };

    const bothReady = v1.url && v2.url;

    return (
        <div className="min-h-screen font-sans text-[#0A261D] pb-10 sm:pb-24 relative selection:bg-[#E27546] selection:text-[#0A261D] overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img src="https://cloudfront-us-east-2.images.arcpublishing.com/reuters/VYVWW7E64FNYDDDHHIH5ATFH6A.jpg" alt="Background" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-[#F6F3E6]/60 backdrop-blur-[2px]"></div>
            </div>
            
            <div className="max-w-7xl mx-auto relative z-10 p-3 sm:p-4 md:p-8">
                <div className="flex flex-col items-center mb-6 pt-2 md:pt-8">
                    <div className="w-full flex justify-center sm:justify-end mb-6 md:mb-12 gap-2 sm:gap-3">
                        <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="flex items-center gap-1.5 bg-[#F6F3E6] border-2 border-[#0A261D] px-3 py-1.5 rounded-full text-[#0A261D] font-black uppercase text-[10px] sm:text-xs hover:bg-[#0A261D] hover:text-[#F6F3E6] transition-colors shadow-[2px_2px_0px_#0A261D]"><Languages className="w-3.5 h-3.5" />{lang === 'zh' ? 'EN' : '中'}</button>
                        <button onClick={() => setShowRecords(true)} className="flex items-center gap-1.5 bg-[#F6F3E6] border-2 border-[#0A261D] px-3 sm:px-4 py-1.5 rounded-full text-[#0A261D] font-bold uppercase text-[10px] sm:text-xs hover:bg-[#0A261D] hover:text-[#F6F3E6] transition-colors shadow-[2px_2px_0px_#0A261D]"><History className="w-3.5 h-3.5" />{t.recordsBtn} {records.length > 0 && <span className="bg-[#E27546] text-[#0A261D] px-1.5 sm:px-2 py-0.5 rounded-full">{records.length}</span>}</button>
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-[8rem] lg:text-[10rem] font-black uppercase tracking-tighter text-[#0A261D] leading-[0.8] text-center mb-4 md:mb-6 relative">T-<span className="text-[#E27546]">MIRROR</span></h1>
                    <div className="flex items-center gap-2 sm:gap-4 mb-2 md:mb-8"><div className="h-[2px] w-6 sm:w-8 md:w-16 bg-[#E27546]"></div><p className="text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase text-[#0A261D] whitespace-nowrap">{t.subtitle}</p><div className="h-[2px] w-6 sm:w-8 md:w-16 bg-[#E27546]"></div></div>
                </div>
                
                <div className="bg-[#0A261D] rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-6 md:mb-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shadow-[4px_4px_0px_rgba(10,38,29,0.3)]">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-[#E27546]" />
                            <span className="hidden sm:inline text-xs font-bold text-[#F6F3E6] uppercase">{t.ratio}</span>
                            <select value={ratioKey} onChange={e => setRatioKey(e.target.value)} disabled={isPlaying} className="bg-transparent border-b-2 border-[#E27546] text-[#F6F3E6] text-xs font-bold block px-1 py-1 outline-none cursor-pointer appearance-none">
                                {Object.entries(t.ratios).map(([key, label]) => (<option key={key} value={key} className="text-black">{label}</option>))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <button onClick={() => setShowGrid(!showGrid)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase transition-colors border-2 border-[#E27546] text-[#F6F3E6] hover:bg-[#E27546] hover:text-[#0A261D]">
                                <Grid className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.grid}</span> {showGrid ? t.on : t.off}
                            </button>
                            <button onClick={() => setIsViewLocked(!isViewLocked)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase transition-colors border-2 border-[#E27546] ${isViewLocked ? 'bg-[#E27546] text-[#0A261D]' : 'text-[#F6F3E6] hover:bg-[#E27546] hover:text-[#0A261D]'}`}>
                                {isViewLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />} 
                                <span className="hidden sm:inline">{t.lockView}</span> {isViewLocked ? t.on : t.off}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#E27546] flex-shrink-0" />
                        <span className="hidden lg:inline text-xs font-bold text-[#F6F3E6] uppercase mr-2">{t.skeleton}</span>
                        {Object.entries(t.skelModes).map(([key, label]) => (
                            <button 
                                key={key} onClick={() => setSkelMode(key)} 
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase transition-colors border-2 flex-shrink-0 ${skelMode === key ? 'bg-[#E27546] text-[#0A261D] border-[#E27546]' : 'bg-transparent text-[#F6F3E6] border-[#F6F3E6]/30 hover:border-[#E27546]'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-6 lg:gap-8">
                    <VideoBox videoId="v1" activeAudio={activeAudio} isViewLocked={isViewLocked} title={t.refTitle} vState={v1} setVState={setV1} vRef={v1Ref} badgeText={t.pro} isPlaying={isPlaying} isPlayingRef={isPlayingRef} ratioKey={ratioKey} showGrid={showGrid} t={t} skelMode={skelMode} lang={lang} onOpenLibrary={() => setLibraryTarget('v1')} />
                    <VideoBox videoId="v2" activeAudio={activeAudio} isViewLocked={isViewLocked} title={t.myFormTitle} vState={v2} setVState={setV2} vRef={v2Ref} badgeText={t.me} isPlaying={isPlaying} isPlayingRef={isPlayingRef} ratioKey={ratioKey} showGrid={showGrid} t={t} skelMode={skelMode} lang={lang} onOpenLibrary={() => setLibraryTarget('v2')} />
                </div>

                {bothReady && (
                    <div className="bg-[#0A261D] rounded-xl shadow-[4px_4px_0px_#E27546] md:shadow-[6px_6px_0px_#E27546] border-2 border-[#0A261D] p-3 sm:p-5 md:p-8 mt-6 md:mt-8 flex flex-row items-center gap-3 sm:gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <button onClick={togglePlay} className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-[#E27546] text-[#0A261D] rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 group shadow-inner">
                            {isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-current" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-current ml-1 sm:ml-2" />}
                        </button>
                        <div className="flex-1 w-full flex flex-col justify-center">
                            <div className="flex justify-between items-center text-[10px] sm:text-xs md:text-sm text-[#F6F3E6] mb-2 sm:mb-3 font-bold uppercase tracking-widest px-1">
                                <button 
                                    onClick={() => setActiveAudio(prev => prev === 'v1' ? 'v2' : 'v1')}
                                    className="flex items-center gap-1.5 bg-[#0A261D] px-2 py-1 md:px-3 md:py-1.5 rounded-full hover:bg-[#E27546] hover:text-[#0A261D] transition-colors border-2 border-[#E27546] text-[#F6F3E6]"
                                >
                                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                                    <span className="text-[9px] sm:text-[10px] whitespace-nowrap">{activeAudio === 'v1' ? t.audioPro : t.audioMe}</span>
                                </button>
                                <span>{Math.round(masterProgress * 100)}%</span>
                            </div>
                            <input type="range" min="0" max="1" step="0.001" value={masterProgress} onMouseDown={() => { if(isPlaying) togglePlay(); }} onTouchStart={() => { if(isPlaying) togglePlay(); }} onChange={e => { const p = parseFloat(e.target.value); setMasterProgress(p); syncVideosToProgress(p); }} className="w-full h-2 sm:h-3 bg-[#F6F3E6]/20 rounded-full appearance-none cursor-pointer accent-[#E27546] outline-none" />
                        </div>
                    </div>
                )}

                <div className={`flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-6 sm:mt-8 gap-3 sm:gap-4 transition-all duration-500 ${bothReady ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'}`}>
                    <div className="flex flex-row items-center justify-between lg:justify-start gap-4 bg-[#F6F3E6] border-2 border-[#0A261D] px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-[4px_4px_0px_#0A261D]">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#E27546]"/>
                            <label className="text-[10px] sm:text-xs text-[#0A261D]/70 font-black uppercase tracking-widest">{t.targetDuration}</label>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-[#0A261D]">
                            <input type="number" min="0.5" max="10" step="0.5" value={targetTime} onChange={e => setTargetTime(e.target.value)} disabled={isPlaying} className="w-12 sm:w-16 bg-transparent text-lg sm:text-xl font-black border-b-2 border-[#0A261D] focus:border-[#E27546] outline-none text-center rounded-none" />
                            <span className="font-bold uppercase text-xs sm:text-sm">{t.sec}</span>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full lg:w-auto">
                            <button onClick={handleSaveRecord} className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-4 bg-[#F6F3E6] text-[#0A261D] rounded-xl border-2 border-[#0A261D] hover:bg-[#E27546] transition-colors font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-[2px_2px_0px_#0A261D]">
                                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t.saveRecord}</span><span className="sm:hidden">记录</span>
                            </button>
                            <button onClick={handleScreenshot} className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-4 bg-[#F6F3E6] text-[#0A261D] rounded-xl border-2 border-[#0A261D] hover:bg-[#E27546] transition-colors font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-[2px_2px_0px_#0A261D]">
                                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t.snapshot}</span><span className="sm:hidden">截图</span>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
                            <button onClick={() => handleExportVideo('combined')} className="sm:col-span-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-4 bg-[#0A261D] text-[#F6F3E6] rounded-xl border-2 border-[#0A261D] hover:bg-[#E27546] hover:text-[#0A261D] transition-colors font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-[2px_2px_0px_#0A261D]">
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t.exportCombined}
                            </button>
                            <div className="grid grid-cols-2 sm:col-span-2 gap-2 sm:gap-3">
                                <button onClick={() => handleExportVideo('v1')} className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-4 bg-[#E27546] text-[#0A261D] rounded-xl border-2 border-[#0A261D] hover:bg-[#F6F3E6] transition-colors font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_#0A261D]">
                                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t.exportV1}
                                </button>
                                <button onClick={() => handleExportVideo('v2')} className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-4 bg-[#E27546] text-[#0A261D] rounded-xl border-2 border-[#0A261D] hover:bg-[#F6F3E6] transition-colors font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_#0A261D]">
                                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t.exportV2}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {libraryTarget && (
                <div className="fixed inset-0 bg-[#0A261D]/80 backdrop-blur-md flex justify-center items-center z-50 p-3 sm:p-4 md:p-8 animate-in fade-in">
                    <div className="bg-[#F6F3E6] border-2 sm:border-4 border-[#0A261D] rounded-none w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[6px_6px_0px_#E27546] md:shadow-[12px_12px_0px_#E27546]">
                        <div className="flex justify-between items-center p-4 md:p-6 border-b-2 sm:border-b-4 border-[#0A261D] bg-[#0A261D] text-[#F6F3E6]">
                            <h2 className="text-lg md:text-2xl font-black uppercase tracking-widest flex items-center gap-2 md:gap-3">
                                <Film className="w-5 h-5 md:w-6 md:h-6 text-[#E27546]" /> {t.libraryTitle}
                            </h2>
                            <button onClick={() => setLibraryTarget(null)} className="hover:text-[#E27546] transition-colors"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
                        </div>
                        <div className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col gap-3 md:gap-4 bg-[#F6F3E6]">
                            {VIDEO_PRESETS.map((preset) => (
                                <div key={preset.id} className="bg-white border-2 border-[#0A261D] shadow-[4px_4px_0px_#0A261D] flex flex-row items-center justify-between p-3 md:p-4 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#E27546] transition-all">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0A261D] flex items-center justify-center rounded-full flex-shrink-0">
                                            <Play className="w-4 h-4 md:w-5 md:h-5 text-[#E27546] ml-1" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-[#0A261D] text-xs md:text-sm tracking-wide uppercase">{lang === 'zh' ? preset.zh : preset.en}</span>
                                            <span className="text-[9px] md:text-[10px] font-bold text-[#0A261D]/50 uppercase tracking-widest">{preset.id}.mp4</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const targetSetter = libraryTarget === 'v1' ? setV1 : setV2;
                                            const targetState = libraryTarget === 'v1' ? v1 : v2;
                                            if (targetState.url && !targetState.url.startsWith('/presets')) URL.revokeObjectURL(targetState.url);
                                            targetSetter(prev => ({ ...prev, file: null, url: preset.url, in: 0, out: 1, pan: { x: 50, y: 50 }, scale: 1 }));
                                            setLibraryTarget(null);
                                        }}
                                        className="bg-[#E27546] text-[#0A261D] px-4 py-2 border-2 border-[#0A261D] font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-[#0A261D] hover:text-[#F6F3E6] transition-colors"
                                    >
                                        {t.selectVideo}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showRecords && (
                <div className="fixed inset-0 bg-[#0A261D]/80 backdrop-blur-md flex justify-center items-center z-50 p-3 sm:p-4 md:p-8 animate-in fade-in">
                    <div className="bg-[#F6F3E6] border-2 sm:border-4 border-[#0A261D] rounded-none w-full max-w-5xl max-h-[95vh] flex flex-col shadow-[6px_6px_0px_#E27546] md:shadow-[12px_12px_0px_#E27546]">
                        <div className="flex justify-between items-center p-4 md:p-6 border-b-2 sm:border-b-4 border-[#0A261D] bg-[#0A261D] text-[#F6F3E6]">
                            <h2 className="text-lg md:text-2xl font-black uppercase tracking-widest flex items-center gap-2 md:gap-3">
                                <History className="w-5 h-5 md:w-6 md:h-6 text-[#E27546]" /> {t.archives}
                            </h2>
                            <button onClick={() => setShowRecords(false)} className="hover:text-[#E27546] transition-colors"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
                        </div>
                        <div className="p-4 md:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 bg-[#F6F3E6]">
                            {records.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center text-[#0A261D]/40 py-16 md:py-20 gap-3 md:gap-4">
                                    <Save className="w-12 h-12 md:w-16 md:h-16 opacity-30" />
                                    <p className="font-bold text-xs md:text-base uppercase tracking-widest">{t.noRecords}</p>
                                </div>
                            ) : (
                                records.map(record => (
                                    <div key={record.id} className="bg-white border-2 border-[#0A261D] shadow-[4px_4px_0px_#0A261D] flex flex-col group p-2">
                                        <div className="relative bg-[#0A261D] border-2 border-[#0A261D]">
                                            <img src={record.thumbnail} className="w-full h-auto object-contain" alt="Thumb" />
                                            <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-[#E27546] text-[#0A261D] font-black text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 uppercase tracking-wider">{t.ratios[record.ratioKey]}</div>
                                        </div>
                                        <div className="pt-3 md:pt-4 pb-1 md:pb-2 px-1 md:px-2 flex flex-col gap-2 md:gap-4 flex-1">
                                            <div>
                                                <div className="text-xs md:text-sm font-black text-[#0A261D] tracking-wide uppercase">{record.date}</div>
                                                <div className="text-[10px] md:text-xs font-bold text-[#0A261D]/50">{record.time}</div>
                                            </div>
                                            <div className="flex justify-between items-end gap-2 mt-auto">
                                                <button onClick={() => loadRecord(record)} className="flex-1 bg-[#0A261D] text-[#F6F3E6] py-1.5 md:py-2 font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-[#E27546] hover:text-[#0A261D] border-2 border-[#0A261D] transition-colors">{t.load}</button>
                                                <button onClick={() => deleteRecord(record.id)} className="px-2 md:px-3 py-1.5 md:py-2 bg-transparent text-[#0A261D] border-2 border-[#0A261D] hover:bg-[#E27546] transition-colors"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isExporting && (
                <div className="fixed inset-0 bg-[#0A261D]/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-[#F6F3E6] border-4 border-[#0A261D] p-6 md:p-10 shadow-[8px_8px_0px_#E27546] md:shadow-[12px_12px_0px_#E27546] flex flex-col items-center w-full max-w-sm">
                        <RefreshCw className="w-10 h-10 md:w-16 md:h-16 text-[#E27546] animate-spin mb-4 md:mb-6" />
                        <h3 className="text-xl md:text-2xl font-black text-[#0A261D] uppercase tracking-widest mb-2">{t.exporting}</h3>
                        <p className="text-[#0A261D]/60 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6 md:mb-8 text-center">{t.rendering}</p>
                        <div className="w-full bg-[#0A261D]/10 h-3 md:h-4 border-2 border-[#0A261D] overflow-hidden">
                            <div className="bg-[#E27546] h-full transition-all duration-75" style={{ width: `${masterProgress * 100}%` }} />
                        </div>
                        <span className="text-xs md:text-sm font-black text-[#0A261D] mt-2 md:mt-3">{Math.round(masterProgress * 100)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}