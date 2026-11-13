"use client";

import { useId, useState } from "react";

export function FieldHelp({ label, description }: { label: string; description: string }) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  return <span className="field-help"
    onPointerEnter={() => { setHovered(true); setDismissed(false); }}
    onPointerLeave={() => setHovered(false)}>
    <button type="button" className="field-help-trigger" aria-label={label} aria-describedby={id}
      onFocus={() => { setFocused(true); setDismissed(false); }}
      onBlur={() => setFocused(false)}
      onClick={() => { setFocused(true); setDismissed(false); }}
      onKeyDown={event => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setDismissed(true);
        }
      }}>?</button>
    <span id={id} role="tooltip" className="field-help-tooltip" hidden={!open}>{description}</span>
  </span>;
}
