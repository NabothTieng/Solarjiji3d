import {
  Box,
  ChakraProvider,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { Leva } from "leva";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

import TopPlanViewer from "./three/canvas/TopPlanViewer";
import Viewer3D from "./three/canvas/Viewer3D";
import { GoogleMapView } from "./map/GoogleMapView";
import Sidebar from "./three/components/Sidebar";
import { RoofPropertiesPanel } from "./three/components/RoofPropertiesPanel";
import { SolarPanelPropertiesPanel } from "./three/components/SolarPanelPropertiesPanel";
import { LightControlPanel } from "./three/components/LightControlPanel";
import { RoofPanelEditor2D } from "./three/components/RoofPanelEditor2D";

import { TreePropertiesPanel } from "./ui/components/panels/TreePropertiesPanel";
import { TreeKeyboardControls } from "./ui/components/panels/TreeKeyboardControls";
import "./App.css";
import ElevationsViewer from "./three/canvas/ElevationsViewer";
import { activePanelAtom, fullscreenViewAtom, roofPanelTabAtom } from "./store/atoms";
import { selectedRectangleIdAtom, selectedTreeIdAtom, selectedChimneyIdAtom } from "./three/store/rectangleStore";
import { selectedRoofSideAtom } from "./three/store/solarPanelStore";
import { ShortcutsLegend } from "./three/components/ShortcutsLegend";
import { useSolarPlannerConfig } from "./context/SolarPlannerConfigContext";
import { PanelListButton } from "./three/components/PanelListButton";
import { CapacityWarningBanner } from "./three/components/CapacityWarningBanner";
import { useUndoRedoHistory } from "./three/hooks/useUndoRedoHistory";
import { ApiProvider } from "./providers/ApiProvider";
import { ObjectSelectionPopup } from "./three/components/ObjectSelectionPopup";

function PanelSelectionSync() {
  const selectedRectId = useAtomValue(selectedRectangleIdAtom);
  const selectedTreeId = useAtomValue(selectedTreeIdAtom);
  const selectedChimneyId = useAtomValue(selectedChimneyIdAtom);
  const selectedSide = useAtomValue(selectedRoofSideAtom);
  const setActivePanel = useSetAtom(activePanelAtom);
  const setRoofPanelTab = useSetAtom(roofPanelTabAtom);

  useEffect(() => {
    if (selectedChimneyId) {
      setActivePanel("roof");
      setRoofPanelTab("chimney");
      return;
    }

    if (selectedTreeId) {
      setActivePanel("tree");
      return;
    }

    if (selectedSide) {
      setActivePanel("roof");
      setRoofPanelTab("solar");
      return;
    }

    if (selectedRectId) {
      setActivePanel("roof");
      setRoofPanelTab("roof");
    }
  }, [
    selectedChimneyId,
    selectedTreeId,
    selectedSide,
    selectedRectId,
    setActivePanel,
    setRoofPanelTab,
  ]);

  return null;
}

function MainView2D() {
  return (
    <Box position="relative" w="100%" h="100%">
      <Box position="absolute" inset={0} zIndex={1}>
        <GoogleMapView />
      </Box>
      <Box position="absolute" inset={0} zIndex={10}>
        <TopPlanViewer />
      </Box>
    </Box>
  );
}

function App() {
  const fullscreenView = useAtomValue(fullscreenViewAtom);
  const { system } = useSolarPlannerConfig();
  useUndoRedoHistory();

  return (
    <ApiProvider>
      <ChakraProvider value={system}>
        <HStack h="100%" w="100%" gap={0} position="relative" overflow="hidden">
          {/* Floating left sidebar toolbar — overlays the main canvas instead of taking layout width */}
          <Box
            position="absolute"
            top={0}
            left={0}
            bottom={0}
            w="72px"
            zIndex={100}
            pointerEvents="auto"
          >
            <Sidebar />
          </Box>

          {/* Main canvas — 70% of the available width */}
          <Box
            flex="0 0 70%"
            w="70%"
            maxW="70%"
            minW={0}
            position="relative"
            h="100%"
          >
            {fullscreenView === "3d" ? (
              <Viewer3D />
            ) : fullscreenView === "elevation" ? (
              <ElevationsViewer />
            ) : (
              <MainView2D />
            )}
            <ObjectSelectionPopup />
              </Box>

          {/* Left-side property panels (absolutely positioned) */}
          <PanelSelectionSync />
          <RoofPropertiesPanel />
          <SolarPanelPropertiesPanel />
          <LightControlPanel />
          <TreePropertiesPanel />

          {/* Right panel — 30% of the width, split vertically into two equal cards */}
          <VStack
            flex="0 0 30%"
            w="30%"
            maxW="30%"
            h="100%"
            gap={0}
            bg="#f0f0f0"
            minW={0}
            overflow="hidden"
          >
            <Box flex={1} w="100%" minH={0} overflow="hidden">
              {fullscreenView === "3d" ? <MainView2D /> : <Viewer3D />}
            </Box>
            <Box flex={1} w="100%" minH={0} overflow="hidden">
              {fullscreenView === "elevation" ? <MainView2D /> : <ElevationsViewer />}
            </Box>
          </VStack>

          <Leva
            hidden
            flat
            titleBar={{ position: { x: -1024, y: 0 } }}
            theme={{
              sizes: { rootWidth: "280px" },
            }}
          />
        </HStack>
        <RoofPanelEditor2D />
        <PanelListButton />
        <CapacityWarningBanner />
        <TreeKeyboardControls />
      </ChakraProvider>
    </ApiProvider>
  );
}

export default App;
