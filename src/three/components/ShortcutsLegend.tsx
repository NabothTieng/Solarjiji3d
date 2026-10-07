import { Box, Span } from "@chakra-ui/react";

function isApplePlatform() {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function getShortcuts() {
  const modifier = isApplePlatform() ? "⌘" : "Ctrl";
  return [
    { key: "Del", label: "Delete" },
    { key: "D", label: "Draw" },
    { key: "S", label: "Select" },
    { key: `${modifier}Z`, label: "Undo" },
    { key: modifier === "⌘" ? "⌘⇧Z" : "Ctrl+Shift+Z", label: "Redo" },
  ];
}

export function ShortcutsLegend() {
  const shortcuts = getShortcuts();

  return (
    <Box
      position="absolute"
      bottom="2%"
      left="7%"
      zIndex={450}
      bg="rgba(30, 30, 46, 0.78)"
      border="1px solid rgba(69,71,90,0.8)"
      borderRadius="0.4rem"
      padding="0.4% 0.6%"
      display="flex"
      alignItems="center"
      gap="0.8%"
      fontSize="0.55rem"
      color="#a6adc8"
      backdropFilter="blur(6px)"
      boxShadow="0 2px 8px rgba(0,0,0,0.18)"
      pointerEvents="none"
      opacity={0.9}
    >
      {shortcuts.map((s) => (
        <Box key={s.key} display="flex" alignItems="center" gap="0.25rem">
          <Span
            bg="#313244"
            border="1px solid #585b70"
            borderRadius="0.2rem"
            padding="0 0.25rem"
            fontSize="0.5rem"
            fontFamily="monospace"
            color="#cdd6f4"
            lineHeight="1rem"
          >
            {s.key}
          </Span>
          <Span>{s.label}</Span>
        </Box>
      ))}
    </Box>
  );
}
