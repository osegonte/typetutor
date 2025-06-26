// Updated TypeTutorApp.jsx with Beautiful Animations and Aurora Background
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Moon, Sun, BarChart2, Upload, FileText, ChevronRight, Info, ArrowLeft, RotateCcw, Pause, Play, Target, Clock, Zap, AlertCircle, Trophy, TrendingUp, ChevronLeft } from 'lucide-react';
import { uploadPDF, processText, getStats, saveStats } from '../services/api';

// Aurora Background Component
const Aurora = (props) => {
  const {
    colorStops = ["#241593", "#3CCDD7", "#916BD6"],
    amplitude = 1.8,
    blend = 1.0,
    speed = 2.5
  } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const ctnDom = useRef(null);

  useEffect(() => {
    // Import Three.js dynamically since it's available in the environment
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      const ctn = ctnDom.current;
      if (!ctn || !window.THREE) return;

      // Simple Three.js implementation for aurora effect
      const scene = new window.THREE.Scene();
      const camera = new window.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const renderer = new window.THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        premultipliedAlpha: true 
      });
      
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      ctn.appendChild(renderer.domElement);

      // Simple aurora shader material
      const material = new window.THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new window.THREE.Vector2(ctn.offsetWidth, ctn.offsetHeight) },
          uAmplitude: { value: amplitude },
          uBlend: { value: blend },
          uSpeed: { value: speed }
        },
        vertexShader: `
          void main() {
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec2 uResolution;
          uniform float uAmplitude;
          uniform float uBlend;
          uniform float uSpeed;
          
          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 234.45));
            p += dot(p, p + 34.45);
            return fract(p.x * p.y);
          }
          
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / uResolution;
            
            // Your specified colors: #241593, #3CCDD7, #916BD6
            vec3 color1 = vec3(0.141, 0.082, 0.576); // #241593 - Dark Blue
            vec3 color2 = vec3(0.235, 0.804, 0.843); // #3CCDD7 - Cyan
            vec3 color3 = vec3(0.569, 0.420, 0.839); // #916BD6 - Purple
            
            float time = uTime * uSpeed * 0.3; // Much slower movement
            
            // Stable flowing dividing line
            float divideY = 0.5 + sin(uv.x * 2.0 + time * 0.5) * 0.1 + cos(uv.x * 4.0 - time * 0.3) * 0.05;
            
            // Determine section
            bool upperSection = uv.y > divideY;
            
            vec3 finalColor = vec3(0.0);
            float totalIntensity = 0.0;
            
            // STABLE UPPER SECTION
            if (upperSection) {
              // Create stable aurora bands
              for (float i = 0.0; i < 3.0; i++) {
                float bandY = 0.7 + i * 0.15 + sin(time * 0.4 + i * 2.0) * 0.05;
                float bandThickness = 0.08 + sin(time * 0.6 + i * 1.5) * 0.02;
                
                // Smooth horizontal waves
                float wave = sin(uv.x * 3.0 + time * 0.8 + i * 1.0) * 0.03;
                wave += sin(uv.x * 5.0 - time * 0.6 + i * 2.0) * 0.02;
                
                float dist = abs(uv.y - bandY - wave);
                float intensity = 1.0 - (dist / bandThickness);
                intensity = max(0.0, intensity);
                intensity = pow(intensity, 2.0);
                
                // Stable color mixing
                vec3 bandColor = mix(color1, color2, sin(uv.x * 2.0 + time * 0.5 + i) * 0.5 + 0.5);
                bandColor = mix(bandColor, color3, sin(uv.x * 1.5 - time * 0.3 + i * 0.5) * 0.3 + 0.3);
                
                // Gentle brightness variation
                float brightness = 0.6 + 0.3 * sin(time * 0.7 + uv.x * 3.0 + i * 1.5);
                
                finalColor += bandColor * intensity * brightness;
                totalIntensity = max(totalIntensity, intensity);
              }
            }
            
            // STABLE LOWER SECTION
            else {
              // Create stable aurora bands
              for (float i = 0.0; i < 3.0; i++) {
                float bandY = 0.1 + i * 0.12 + sin(time * 0.5 + i * 1.8) * 0.04;
                float bandThickness = 0.07 + sin(time * 0.4 + i * 2.2) * 0.02;
                
                // Smooth horizontal waves
                float wave = sin(uv.x * 2.5 + time * 0.7 + i * 1.3) * 0.03;
                wave += sin(uv.x * 4.5 - time * 0.5 + i * 1.7) * 0.02;
                
                float dist = abs(uv.y - bandY - wave);
                float intensity = 1.0 - (dist / bandThickness);
                intensity = max(0.0, intensity);
                intensity = pow(intensity, 2.0);
                
                // Stable color mixing
                vec3 bandColor = mix(color2, color3, sin(uv.x * 1.8 + time * 0.4 + i) * 0.5 + 0.5);
                bandColor = mix(bandColor, color1, sin(uv.x * 2.2 - time * 0.6 + i * 0.7) * 0.3 + 0.3);
                
                // Gentle brightness variation
                float brightness = 0.6 + 0.3 * sin(time * 0.6 + uv.x * 2.5 + i * 1.2);
                
                finalColor += bandColor * intensity * brightness;
                totalIntensity = max(totalIntensity, intensity);
              }
            }
            
            // Add subtle shimmer
            float shimmer = noise(uv * 20.0 + time * 1.0) * 0.1;
            finalColor += shimmer * color2 * totalIntensity;
            
            // Very gentle global brightness variation
            float globalBrightness = 0.8 + 0.2 * sin(time * 0.3);
            finalColor *= globalBrightness;
            
            totalIntensity *= uAmplitude;
            float alpha = totalIntensity * 0.6 * uBlend;
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        blending: window.THREE.AdditiveBlending
      });

      const geometry = new window.THREE.PlaneGeometry(2, 2);
      const mesh = new window.THREE.Mesh(geometry, material);
      scene.add(mesh);

      let animationId;
      const animate = (time) => {
        animationId = requestAnimationFrame(animate);
        material.uniforms.uTime.value = time * 0.001;
        material.uniforms.uAmplitude.value = propsRef.current.amplitude ?? amplitude;
        material.uniforms.uBlend.value = propsRef.current.blend ?? blend;
        material.uniforms.uSpeed.value = propsRef.current.speed ?? speed;
        renderer.render(scene, camera);
      };
      animate(0);

      const handleResize = () => {
        if (!ctn) return;
        const width = ctn.offsetWidth;
        const height = ctn.offsetHeight;
        renderer.setSize(width, height);
        material.uniforms.uResolution.value.set(width, height);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        if (ctn && renderer.domElement.parentNode === ctn) {
          ctn.removeChild(renderer.domElement);
        }
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [amplitude, blend, speed]);

  return <div ref={ctnDom} className="aurora-container" />;
};

// Word Text Component - No Animation, Just Gradient
const StaticGradientText = () => {
  return (
    <span className="gradient-text-container text-5xl md:text-6xl">
      Learn How While You Type
    </span>
  );
};

const TypeTutorApp = () => {
  // App state
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [activeTab, setActiveTab] = useState('home');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [typingInProgress, setTypingInProgress] = useState(false);

  // Add CSS styles for animations and aurora
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .aurora-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.7;
      }
      
      .aurora-container canvas {
        width: 100% !important;
        height: 100% !important;
      }
      
      /* Hide scrollbar specifically for textareas */
      textarea::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      
      textarea {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      html, body, *, *::before, *::after {
        scrollbar-width: thin !important;
        scrollbar-color: ${darkMode ? '#374151 #1f2937' : '#9ca3af #f3f4f6'} !important;
      }
      
      html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
        background: ${darkMode ? '#1f2937' : '#f3f4f6'} !important;
      }
      
      html::-webkit-scrollbar-track, body::-webkit-scrollbar-track, *::-webkit-scrollbar-track {
        background: ${darkMode ? '#1f2937' : '#f3f4f6'} !important;
        border-radius: 4px !important;
      }
      
      html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb, *::-webkit-scrollbar-thumb {
        background: ${darkMode ? '#374151' : '#9ca3af'} !important;
        border-radius: 4px !important;
        border: none !important;
      }
      
      html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover, *::-webkit-scrollbar-thumb:hover {
        background: ${darkMode ? '#4b5563' : '#6b7280'} !important;
      }
      
      html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner, *::-webkit-scrollbar-corner {
        background: ${darkMode ? '#1f2937' : '#f3f4f6'} !important;
      }
      
      .text-rotate {
        display: flex;
        flex-wrap: wrap;
        white-space: pre-wrap;
        position: relative;
      }
      .text-rotate-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .text-rotate-word {
        display: inline-flex;
      }
      .text-rotate-lines {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      .gradient-text-container {
        background: ${darkMode 
          ? 'linear-gradient(-45deg, #8B5CF6, #3B82F6, #06B6D4, #8B5CF6)'
          : 'linear-gradient(-45deg, #8B5CF6, #3B82F6, #06B6D4, #8B5CF6)'};
        background-size: 300% 100%;
        animation: gradient 8s linear infinite;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      
      .word-insertion-container {
        display: inline-block;
        white-space: nowrap;
      }
      
      .word-fixed, .word-how {
        display: inline-block;
        color: inherit;
        background: inherit;
        -webkit-background-clip: inherit;
        background-clip: inherit;
      }
      
      .word-how {
        transform-origin: left center;
        vertical-align: baseline;
      }
      
      .text-word-how.show {
        animation: slideInExpand 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .text-word-how.hide {
        animation: slideOutCollapse 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      @keyframes slideInExpand {
        0% {
          opacity: 0;
          width: 0;
          margin-left: 0;
          margin-right: 0;
          transform: scale(0.8);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          width: auto;
          margin-left: 0.25rem;
          margin-right: 0.25rem;
          transform: scale(1);
        }
      }
      
      @keyframes slideOutCollapse {
        0% {
          opacity: 1;
          width: auto;
          margin-left: 0.25rem;
          margin-right: 0.25rem;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.9);
        }
        100% {
          opacity: 0;
          width: 0;
          margin-left: 0;
          margin-right: 0;
          transform: scale(0.8);
        }
      }
      .text-rotate-space {
        white-space: pre;
      }
      
      .text-rotating {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      
      @keyframes fadeInScale {
        0% {
          opacity: 0;
          transform: scale(0.8);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes slideInFromLeft {
        0% {
          opacity: 0;
          transform: translateX(-10px) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
      
      @keyframes slideOutToLeft {
        0% {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateX(-10px) scale(0.8);
        }
      }
      
      @keyframes gradient {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      .text-content {
        background-size: 300% 100%;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        animation: gradient 8s linear infinite;
      }
      
      .shiny-text {
        color: ${darkMode ? '#b5b5b5a4' : '#6b7280'};
        background: linear-gradient(
          120deg,
          rgba(255, 255, 255, 0) 40%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(255, 255, 255, 0) 60%
        );
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        display: inline-block;
        animation: shine 5s linear infinite;
      }
      
      @keyframes shine {
        0% {
          background-position: 100%;
        }
        100% {
          background-position: -100%;
        }
      }
      
      .shiny-text.disabled {
        animation: none;
      }
      
      /* Make all grey text elements shiny */
      .text-gray-500, .text-gray-400, .text-gray-600 {
        color: ${darkMode ? '#b5b5b5a4' : '#6b7280'};
        background: linear-gradient(
          120deg,
          rgba(255, 255, 255, 0) 40%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(255, 255, 255, 0) 60%
        );
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        display: inline-block;
        animation: shine 5s linear infinite;
      }
      
      /* Dark mode grey text shiny effect */
      .dark .text-gray-500, .dark .text-gray-400, .dark .text-gray-600 {
        color: #b5b5b5a4;
        background: linear-gradient(
          120deg,
          rgba(255, 255, 255, 0) 40%,
          rgba(255, 255, 255, 0.6) 50%,
          rgba(255, 255, 255, 0) 60%
        );
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        display: inline-block;
        animation: shine 5s linear infinite;
      }
      
      /* Enhanced button hover effects */
      .transition-all {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Smooth hover animations for cards */
      .hover\\:scale-105:hover {
        transform: scale(1.05);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Enhanced shadow transitions */
      .hover\\:shadow-lg:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Smooth border color transitions */
      .hover\\:border-gray-600:hover, .hover\\:border-gray-400:hover {
        transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [darkMode]); // Re-run when dark mode changes
  
  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Debug mode toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsDebugMode(!isDebugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDebugMode]);

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Aurora Background */}
      <Aurora 
        colorStops={["#241593", "#3CCDD7", "#916BD6"]}
        amplitude={1.8}
        blend={1.0}
        speed={2.5}
      />
      
      {/* Header */}
      <header className={`px-6 py-4 flex justify-between items-center ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'} border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} relative z-10`}>
        <div className="flex items-center">
          <h1 className="text-xl font-bold">TypeTutor <span className="text-sm font-normal text-gray-500">Study Edition</span></h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label="Show information"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {activeTab === 'home' && (
          <HomeScreen 
            darkMode={darkMode} 
            setActiveTab={switchTab} 
            customText={customText}
            setCustomText={setCustomText}
            typingInProgress={typingInProgress}
            setTypingInProgress={setTypingInProgress}
          />
        )}
        {activeTab === 'practice' && (
          <PracticeScreen 
            darkMode={darkMode} 
            setActiveTab={switchTab}
            customText={customText}
          />
        )}
        {activeTab === 'stats' && (
          <StatsScreen darkMode={darkMode} setActiveTab={switchTab} />
        )}
        
        {/* Debug panel */}
        {isDebugMode && (
          <div className="mt-8 border-t pt-8">
            <DebuggingPanel darkMode={darkMode} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 text-center text-sm ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm text-gray-400' : 'bg-white/80 backdrop-blur-sm text-gray-500'} border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} relative z-10`}>
        TypeTutor Study Edition • Designed for maximum comfort and learning efficiency
        <span className="ml-2 text-xs opacity-50">Press Ctrl+Shift+D for debug mode</span>
      </footer>
    </div>
  );
};

// UPDATED HOMEPAGE DESIGN - With Beautiful Animations
const HomeScreen = ({ darkMode, setActiveTab, customText, setCustomText, typingInProgress, setTypingInProgress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMessage(null);
    setIsLoading(true);
    setUploadProgress(0);

    try {
      const result = await uploadPDF(file, (progress) => {
        if (progress && typeof progress === 'object' && progress.percentage) {
          setUploadProgress(progress.percentage);
        } else if (typeof progress === 'number') {
          setUploadProgress(progress);
        }
      });

      if (result && result.success) {
        if (result.items && result.items.length > 0) {
          const allContent = result.items.map(item => item.content || '').join('\n\n');
          setCustomText(allContent);
          setUploadProgress(100);
          setTimeout(() => {
            alert(`Successfully extracted ${result.items.length} study items from PDF!`);
          }, 500);
        } else {
          setErrorMessage('No content could be extracted from the PDF.');
        }
      } else {
        setErrorMessage(`Error: ${(result && result.error) || 'Failed to process PDF'}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage(error.message || error.error || 'Network error while uploading file.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleSubmitText = async () => {
    if (!customText || !customText.trim()) {
      setErrorMessage('Please enter some text to practice with.');
      return;
    }
    
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      // Try to process text through API
      const result = await processText(customText);
      
      if (result && result.success) {
        console.log('Text processed successfully:', result);
      } else {
        console.warn('Text processing failed:', (result && result.error) || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing text:', error);
      // Continue anyway since we already have the text locally
    } finally {
      setIsLoading(false);
      // Navigate to practice regardless of API result since we have the text
      setActiveTab('practice');
      setTypingInProgress(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section with Beautiful Gradient */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <StaticGradientText />
        </h1>
        <p className={`text-xl max-w-2xl mx-auto leading-relaxed shiny-text`}>
          Transform your typing practice into active learning. Study valuable content while building muscle memory and speed.
        </p>
      </div>

      {/* Quick Stats/Actions Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-500">Sessions Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-500">Minutes Practiced</div>
          </div>
        </div>
        
        <button 
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${darkMode ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart2 size={20} />
          <span>View Progress</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Upload Section */}
        <div className={`rounded-2xl border p-8 transition-all duration-200 hover:shadow-lg ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800 hover:border-gray-700' : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300 shadow-sm'}`}>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <Upload className="mr-3 text-purple-600" size={24} />
              Upload Study Material
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload PDFs, textbooks, articles, or notes to practice with educational content
            </p>
          </div>
          
          <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isLoading 
              ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-900/20' 
              : darkMode 
                ? 'border-gray-700 hover:border-gray-600' 
                : 'border-gray-300 hover:border-gray-400'
          }`}>
            {isLoading && (
              <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
                <div className="text-sm font-medium mb-2">Processing PDF...</div>
                {uploadProgress > 0 && (
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            
            <FileText className={`mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={48} />
            <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Drop your PDF here or click to browse
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-4`}>
              Supports PDF files up to 10MB
            </p>
            
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <div className="flex justify-center">
              <button 
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isLoading 
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
                }`}
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isLoading}
              >
                Choose File
              </button>
            </div>
          </div>
          
          {errorMessage && (
            <div className={`mt-4 p-4 rounded-xl text-sm ${darkMode ? 'bg-red-900/50 backdrop-blur-sm text-red-200 border border-red-800' : 'bg-red-50/80 backdrop-blur-sm text-red-700 border border-red-200'}`}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Custom Text Section */}
        <div className={`rounded-2xl border p-8 transition-all duration-200 hover:shadow-lg ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800 hover:border-gray-700' : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300 shadow-sm'}`}>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <FileText className="mr-3 text-blue-600" size={24} />
              Custom Text Practice
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Paste your own study content, notes, or any text you want to practice with
            </p>
          </div>
          
          <div className="space-y-4">
            <textarea 
              className={`w-full h-40 p-4 rounded-xl resize-none border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 overflow-hidden ${
                darkMode 
                  ? 'bg-gray-800/80 backdrop-blur-sm text-gray-200 border-gray-700 placeholder-gray-500' 
                  : 'bg-gray-50/80 backdrop-blur-sm text-gray-800 border-gray-300 placeholder-gray-400'
              }`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              placeholder="Paste or type your practice text here...

Try content like:
• Study notes from class
• Book chapters or articles  
• Technical documentation
• Language learning material
• Any educational content you want to memorize"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              disabled={isLoading}
            />
            
            <div className="flex justify-between items-center text-sm">
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                {customText ? customText.length : 0} characters
              </span>
              
              {customText && customText.trim() && (
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Ready to practice</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Start Practice Button */}
      <div className="text-center mb-12">
        <button 
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
            customText && customText.trim() 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl' 
              : darkMode 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          disabled={!customText || !customText.trim() || isLoading}
          onClick={handleSubmitText}
        >
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Play size={20} />
              <span>Start Typing Practice</span>
            </div>
          )}
        </button>
        
        {!customText?.trim() && (
          <p className={`mt-3 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Upload a file or enter text to begin practicing
          </p>
        )}
      </div>

      {/* Features Showcase */}
      <div className={`rounded-2xl border p-8 ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-gradient-to-br from-purple-50/80 to-blue-50/80 backdrop-blur-sm border-gray-200'}`}>
        <h3 className="text-2xl font-bold text-center mb-8">Why Choose TypeTutor Study Edition?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            darkMode={darkMode}
            icon={<Target className="text-purple-600" size={32} />}
            title="Learn While Practicing"
            description="Turn typing practice into active learning. Study textbooks, articles, and notes while building muscle memory."
            highlight={true}
          />
          
          <FeatureCard 
            darkMode={darkMode}
            icon={<BarChart2 className="text-blue-600" size={32} />}
            title="Detailed Analytics"
            description="Track your progress with comprehensive statistics including WPM, accuracy, consistency, and improvement trends."
          />
          
          <FeatureCard 
            darkMode={darkMode}
            icon={<Trophy className="text-yellow-600" size={32} />}
            title="Smart Progress Tracking"
            description="Set goals, maintain streaks, and see your improvement over time with intelligent performance analysis."
          />
        </div>
      </div>
    </div>
  );
};

// Enhanced Feature Card Component
const FeatureCard = ({ darkMode, icon, title, description, highlight = false }) => {
  return (
    <div className={`text-center p-6 rounded-xl transition-all duration-200 hover:transform hover:scale-105 ${
      highlight 
        ? darkMode 
          ? 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-700 backdrop-blur-sm' 
          : 'bg-gradient-to-br from-purple-100/80 to-blue-100/80 border border-purple-200 backdrop-blur-sm'
        : darkMode 
          ? 'bg-gray-800/50 backdrop-blur-sm' 
          : 'bg-white/50 backdrop-blur-sm'
    }`}>
      <div className="flex justify-center mb-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
          darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'
        } shadow-lg`}>
          {icon}
        </div>
      </div>
      <h4 className="font-bold text-lg mb-3">{title}</h4>
      <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {description}
      </p>
    </div>
  );
};

// UPDATED PRACTICE SCREEN - Paragraph-based View
const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // Core state
  const [fullText, setFullText] = useState('');
  const [paragraphs, setParagraphs] = useState([]);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Performance metrics
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [errorPositions, setErrorPositions] = useState(new Set());
  
  // Session state
  const [sessionStats, setSessionStats] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [personalBest, setPersonalBest] = useState(false);
  
  const inputRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize text and split into paragraphs
  useEffect(() => {
    const defaultText = `The art of typing is not just about speed, but about developing a rhythm and flow that becomes second nature. Through consistent practice and attention to proper technique, anyone can develop excellent typing skills.

Focus on accuracy first, then speed will naturally follow. Remember to keep your fingers on the home row and use all ten fingers for optimal efficiency.

Proper posture is essential for comfortable and efficient typing. Sit up straight with your feet flat on the floor and your wrists in a neutral position.

Regular practice sessions, even just 10-15 minutes a day, will lead to significant improvement over time. The key is consistency and patience with yourself as you build this valuable skill.`;
    
    try {
      const textToUse = customText && customText.trim() ? customText.trim() : defaultText;
      setFullText(textToUse);
      
      // Split text into paragraphs and filter out empty ones
      const paragraphArray = textToUse
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      setParagraphs(paragraphArray);
      setCurrentParagraphIndex(0);
      
      // Focus input when component mounts
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error setting text:', error);
      setFullText(defaultText);
      setParagraphs([defaultText]);
    }
  }, [customText]);

  // Timer management
  useEffect(() => {
    if (isActive && !isPaused && !isComplete) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, isComplete]);

  // Calculate metrics
  useEffect(() => {
    if (timeElapsed > 0 && userInput && userInput.length > 0) {
      try {
        const wordsTyped = userInput.length / 5;
        const minutesElapsed = timeElapsed / 60;
        const currentWpm = minutesElapsed > 0 ? Math.round(wordsTyped / minutesElapsed) : 0;
        setWpm(currentWpm);

        const currentParagraph = paragraphs[currentParagraphIndex] || '';
        let correctChars = 0;
        for (let i = 0; i < userInput.length; i++) {
          if (i < currentParagraph.length && userInput[i] === currentParagraph[i]) {
            correctChars++;
          }
        }
        const currentAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
        setAccuracy(currentAccuracy);
      } catch (error) {
        console.error('Error calculating metrics:', error);
      }
    }
  }, [userInput, timeElapsed, paragraphs, currentParagraphIndex]);

  // Handle input changes
  const handleInputChange = useCallback((e) => {
    try {
      const value = e.target.value;
      const currentParagraph = paragraphs[currentParagraphIndex] || '';
      
      // Start session on first keystroke
      if (!isActive && value.length === 1) {
        setIsActive(true);
        setStartTime(Date.now());
      }

      // Prevent typing beyond current paragraph length
      if (value.length <= currentParagraph.length) {
        setUserInput(value);
        setCurrentIndex(value.length);

        // Calculate errors
        const newErrors = new Set();
        let errorCount = 0;
        
        for (let i = 0; i < value.length; i++) {
          if (i < currentParagraph.length && value[i] !== currentParagraph[i]) {
            newErrors.add(i);
            errorCount++;
          }
        }
        
        setErrorPositions(newErrors);
        setErrors(errorCount);

        // Check paragraph completion
        if (value.length === currentParagraph.length) {
          advanceToNextParagraph();
        }
      }
    } catch (error) {
      console.error('Error handling input:', error);
    }
  }, [paragraphs, currentParagraphIndex, isActive]);

  // Advance to next paragraph
  const advanceToNextParagraph = useCallback(() => {
    if (currentParagraphIndex < paragraphs.length - 1) {
      // Move to next paragraph
      setCurrentParagraphIndex(prev => prev + 1);
      setUserInput('');
      setCurrentIndex(0);
      setErrorPositions(new Set());
      
      // Brief pause for transition
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 200);
    } else {
      // All paragraphs completed
      completeSession();
    }
  }, [currentParagraphIndex, paragraphs.length]);

  // Complete session
  const completeSession = useCallback(async () => {
    try {
      setIsComplete(true);
      setIsActive(false);
      
      const endTime = Date.now();
      const totalTime = startTime ? (endTime - startTime) / 1000 : 0;
      
      // Calculate stats for entire session
      const totalCharacters = paragraphs.reduce((sum, p) => sum + p.length, 0);
      const finalWpm = totalTime > 0 ? Math.round((totalCharacters / 5) / (totalTime / 60)) : 0;
      const finalAccuracy = accuracy;

      const stats = {
        wpm: finalWpm,
        accuracy: finalAccuracy,
        timeElapsed: Math.round(totalTime),
        errors: errors,
        totalCharacters,
        charactersPerMinute: totalTime > 0 ? Math.round(totalCharacters / (totalTime / 60)) : 0,
        completedAt: new Date().toISOString(),
        paragraphsCompleted: paragraphs.length
      };

      setSessionStats(stats);

      // Check for personal best
      try {
        const savedBest = localStorage.getItem('personalBestWpm');
        if (!savedBest || finalWpm > parseInt(savedBest)) {
          localStorage.setItem('personalBestWpm', finalWpm.toString());
          setPersonalBest(true);
        }
      } catch (error) {
        console.error('Error checking personal best:', error);
      }

      // Save stats to backend
      try {
        await saveStats({
          wpm: finalWpm,
          accuracy: finalAccuracy,
          duration: Math.round(totalTime),
          errors: errors,
          mode: 'paragraph_practice',
          itemType: customText ? 'Custom Text' : 'Default Practice',
          completedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save session stats:', error);
      }

      setShowCompletion(true);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [startTime, errors, accuracy, paragraphs, customText]);

  // Reset session
  const resetSession = useCallback(() => {
    try {
      setUserInput('');
      setCurrentIndex(0);
      setCurrentParagraphIndex(0);
      setIsActive(false);
      setIsPaused(false);
      setIsComplete(false);
      setShowCompletion(false);
      setStartTime(null);
      setWpm(0);
      setAccuracy(100);
      setTimeElapsed(0);
      setErrors(0);
      setErrorPositions(new Set());
      setSessionStats(null);
      setPersonalBest(false);
      
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }, []);

  // Toggle pause
  const togglePause = useCallback(() => {
    try {
      setIsPaused(!isPaused);
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  }, [isPaused]);

  // Navigate paragraphs manually
  const goToParagraph = useCallback((index) => {
    if (index >= 0 && index < paragraphs.length && !isActive) {
      setCurrentParagraphIndex(index);
      setUserInput('');
      setCurrentIndex(0);
      setErrorPositions(new Set());
      
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    }
  }, [paragraphs.length, isActive]);

  // Character styling for visual feedback
  const getCharacterStyle = (index) => {
    try {
      if (index < userInput.length) {
        if (errorPositions.has(index)) {
          return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-b-2 border-red-500';
        }
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
      }
      if (index === currentIndex) {
        return 'bg-blue-100 dark:bg-blue-900/50 border-l-2 border-blue-500 animate-pulse';
      }
      return 'text-gray-700 dark:text-gray-300';
    } catch (error) {
      console.error('Error getting character style:', error);
      return 'text-gray-700 dark:text-gray-300';
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    try {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0:00';
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      try {
        if (e.key === 'Escape') {
          if (isActive && !isComplete) {
            togglePause();
          }
        } else if (e.ctrlKey && e.key === 'r') {
          e.preventDefault();
          resetSession();
        }
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, isComplete, togglePause, resetSession]);

  const currentParagraph = paragraphs[currentParagraphIndex] || '';
  const progressPercentage = currentParagraph.length > 0 ? (currentIndex / currentParagraph.length) * 100 : 0;
  const overallProgress = paragraphs.length > 0 ? ((currentParagraphIndex + (progressPercentage / 100)) / paragraphs.length) * 100 : 0;

  if (!currentParagraph) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading practice text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
            darkMode 
              ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' 
              : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'
          }`}
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={togglePause}
            disabled={!isActive || isComplete}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isActive && !isComplete
                ? darkMode 
                  ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' 
                  : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'
                : 'opacity-50 cursor-not-allowed bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm'
            }`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          
          <button
            onClick={resetSession}
            className={`p-3 rounded-xl transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' 
                : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'
            }`}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Paragraph Navigation */}
      <div className={`rounded-2xl border p-6 ${
        darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Paragraph Progress</h3>
          <span className="text-sm font-medium text-purple-600">
            {currentParagraphIndex + 1} of {paragraphs.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => goToParagraph(currentParagraphIndex - 1)}
            disabled={currentParagraphIndex === 0 || isActive}
            className={`p-2 rounded-lg ${
              currentParagraphIndex === 0 || isActive 
                ? 'opacity-50 cursor-not-allowed' 
                : darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex-1 flex space-x-1">
            {paragraphs.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full flex-1 transition-all duration-300 ${
                  index < currentParagraphIndex
                    ? 'bg-green-500'
                    : index === currentParagraphIndex
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                      : darkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                }`}
                style={{
                  background: index === currentParagraphIndex 
                    ? `linear-gradient(to right, #8B5CF6 ${progressPercentage}%, ${darkMode ? '#374151' : '#E5E7EB'} ${progressPercentage}%)`
                    : undefined
                }}
              />
            ))}
          </div>
          
          <button
            onClick={() => goToParagraph(currentParagraphIndex + 1)}
            disabled={currentParagraphIndex === paragraphs.length - 1 || isActive}
            className={`p-2 rounded-lg ${
              currentParagraphIndex === paragraphs.length - 1 || isActive 
                ? 'opacity-50 cursor-not-allowed' 
                : darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="text-sm text-gray-500 text-center">
          Overall Progress: {Math.round(overallProgress)}% complete
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          darkMode={darkMode} 
          icon={<Zap size={20} />} 
          label="Speed" 
          value={`${wpm} WPM`}
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Target size={20} />} 
          label="Accuracy" 
          value={`${accuracy}%`}
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Clock size={20} />} 
          label="Time" 
          value={formatTime(timeElapsed)} 
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<AlertCircle size={20} />} 
          label="Errors" 
          value={errors}
        />
      </div>

      {/* Current Paragraph Display */}
      <div className={`rounded-2xl border p-8 ${
        darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
      }`}>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">
            Paragraph {currentParagraphIndex + 1}: Study & Type
          </h3>
          <p className="text-sm text-gray-500">
            Read the paragraph below, then type it out to practice while learning
          </p>
        </div>
        
        <div className={`text-xl leading-relaxed font-mono tracking-wide p-6 rounded-xl border overflow-hidden ${
          darkMode ? 'bg-gray-800/80 backdrop-blur-sm border-gray-700' : 'bg-gray-50/80 backdrop-blur-sm border-gray-200'
        }`}>
          <div className="break-words whitespace-pre-wrap">
            {currentParagraph.split('').map((char, index) => (
              <span
                key={index}
                className={`${getCharacterStyle(index)} transition-all duration-150 inline-block ${
                  char === ' ' ? 'w-2' : 'px-0.5'
                } py-0.5 rounded`}
                style={{ 
                  wordBreak: 'break-word',
                  display: 'inline',
                  maxWidth: '100%'
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
          <span>
            Progress: {currentIndex} / {currentParagraph.length} characters
          </span>
          <span>
            {Math.round(progressPercentage)}% of current paragraph
          </span>
        </div>
      </div>

      {/* Input Area */}
      <div className={`rounded-2xl border p-6 ${
        darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
      }`}>
        <div className="mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isComplete ? "All paragraphs completed!" : 
             isPaused ? "Session paused - Press ESC to resume" :
             isActive ? "Keep typing..." :
             "Start typing to begin this paragraph"}
          </span>
        </div>
        <textarea
          ref={inputRef}
          value={userInput}
          onChange={handleInputChange}
          disabled={isPaused || isComplete}
          placeholder={
            isComplete ? "Great job! You've completed all paragraphs." : 
            isPaused ? "Session paused" :
            "Start typing the paragraph above..."
          }
          className={`w-full h-32 p-4 rounded-xl resize-none font-mono text-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 overflow-hidden break-words ${
            darkMode 
              ? 'bg-gray-800/80 backdrop-blur-sm text-gray-100 placeholder-gray-500' 
              : 'bg-gray-50/80 backdrop-blur-sm text-gray-900 placeholder-gray-400'
          } ${isPaused || isComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
      </div>

      {/* Completion Modal */}
      {showCompletion && sessionStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-8 max-w-lg w-full ${
            darkMode ? 'bg-gray-900/95 backdrop-blur-sm border border-gray-800' : 'bg-white/95 backdrop-blur-sm border border-gray-200'
          } shadow-2xl`}>
            <div className="text-center">
              <div className="text-6xl mb-4">
                {personalBest ? '🏆' : sessionStats.accuracy >= 95 ? '🎉' : sessionStats.accuracy >= 85 ? '👍' : '💪'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {personalBest ? 'New Personal Best!' : 'All Paragraphs Complete!'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {personalBest ? 'Congratulations on your new record!' : `You've successfully completed all ${paragraphs.length} paragraphs!`}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-gray-50/80 backdrop-blur-sm'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="text-purple-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{sessionStats.wpm}</div>
                  <div className="text-sm text-gray-500">Words per minute</div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-gray-50/80 backdrop-blur-sm'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <Target className="text-green-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{sessionStats.accuracy}%</div>
                  <div className="text-sm text-gray-500">Accuracy</div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-gray-50/80 backdrop-blur-sm'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="text-blue-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{formatTime(sessionStats.timeElapsed)}</div>
                  <div className="text-sm text-gray-500">Time taken</div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-gray-50/80 backdrop-blur-sm'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="text-orange-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{sessionStats.paragraphsCompleted || paragraphs.length}</div>
                  <div className="text-sm text-gray-500">Paragraphs</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetSession}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  Practice Again
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 px-6 py-3 rounded-xl transition-colors font-medium ${
                    darkMode 
                      ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200' 
                      : 'bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/80 text-gray-700'
                  }`}
                >
                  View All Stats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help & Instructions */}
      <div className={`rounded-2xl border p-6 ${
        darkMode ? 'bg-gray-900/50 backdrop-blur-sm border-gray-800' : 'bg-gray-50/80 backdrop-blur-sm border-gray-200'
      }`}>
        <h4 className="font-semibold mb-3">Paragraph Practice Instructions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <p className="mb-2">• <strong>Read first:</strong> Study each paragraph before typing</p>
            <p className="mb-2">• <strong>Type accurately:</strong> Focus on precision over speed</p>
            <p>• <strong>Learn actively:</strong> Comprehend the content as you type</p>
          </div>
          <div>
            <p className="mb-2">• <strong>ESC:</strong> Pause/resume session</p>
            <p className="mb-2">• <strong>Ctrl+R:</strong> Restart from beginning</p>
            <p>• <strong>Auto-advance:</strong> Next paragraph when current is complete</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Stat Card Component
const StatCard = ({ darkMode, icon, label, value, valueColor = '' }) => (
  <div className={`rounded-2xl border p-6 transition-all duration-200 ${
    darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-gray-500">
        {icon}
      </div>
    </div>
    <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
  </div>
);

// Stats Screen Component
const StatsScreen = ({ darkMode, setActiveTab }) => {
  const [stats, setStats] = useState({
    averageWpm: 0,
    accuracy: 0,
    practiceMinutes: 0,
    currentStreak: 0,
    totalSessions: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStats();
        if (data) {
          setStats({
            averageWpm: data.averageWpm || 0,
            accuracy: data.accuracy || 0,
            practiceMinutes: data.practiceMinutes || 0,
            currentStreak: data.currentStreak || 0,
            totalSessions: data.totalSessions || 0,
            recentSessions: data.recentSessions || []
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Performance Statistics</h2>
        <button 
          className={`px-4 py-2 rounded-md transition-colors ${darkMode ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80' : 'bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/80'}`}
          onClick={() => setActiveTab('home')}
        >
          Back to Home
        </button>
      </div>
      
      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
        Track your typing progress over time
      </p>
      
      {error && (
        <div className={`p-4 mb-6 rounded-md ${darkMode ? 'bg-red-900/50 backdrop-blur-sm text-red-100' : 'bg-red-100/80 backdrop-blur-sm text-red-800'}`}>
          {error}
        </div>
      )}
      
      {loading ? (
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2">Loading your statistics...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              darkMode={darkMode} 
              label="Average WPM" 
              value={stats.averageWpm} 
              icon={<BarChart2 size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              label="Accuracy" 
              value={`${stats.accuracy}%`} 
              icon={<Target size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              label="Practice Time" 
              value={`${stats.practiceMinutes} mins`} 
              icon={<Clock size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              label="Current Streak" 
              value={`${stats.currentStreak} days`} 
              icon={<Trophy size={20} />} 
            />
          </div>
          
          {/* Recent Sessions */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200'} p-6`}>
            <h3 className="font-semibold text-lg mb-4">Recent Sessions</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Your last 5 typing practice sessions</p>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">WPM</th>
                    <th className="pb-2 pr-4">Accuracy</th>
                    <th className="pb-2">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSessions && stats.recentSessions.length > 0 ? (
                    stats.recentSessions.slice(0, 5).map((session, index) => (
                      <tr key={index} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <td className="py-2 pr-4">
                          {session.date ? (
                            typeof session.date === 'string' && session.date.includes('T') 
                              ? new Date(session.date).toLocaleDateString() 
                              : session.date
                          ) : 'N/A'}
                        </td>
                        <td className="py-2 pr-4">{session.duration || 'N/A'}</td>
                        <td className="py-2 pr-4">{session.wpm || 0}</td>
                        <td className="py-2 pr-4">{session.accuracy || 0}%</td>
                        <td className="py-2">{session.mode || 'Practice'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📊</div>
                          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            No sessions recorded yet
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                            Complete some typing practice to see your stats here
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TypeTutorApp;