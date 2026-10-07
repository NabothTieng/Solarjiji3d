import { Box, Button, Span } from "@chakra-ui/react";
import { Trash2 } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
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
  const selectedRect = useAtomValue(selectedRectangleAtom);
  const selectedTree = useAtomValue(selectedTreeAtom);
  const selectedChimney = useAtomValue(selectedChimneyAtom);
  const selectedRectId = useAtomValue(selectedRectangleIdAtom);
  const setRectangles = useSetAtom(rectanglesAtom);
  const setSelectedRectId = useSetAtom(selectedRectangleIdAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setChimneys = useSetAtom(chimneysAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const setSolarPanelConfigs = useSetAtom(solarPanelConfigsAtom);
  const setActivePanel = useSetAtom(activePanelAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);

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
      width="20%"
      maxWidth="25%"
      minWidth="20%"
      bg="rgba(30,30,46,0.96)"
      border="0.05rem solid #45475a"
      borderRadius="0.5rem"
      color="#cdd6f4"
      padding="2%"
      zIndex={500}
      boxShadow="0 0.5rem 1.5rem rgba(0,0,0,0.28)"
      backdropFilter="blur(10px)"
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb="5%" gap="4%">
        <Box>
          <Span display="block" fontSize="0.8rem" fontWeight={700}>{title}</Span>
          <Span display="block" fontSize="0.6rem" color="#a6adc8" mt="3%">{type}</Span>
        </Box>
        <Button
          onClick={closeSelection}
          variant="ghost"
          minW="0"
          w="18%"
          aspectRatio="1"
          padding={0}
          color="#f90f02"
          fontSize="1.1rem"
        >
          x
        </Button>
      </Box>

      <Box display="grid" gap="4%" mb="7%">
        {details.map(([label, value]) => (
          <Box key={label} display="flex" justifyContent="space-between" fontSize="0.65rem">
            <Span color="#a6adc8">{label}</Span>
            <Span color="#cdd6f4" fontWeight={600}>{value}</Span>
          </Box>
        ))}
      </Box>

      <Button
        onClick={deleteSelected}
        width="full"
        h="auto"
        minH="0"
        py="6%"
        bg="#45475a"
        border="1px solid #f38ba8"
        color="#f38ba8"
        borderRadius="0.4rem"
        fontSize="0.65rem"
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
