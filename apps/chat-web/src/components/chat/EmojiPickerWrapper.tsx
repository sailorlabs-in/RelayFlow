import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

export const EmojiPicker = dynamic(
  async () => {
    const [Picker, data] = await Promise.all([
      import('@emoji-mart/react'),
      import('@emoji-mart/data'),
    ]);
    return function EmojiPickerWrapper(props: any) {
      const wrapperRef = useRef<HTMLDivElement>(null);
      const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
        'dark',
      );

      useEffect(() => {
        const updateTheme = () => {
          const docTheme = document.documentElement.getAttribute('data-theme');
          if (docTheme === 'light') {
            setCurrentTheme('light');
          } else if (docTheme === 'dark') {
            setCurrentTheme('dark');
          } else {
            const isLightSystem = window.matchMedia(
              '(prefers-color-scheme: light)',
            ).matches;
            setCurrentTheme(isLightSystem ? 'light' : 'dark');
          }
        };

        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'data-theme-schema'],
        });

        return () => observer.disconnect();
      }, []);

      useEffect(() => {
        const isLight = currentTheme === 'light';
        const injectStyles = () => {
          if (!wrapperRef.current) {
            return;
          }
          const innerDiv = wrapperRef.current
            .firstElementChild as HTMLElement | null;
          if (innerDiv) {
            innerDiv.style.width = '100%';
            innerDiv.style.maxWidth = '100%';
            innerDiv.style.display = 'flex';
            innerDiv.style.flexDirection = 'column';
            innerDiv.style.alignItems = 'stretch';
          }
          const pickerEl = wrapperRef.current.querySelector('em-emoji-picker');
          if (pickerEl && pickerEl.shadowRoot) {
            const scrollInner = pickerEl.shadowRoot.querySelector(
              '.scroll > div',
            ) as HTMLElement | null;
            if (scrollInner) {
              scrollInner.style.width = '100%';
              scrollInner.style.maxWidth = '100%';
            }
            let style = pickerEl.shadowRoot.querySelector(
              '#em-theme-style',
            ) as HTMLStyleElement | null;
            if (!style) {
              style = document.createElement('style');
              style.id = 'em-theme-style';
              pickerEl.shadowRoot.appendChild(style);
            }
            style.textContent = `
              :host {
                width: 100% !important;
                max-width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                height: 440px !important;
              }
              @media (max-width: 639px) {
                :host {
                  height: min(440px, 52vh) !important;
                }
              }
              #root {
                --padding: 8px !important;
                width: 100% !important;
                max-width: 100% !important;
                height: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                overflow: hidden !important;
                background-color: transparent !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                font-family: inherit !important;
              }
              .scroll {
                width: 100% !important;
                max-width: 100% !important;
                flex: 1 1 auto !important;
                min-height: 0 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding-left: 8px !important;
                padding-right: 8px !important;
                box-sizing: border-box !important;
              }
              .scroll > div,
              .scroll > div > div {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
              }
              .sticky {
                background-color: ${isLight ? 'rgba(248, 244, 234, 0.96)' : 'rgba(17, 28, 50, 0.96)'} !important;
                background: ${isLight ? 'rgba(248, 244, 234, 0.96)' : 'rgba(17, 28, 50, 0.96)'} !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                color: ${isLight ? '#475569' : '#cbd5e1'} !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                letter-spacing: 0.02em !important;
                padding: 6px 10px !important;
                margin: 0 !important;
                position: sticky !important;
                top: 0 !important;
                z-index: 5 !important;
                border-bottom: 1px solid ${isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'} !important;
              }
              #nav {
                border-bottom: 1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'} !important;
                width: 100% !important;
                padding-left: 6px !important;
                padding-right: 6px !important;
                box-sizing: border-box !important;
              }
              #nav button {
                color: ${isLight ? '#64748b' : '#94a3b8'} !important;
              }
              #nav button[aria-selected="true"] {
                color: var(--accent-primary, #0284c7) !important;
              }
              #nav .bar {
                background-color: var(--accent-primary, #0284c7) !important;
              }
              #nav[data-position="top"]:before,
              #preview[data-position="top"]:before,
              #nav[data-position="bottom"]:before,
              #preview[data-position="bottom"]:before {
                display: none !important;
              }
              /* Search container row */
              .spacer + .flex-middle,
              .flex-middle:has(> .search) {
                padding: 8px 8px 6px !important;
                gap: 8px !important;
                display: flex !important;
                align-items: center !important;
                box-sizing: border-box !important;
                width: 100% !important;
              }
              .search {
                padding: 0 !important;
                margin: 0 !important;
                position: relative !important;
                flex: 1 1 auto !important;
                display: flex !important;
                align-items: center !important;
              }
              .search input[type="search"] {
                width: 100% !important;
                height: 38px !important;
                line-height: 38px !important;
                padding: 0 34px 0 36px !important;
                background-color: ${isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.06)'} !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'} !important;
                border-radius: 9999px !important;
                color: ${isLight ? '#0f172a' : '#f8fafc'} !important;
                font-size: 13.5px !important;
                font-weight: 500 !important;
                box-sizing: border-box !important;
                box-shadow: ${isLight ? '0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.8)' : 'inset 0 1px 2px rgba(0, 0, 0, 0.25)'} !important;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                outline: none !important;
              }
              .search input[type="search"]::placeholder {
                color: ${isLight ? '#64748b' : '#94a3b8'} !important;
                opacity: 1 !important;
                font-weight: 400 !important;
              }
              .search input[type="search"]:focus {
                background-color: ${isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.1)'} !important;
                border-color: var(--accent-primary, ${isLight ? '#0284c7' : '#38bdf8'}) !important;
                box-shadow: 0 0 0 3px ${isLight ? 'rgba(2, 132, 199, 0.18)' : 'rgba(56, 189, 248, 0.24)'}, 0 2px 6px ${isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.3)'} !important;
              }
              .search .loupe {
                left: 12px !important;
                right: auto !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                color: ${isLight ? '#64748b' : '#94a3b8'} !important;
                width: 16px !important;
                height: 16px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                pointer-events: none !important;
                transition: color 0.2s ease !important;
              }
              .search:focus-within .loupe {
                color: var(--accent-primary, ${isLight ? '#0284c7' : '#38bdf8'}) !important;
              }
              .search .delete {
                right: 11px !important;
                left: auto !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                color: ${isLight ? '#94a3b8' : '#64748b'} !important;
                width: 18px !important;
                height: 18px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                border-radius: 50% !important;
                transition: all 0.15s ease !important;
              }
              .search .delete:hover {
                color: ${isLight ? '#0f172a' : '#f8fafc'} !important;
                background-color: ${isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.12)'} !important;
              }
              /* Skin tone selector button styling */
              .skin-tone-button {
                width: 34px !important;
                height: 34px !important;
                border-radius: 50% !important;
                border: 1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)'} !important;
                background-color: ${isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.06)'} !important;
                box-shadow: ${isLight ? '0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.8)' : 'inset 0 1px 2px rgba(0, 0, 0, 0.25)'} !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                transition: all 0.15s ease !important;
                padding: 0 !important;
              }
              .skin-tone-button:hover {
                background-color: ${isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.12)'} !important;
                border-color: var(--accent-primary, ${isLight ? '#0284c7' : '#38bdf8'}) !important;
                transform: scale(1.05) !important;
              }
              .skin-tone-button:active {
                transform: scale(0.95) !important;
              }
              .skin-tone {
                width: 18px !important;
                height: 18px !important;
                border-radius: 50% !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25) !important;
              }
              #skins {
                background: ${isLight ? 'rgba(255, 253, 248, 0.96)' : 'rgba(22, 35, 62, 0.96)'} !important;
                border: 1px solid ${isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)'} !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25) !important;
                backdrop-filter: blur(16px) !important;
                -webkit-backdrop-filter: blur(16px) !important;
                padding: 6px !important;
                gap: 6px !important;
              }
              .category-title {
                color: ${isLight ? '#1e293b' : '#f8fafc'} !important;
              }
            `;
          }
        };

        injectStyles();
        const t1 = setTimeout(injectStyles, 0);
        const t2 = setTimeout(injectStyles, 100);
        const t3 = setTimeout(injectStyles, 300);

        const observer = new MutationObserver(() => {
          injectStyles();
        });

        if (wrapperRef.current) {
          observer.observe(wrapperRef.current, {
            childList: true,
            subtree: true,
          });
        }

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          observer.disconnect();
        };
      }, [currentTheme]);

      const effectiveTheme =
        !props.theme || props.theme === 'auto' ? currentTheme : props.theme;

      return (
        <div
          ref={wrapperRef}
          className="w-full flex-1 flex flex-col items-stretch"
        >
          <Picker.default
            data={data.default}
            {...props}
            dynamicWidth={
              props.dynamicWidth !== undefined ? props.dynamicWidth : true
            }
            theme={effectiveTheme}
          />
        </div>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-center text-[13px] text-theme-muted w-88 h-108.75 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-(--accent-primary)" />
      </div>
    ),
  },
);
