import { Box, Button, Span } from "@chakra-ui/react";
import { Trash2 } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  rectanglesAtom,
  selectedRectangleAtom,
  selectedRectangleIdAtom,
  selectedChimneyAtom,
  selectedChimneyIdAtom,
  chimneysAtom,
  selectedTreeAtom,
  selectedTreeIdAtom,
  trees3DAtom,
} from "../store/rectangleStore";
import { solarPanelConfigsAtom } from "../store/solarPanelStore";
import { activePanelAtom } from "../../store/atoms";
import { metersPerUnitAtom } from "../../store/atoms";

export function ObjectSelectionPopup() {
  const [isHovered, setIsHovered] = useState(false);
  const [isFaded, setIsFaded] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  }, []);

  const handleMouseEnter = () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setIsHovered(true);
    setIsFaded(false);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setIsFaded(true), 2200);
  };
  const selectedRect = useAtomValue(selectedRectangleAtom);
  const selectedTree = useAtomValue(selectedTreeAtom);
  const selectedChimney = useAtomValue(selectedChimneyAtom);
  const selectedRectId = useAtomValue(selectedRectangleIdAtom);
  const rectangles = useAtomValue(rectanglesAtom);
  const setRectangles = useSetAtom(rectanglesAtom);
  const setSelectedRectId = useSetAtom(selectedRectangleIdAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setChimneys = useSetAtom(chimneysAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const setSolarPanelConfigs = useSetAtom(solarPanelConfigsAtom);
  const setActivePanel = useSetAtom(activePanelAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const parentRoof = selectedChimney
    ? rectangles.find((r) => r.id === selectedChimney.rectangleId)
    : null;

  const selected = selectedChimney || selectedTree || selectedRect;
  if (!selected) return null;

  const closeSelection = () => {
    if (selectedChimney) setSelectedChimneyId(null);
    if (selectedTree) setSelectedTreeId(null);
    if (selectedRect) setSelectedRectId(null);
    setActivePanel(null);
  };

  const deleteSelected = () => {
    if (selectedChimney) {
      setChimneys((prev) => prev.filter((c) => c.id !== selectedChimney.id));
      setSelectedChimneyId(null);
      return;
    }

    if (selectedTree) {
      setTrees((prev) => prev.filter((t) => t.id !== selectedTree.id));
      setSelectedTreeId(null);
      return;
    }

    if (selectedRect && selectedRectId) {
      setRectangles((prev) => prev.filter((r) => r.id !== selectedRectId));
      setSolarPanelConfigs((prev) =>
        prev.filter((config) => config.roofSideKey.split(":")[0] !== selectedRectId),
      );
      setChimneys((prev) => prev.filter((c) => c.rectangleId !== selectedRectId));
      setSelectedRectId(null);
      setActivePanel(null);
    }
  };

  let title = "Selected object";
  let type = "Object";
  let details: Array<[string, string]> = [];

  if (selectedChimney) {
    title = "Chimney";
    type = selectedChimney.shape === "circular" ? "Circular" : "Rectangular";
    details = [
      ["Width", `${(selectedChimney.width * metersPerUnit).toFixed(2)} m`],
      ["Depth", `${(selectedChimney.depth * metersPerUnit).toFixed(2)} m`],
      ["Height", `${(selectedChimney.height * metersPerUnit).toFixed(2)} m`],
    ];
  } else if (selectedTree) {
    title = "Tree";
    type = "Tree / obstacle";
    details = [
      ["Canopy radius", `${(selectedTree.radius * metersPerUnit).toFixed(2)} m`],
      ["Height", `${(selectedTree.height * metersPerUnit).toFixed(2)} m`],
    ];
  } else if (selectedRect) {
    title = "Roof";
    type = selectedRect.roofType.charAt(0).toUpperCase() + selectedRect.roofType.slice(1);
    const dx = selectedRect.end[0] - selectedRect.start[0];
    const dz = selectedRect.end[2] - selectedRect.start[2];
    details = [
      ["Length", `${(Math.hypot(dx, dz) * metersPerUnit).toFixed(2)} m`],
      ["Width", `${(selectedRect.depth * metersPerUnit).toFixed(2)} m`],
      ["Wall height", `${(selectedRect.wallHeight * metersPerUnit).toFixed(2)} m`],
    ];
  }

  return (
    <Box
      position="absolute"
      top="2%"
      right="2%"
      width="clamp(10rem, 17vw, 15rem)"
      maxWidth="calc(100% - 1rem)"
      minWidth="0"
      bg="rgba(30,30,46,0.96)"
      border="0.05rem solid #45475a"
      borderRadius="0.5rem"
      color="#cdd6f4"
      padding="clamp(0.55rem, 0.9vw, 0.8rem)"
      zIndex={500}
      boxShadow="0 0.5rem 1.5rem rgba(0,0,0,0.28)"
      backdropFilter="blur(10px)"
      opacity={isHovered || !isFaded ? 1 : 0.42}
      transition="opacity 220ms ease, background 220ms ease"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb="clamp(0.45rem, 0.8vh, 0.65rem)" gap="clamp(0.4rem, 0.8vw, 0.65rem)">
        <Box minW={0}>
          <Span display="block" fontSize="clamp(0.72rem, 0.8vw, 0.82rem)" fontWeight={700}>{title}</Span>
          <Span display="block" fontSize="clamp(0.55rem, 0.62vw, 0.65rem)" color="#a6adc8" mt="0.2rem">{type}</Span>
        </Box>
        <Button
          onClick={closeSelection}
          variant="ghost"
          minW="0"
          w="clamp(1.5rem, 2.2vw, 2rem)"
          aspectRatio="1"
          padding={0}
          color="#f90f02"
          fontSize="clamp(0.9rem, 1.1vw, 1.1rem)"
        >
          x
        </Button>
      </Box>

      <Box display="grid" gap="clamp(0.25rem, 0.5vh, 0.4rem)" mb="clamp(0.45rem, 0.8vh, 0.65rem)">
        {details.map(([label, value]) => (
          <Box key={label} display="flex" justifyContent="space-between" fontSize="clamp(0.58rem, 0.65vw, 0.68rem)">
            <Span color="#a6adc8">{label}</Span>
            <Span color="#cdd6f4" fontWeight={600}>{value}</Span>
          </Box>
        ))}
      </Box>

      {selectedChimney && parentRoof && (
        <Box
          mt="clamp(0.55rem, 1vh, 0.8rem)"
          mb="clamp(0.55rem, 1vh, 0.8rem)"
          padding="clamp(0.45rem, 0.8vh, 0.65rem)"
          bg="rgba(49,50,68,0.72)"
          border="0.0625rem solid rgba(250,179,135,0.28)"
          borderRadius="clamp(0.35rem, 0.5vw, 0.45rem)"
        >
          <Box
            color="#fab387"
            fontSize="clamp(0.62rem, 0.7vw, 0.72rem)"
            fontWeight={700}
            textTransform="uppercase"
            letterSpacing="0.06rem"
            mb="clamp(0.3rem, 0.55vh, 0.45rem)"
          >
            Parent Roof
          </Box>
          <Box display="grid" gap="clamp(0.2rem, 0.45vh, 0.35rem)" fontSize="clamp(0.58rem, 0.65vw, 0.68rem)">
            <Box display="flex" justifyContent="space-between" gap="0.5rem">
              <Span color="#a6adc8">Roof Type</Span>
              <Span textTransform="capitalize" fontWeight={600}>{parentRoof.roofType}</Span>
            </Box>
            <Box display="flex" justifyContent="space-between" gap="0.5rem">
              <Span color="#a6adc8">Roof Length</Span>
              <Span fontWeight={600}>{(Math.hypot(parentRoof.end[0] - parentRoof.start[0], parentRoof.end[2] - parentRoof.start[2]) * metersPerUnit).toFixed(2)} m</Span>
            </Box>
          </Box>
        </Box>
      )}

      <Button
        onClick={deleteSelected}
        width="full"
        h="auto"
        minH="0"
        py="clamp(0.35rem, 0.7vh, 0.5rem)"
        bg="#45475a"
        border="1px solid #f38ba8"
        color="#f38ba8"
        borderRadius="0.4rem"
        fontSize="clamp(0.58rem, 0.65vw, 0.68rem)"
        fontWeight={600}
        display="flex"
        gap="4%"
        alignItems="center"
        justifyContent="center"
      >
        <Trash2 size="0.75rem" />
        Delete {title}
      </Button>
    </Box>
  );
}
