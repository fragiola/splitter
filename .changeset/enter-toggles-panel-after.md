---
"@fragiola/splitter": minor
---

Enter on a focused separator now toggles the panel after it when the panel before it is not collapsible: a results pane below an editor or logs below charts collapse and expand from the keyboard with no code in the app. When the panel before is collapsible, Enter still toggles it, as before (also when both are). If your app handled Enter on such a separator itself, remove that listener, or the panel toggles twice; a listener that runs first and calls `preventDefault()` keeps control.
