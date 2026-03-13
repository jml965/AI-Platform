import { useState, useCallback, useRef, useEffect } from "react";

export interface CSSChange {
  selector: string;
  property: string;
  value: string;
  originalValue: string;
}

export interface ElementInfo {
  tagName: string;
  id: string;
  classList: string[];
  selector: string;
  computedStyles: Record<string, string>;
  rect: { top: number; left: number; width: number; height: number };
}

interface HistoryAction {
  selector: string;
  property: string;
  newValue: string;
  oldValue: string;
}

const EDITABLE_PROPERTIES = [
  "color",
  "backgroundColor",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "borderRadius",
  "width",
  "height",
  "opacity",
  "boxShadow",
];

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function useCSSEditor(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [allChanges, setAllChanges] = useState<CSSChange[]>([]);
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const originalsRef = useRef<Map<string, string>>(new Map());

  const getOriginalKey = (selector: string, property: string) => `${selector}::${property}`;

  const getComputedStyles = useCallback((element: Element): Record<string, string> => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return {};
    const computed = iframe.contentWindow.getComputedStyle(element);
    const styles: Record<string, string> = {};
    EDITABLE_PROPERTIES.forEach((prop) => {
      styles[prop] = computed.getPropertyValue(camelToKebab(prop));
    });
    return styles;
  }, [iframeRef]);

  const buildSelector = useCallback((element: Element): string => {
    if (element.id) return `#${element.id}`;
    const classes = Array.from(element.classList).filter(c => c !== "__css_editor_hover" && c !== "__css_editor_selected");
    if (classes.length > 0) {
      const sel = `${element.tagName.toLowerCase()}.${classes.join(".")}`;
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        try {
          const matches = iframe.contentDocument.querySelectorAll(sel);
          if (matches.length === 1) return sel;
        } catch {}
      }
    }

    const parent = element.parentElement;
    if (!parent) return element.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
    if (siblings.length === 1) {
      return `${buildSelector(parent)} > ${element.tagName.toLowerCase()}`;
    }
    const index = siblings.indexOf(element) + 1;
    return `${buildSelector(parent)} > ${element.tagName.toLowerCase()}:nth-of-type(${index})`;
  }, [iframeRef]);

  const tryInjectEditorScript = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return false;

    const doc = iframe.contentDocument;

    const existing = doc.getElementById("__css_editor_style");
    if (existing) existing.remove();

    const style = doc.createElement("style");
    style.id = "__css_editor_style";
    style.textContent = `
      .__css_editor_hover {
        outline: 2px dashed #58a6ff !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
      }
      .__css_editor_selected {
        outline: 2px solid #58a6ff !important;
        outline-offset: 2px !important;
      }
      * { cursor: crosshair !important; }
    `;
    doc.head.appendChild(style);

    const existingScript = doc.getElementById("__css_editor_script");
    if (existingScript) existingScript.remove();

    const script = doc.createElement("script");
    script.id = "__css_editor_script";
    script.textContent = `
      (function() {
        if (window.__css_editor_cleanup) window.__css_editor_cleanup();
        let hoveredEl = null;
        function onMouseOver(e) {
          e.stopPropagation();
          if (hoveredEl) hoveredEl.classList.remove('__css_editor_hover');
          hoveredEl = e.target;
          if (!hoveredEl.classList.contains('__css_editor_selected')) {
            hoveredEl.classList.add('__css_editor_hover');
          }
        }
        function onMouseOut(e) {
          e.stopPropagation();
          if (hoveredEl) {
            hoveredEl.classList.remove('__css_editor_hover');
            hoveredEl = null;
          }
        }
        function onClick(e) {
          e.preventDefault();
          e.stopPropagation();
          document.querySelectorAll('.__css_editor_selected').forEach(el => el.classList.remove('__css_editor_selected'));
          if (hoveredEl) hoveredEl.classList.remove('__css_editor_hover');
          const target = e.target;
          target.classList.add('__css_editor_selected');
          const rect = target.getBoundingClientRect();
          window.parent.postMessage({
            type: '__css_editor_select',
            tagName: target.tagName,
            id: target.id || '',
            classList: Array.from(target.classList).filter(c => c !== '__css_editor_hover' && c !== '__css_editor_selected'),
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          }, '*');
        }
        document.addEventListener('mouseover', onMouseOver, true);
        document.addEventListener('mouseout', onMouseOut, true);
        document.addEventListener('click', onClick, true);
        window.__css_editor_cleanup = function() {
          document.removeEventListener('mouseover', onMouseOver, true);
          document.removeEventListener('mouseout', onMouseOut, true);
          document.removeEventListener('click', onClick, true);
          document.querySelectorAll('.__css_editor_hover, .__css_editor_selected').forEach(el => {
            el.classList.remove('__css_editor_hover', '__css_editor_selected');
          });
          var style = document.getElementById('__css_editor_style');
          if (style) style.remove();
        };
      })();
    `;
    doc.body.appendChild(script);
    return true;
  }, [iframeRef]);

  const removeEditorScript = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      (iframe.contentWindow as any).__css_editor_cleanup?.();
    } catch {}
  }, [iframeRef]);

  const activate = useCallback(() => {
    setIsActive(true);
    const tryInject = (attempts: number) => {
      if (attempts <= 0) return;
      if (!tryInjectEditorScript()) {
        setTimeout(() => tryInject(attempts - 1), 200);
      }
    };
    setTimeout(() => tryInject(5), 100);
  }, [tryInjectEditorScript]);

  const deactivate = useCallback(() => {
    setIsActive(false);
    setSelectedElement(null);
    removeEditorScript();
  }, [removeEditorScript]);

  const applyStyleToIframe = useCallback((selector: string, property: string, value: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    try {
      const el = iframe.contentDocument.querySelector(selector);
      if (el) {
        (el as HTMLElement).style.setProperty(camelToKebab(property), value);
      }
    } catch {}
  }, [iframeRef]);

  const removeStyleFromIframe = useCallback((selector: string, property: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    try {
      const el = iframe.contentDocument.querySelector(selector);
      if (el) {
        (el as HTMLElement).style.removeProperty(camelToKebab(property));
      }
    } catch {}
  }, [iframeRef]);

  const changeProperty = useCallback((property: string, value: string) => {
    if (!selectedElement) return;

    const key = getOriginalKey(selectedElement.selector, property);
    if (!originalsRef.current.has(key)) {
      originalsRef.current.set(key, selectedElement.computedStyles[property] || "");
    }

    const currentValue = selectedElement.computedStyles[property] || "";
    const action: HistoryAction = {
      selector: selectedElement.selector,
      property,
      newValue: value,
      oldValue: currentValue,
    };

    setUndoStack(prev => [...prev, action]);
    setRedoStack([]);

    const originalValue = originalsRef.current.get(key) || "";

    setAllChanges(prev => {
      const existingIdx = prev.findIndex(c => c.selector === selectedElement.selector && c.property === property);
      if (value === originalValue) {
        if (existingIdx >= 0) {
          return prev.filter((_, i) => i !== existingIdx);
        }
        return prev;
      }
      const change: CSSChange = {
        selector: selectedElement.selector,
        property,
        value,
        originalValue,
      };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = change;
        return updated;
      }
      return [...prev, change];
    });

    setSelectedElement(prev => prev ? {
      ...prev,
      computedStyles: { ...prev.computedStyles, [property]: value },
    } : null);

    applyStyleToIframe(selectedElement.selector, property, value);
  }, [selectedElement, applyStyleToIframe]);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      applyStyleToIframe(action.selector, action.property, action.oldValue);

      const key = getOriginalKey(action.selector, action.property);
      const originalValue = originalsRef.current.get(key) || "";

      setAllChanges(ac => {
        if (action.oldValue === originalValue) {
          return ac.filter(c => !(c.selector === action.selector && c.property === action.property));
        }
        const idx = ac.findIndex(c => c.selector === action.selector && c.property === action.property);
        if (idx >= 0) {
          const updated = [...ac];
          updated[idx] = { ...updated[idx], value: action.oldValue };
          return updated;
        }
        return [...ac, { selector: action.selector, property: action.property, value: action.oldValue, originalValue }];
      });

      setSelectedElement(sel => {
        if (sel?.selector === action.selector) {
          return { ...sel, computedStyles: { ...sel.computedStyles, [action.property]: action.oldValue } };
        }
        return sel;
      });

      setRedoStack(r => [...r, action]);

      return rest;
    });
  }, [applyStyleToIframe]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      applyStyleToIframe(action.selector, action.property, action.newValue);

      const key = getOriginalKey(action.selector, action.property);
      const originalValue = originalsRef.current.get(key) || "";

      setAllChanges(ac => {
        if (action.newValue === originalValue) {
          return ac.filter(c => !(c.selector === action.selector && c.property === action.property));
        }
        const idx = ac.findIndex(c => c.selector === action.selector && c.property === action.property);
        if (idx >= 0) {
          const updated = [...ac];
          updated[idx] = { ...updated[idx], value: action.newValue };
          return updated;
        }
        return [...ac, { selector: action.selector, property: action.property, value: action.newValue, originalValue }];
      });

      setSelectedElement(sel => {
        if (sel?.selector === action.selector) {
          return { ...sel, computedStyles: { ...sel.computedStyles, [action.property]: action.newValue } };
        }
        return sel;
      });

      setUndoStack(u => [...u, action]);

      return rest;
    });
  }, [applyStyleToIframe]);

  const generateCSS = useCallback((): string => {
    if (allChanges.length === 0) return "";
    const grouped: Record<string, CSSChange[]> = {};
    allChanges.forEach(change => {
      if (!grouped[change.selector]) grouped[change.selector] = [];
      grouped[change.selector].push(change);
    });

    const rules = Object.entries(grouped).map(([selector, changes]) => {
      const props = changes
        .map(c => `  ${camelToKebab(c.property)}: ${c.value};`)
        .join("\n");
      return `${selector} {\n${props}\n}`;
    });

    return rules.join("\n\n");
  }, [allChanges]);

  const clearAll = useCallback(() => {
    allChanges.forEach(change => {
      removeStyleFromIframe(change.selector, change.property);
    });
    setAllChanges([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedElement(null);
    originalsRef.current.clear();
  }, [allChanges, removeStyleFromIframe]);

  useEffect(() => {
    if (!isActive) return;

    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "__css_editor_select") return;
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) return;

      const { tagName, id, classList, rect } = e.data;

      let selector: string;
      if (id) {
        selector = `#${id}`;
      } else if (classList.length > 0) {
        selector = `${tagName.toLowerCase()}.${classList.join(".")}`;
        try {
          const matches = iframe.contentDocument.querySelectorAll(selector);
          if (matches.length !== 1) {
            const el = iframe.contentDocument.querySelector(".__css_editor_selected");
            if (el) selector = buildSelector(el);
          }
        } catch {
          const el = iframe.contentDocument.querySelector(".__css_editor_selected");
          if (el) selector = buildSelector(el);
        }
      } else {
        const el = iframe.contentDocument.querySelector(".__css_editor_selected");
        selector = el ? buildSelector(el) : tagName.toLowerCase();
      }

      const selectedEl = iframe.contentDocument.querySelector(".__css_editor_selected");
      const computedStyles = selectedEl ? getComputedStyles(selectedEl) : {};

      setSelectedElement({
        tagName,
        id,
        classList,
        selector,
        computedStyles,
        rect,
      });
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [isActive, iframeRef, buildSelector, getComputedStyles]);

  return {
    isActive,
    activate,
    deactivate,
    selectedElement,
    allChanges,
    changeProperty,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    generateCSS,
    clearAll,
    changeCount: allChanges.length,
  };
}
